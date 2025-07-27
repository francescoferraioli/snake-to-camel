import { SourceFile, SyntaxKind, Node, Identifier } from 'ts-morph';
import { RenamingContext } from './log';
import {
  isNamedNodeStatement,
  isDestructuringVariableDeclaration,
  isNormalVariableDeclaration,
  wouldShadowInAncestors,
  wouldShadowInDescendants,
  isTypeOrInterfacePropertyReference,
} from './ts-morph';
import { isSnakeCase, toCamelCase } from './util';

export function convertSourceFile({
  shouldExcludeFile,
  filesToSave,
}: {
  shouldExcludeFile: (sourceFile: SourceFile) => boolean;
  filesToSave: Set<string>;
}) {
  return (sourceFile: SourceFile) => {
    sourceFile.forEachDescendant((node) => {
      if (shouldExcludeFile(sourceFile)) {
        return;
      }

      if (node.getKind() !== SyntaxKind.Identifier) {
        return;
      }

      const snake = node.getText();

      if (!isSnakeCase(snake)) {
        return;
      }

      const context = new RenamingContext(sourceFile.getFilePath(), snake);

      const parent = node.getParentOrThrow();

      if (!isNamedNodeStatement(parent)) {
        return;
      }

      // Check that this is actually the declaration, not a reference
      if (parent.getNameNode() !== node) {
        return;
      }

      const destructuringResult = isDestructuringVariableDeclaration(parent);
      if (destructuringResult === 'shorthand destructuring') {
        context.skip('shorthand destructuring');
        return;
      }

      // Only rename if this is a variable declaration (including destructuring) or a function parameter
      const isDeclaration =
        isNormalVariableDeclaration(parent) ||
        destructuringResult === 'explicit destructuring' ||
        Node.isParameterDeclaration(parent);

      if (!isDeclaration) {
        return;
      }

      const camel = toCamelCase(snake);
      if (camel === snake) {
        // This should never happen, but just in case
        context.skip('already camelCase');
        return;
      }

      // Check all ancestor scopes for shadowing
      if (wouldShadowInAncestors(node, camel)) {
        context.skip(`would shadow`);
        return; // If shadowed, skip silently
      }

      // Check all descendant scopes for shadowing
      if (wouldShadowInDescendants(node, camel)) {
        context.skip('would be shadowed');
        return;
      }

      const identifier = node as Identifier;
      // Find all references before renaming
      const references = identifier
        .findReferences()
        .flatMap((ref) => ref.getReferences());

      // Check if any reference is a property in a type or interface
      const hasTypeOrInterfacePropertyRef = references.some((refNode) =>
        isTypeOrInterfacePropertyReference(refNode.getNode())
      );

      if (hasTypeOrInterfacePropertyRef) {
        context.skip('property in type or interface');
        return; // Skip renaming if any reference is a property in a type or interface
      }

      // Add current file if it's not excluded
      filesToSave.add(sourceFile.getFilePath());

      // Track all files that have references to this identifier
      references
        .map((ref) => ref.getSourceFile())
        .filter((sourceFile) => sourceFile !== undefined)
        .forEach((sourceFile) => {
          filesToSave.add(sourceFile.getFilePath());
        });

      identifier.rename(camel); // This will update all references

      // After renaming, update all object literal shorthand property assignments to explicit property assignments
      let shorthandHandled = false;
      references.forEach((ref) => {
        const refNode = ref.getNode();
        const parent = refNode.getParent();
        if (
          parent &&
          Node.isShorthandPropertyAssignment(parent) &&
          parent.getNameNode() === refNode
        ) {
          shorthandHandled = true;
          // Convert to explicit property assignment: { camelCase } -> { snake_case: camelCase }
          parent.replaceWithText(`${snake}: ${camel}`);
        }
      });

      context.success(shorthandHandled);
    });
  };
}
