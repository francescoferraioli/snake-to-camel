import {
  Project,
  SyntaxKind,
  Node,
  NamedNodeSpecificBase,
  Identifier,
} from 'ts-morph';
import { camelCase } from 'lodash';
import * as path from 'path';
import * as fs from 'fs';

function isSnakeCase(name: string): boolean {
  if (!name.includes('_')) return false;
  // Check for snake_case pattern: all lowercase with underscores
  return /^[a-z]+(_[a-z0-9]+)*$/.test(name);
}

function toCamelCase(name: string): string {
  return camelCase(name);
}

const targetPath: string = process.argv[2];
const tsconfigPath: string =
  process.argv[3] || path.join(process.cwd(), 'tsconfig.json');
if (!targetPath) {
  console.error('Usage: node snake-to-camel.js <folder> [tsconfig.json path]');
  process.exit(1);
}

const project: Project = new Project({
  tsConfigFilePath: tsconfigPath,
  skipAddingFilesFromTsConfig: true,
});

function getAllFiles(
  dir: string,
  exts: string[],
  fileList: string[] = []
): string[] {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, exts, fileList);
    } else if (exts.some((ext) => file.endsWith(ext))) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const files: string[] =
  targetPath.endsWith('.ts') || targetPath.endsWith('.tsx')
    ? [targetPath]
    : getAllFiles(targetPath, ['.ts', '.tsx']);

// Add all files to the project first
files.forEach((filePath) => {
  project.addSourceFileAtPath(filePath);
});

function getImportedNames(scope: Node): Node[] {
  if (!Node.isSourceFile(scope)) return [];
  return scope.getImportDeclarations().flatMap((imp) => {
    const nodes: Node[] = [];
    // Default import: import foo from '...';
    const defaultImport = imp.getDefaultImport();
    if (defaultImport) nodes.push(defaultImport);
    // Namespace import: import * as foo from '...';
    const namespaceImport = imp.getNamespaceImport();
    if (namespaceImport) nodes.push(namespaceImport);
    // Named imports: import { foo, bar as baz } from '...';
    nodes.push(...imp.getNamedImports().map((spec) => spec.getNameNode()));
    return nodes;
  });
}

const cacheDirectDeclaredNameNodes = new Map<Node, Node[]>();

function getDirectDeclaredNameNodes(scope: Node): Node[] {
  if (cacheDirectDeclaredNameNodes.has(scope)) {
    return cacheDirectDeclaredNameNodes.get(scope)!;
  }
  const nodes = _getDirectDeclaredNameNodes(scope);
  cacheDirectDeclaredNameNodes.set(scope, nodes);
  return nodes;
}

function isNamedNodeStatement(stmt: any): stmt is NamedNodeSpecificBase<Node> {
  return (stmt as NamedNodeSpecificBase<Node>).getNameNode !== undefined;
}

// Helper to get all direct declared name nodes in a scope
function _getDirectDeclaredNameNodes(scope: Node): Node[] {
  if (Node.isBlock(scope) || Node.isSourceFile(scope)) {
    // Collect all direct variable, function, class, interface, type, enum name nodes in this block
    const variableDeclarations = scope.getVariableDeclarations();
    const importedNames = getImportedNames(scope);
    const statements = scope.getStatements();
    return [
      ...variableDeclarations.map((decl) => decl.getNameNode()),
      ...importedNames,
      ...statements.flatMap((stmt) => {
        // Collect names of functions, classes, interfaces, types, enums, etc. (e.g., function foo() {}, class Bar {})
        if (isNamedNodeStatement(stmt)) return [stmt.getNameNode()];
        return [];
      }),
    ];
  } else if (Node.isClassDeclaration(scope)) {
    // Collect all static property and static method name nodes in this class
    return [
      ...scope.getStaticProperties().map((prop) => prop.getNameNode()),
      ...scope.getStaticMethods().map((method) => method.getNameNode()),
    ];
  } else if (
    Node.isFunctionDeclaration(scope) ||
    Node.isFunctionExpression(scope) ||
    Node.isArrowFunction(scope)
  ) {
    // Parameters of the function
    return scope.getParameters().map((param) => param.getNameNode());
  }
  return [];
}

// Check if a name would be shadowed in any ancestor scope (only direct declarations in each scope)
function wouldShadowInAncestors(node: Node, newName: string): boolean {
  let current = node.getParent();
  while (current) {
    const nameNodes = getDirectDeclaredNameNodes(current);
    if (newName === 'bugReport') {
      console.log(
        current.getKindName(),
        nameNodes.map((n) => n.getText())
      );
    }
    if (nameNodes.some((n) => n && n.getText() === newName && n !== node))
      return true;
    current = current.getParent();
  }
  return false;
}

// Check if a name would be shadowed in any descendant scope (only direct declarations in each scope)
function wouldShadowInDescendants(node: Node, newName: string): boolean {
  let shadowed = false;
  // Helper to recursively check descendant scopes
  function checkDescendantScopes(scope: Node) {
    // For each direct child node that is a scope
    scope.forEachChild((child) => {
      // Check direct declared names in this scope
      const nameNodes = getDirectDeclaredNameNodes(child);
      if (nameNodes.some((n) => n && n.getText() === newName)) {
        shadowed = true;
      }
      // Recurse into this scope
      checkDescendantScopes(child);
    });
  }
  checkDescendantScopes(node.getParentOrThrow());
  return shadowed;
}

function isNormalVariableDeclaration(node: Node): boolean {
  return Node.isVariableDeclaration(node);
}

function isDestructuringVariableDeclaration(node: Node): boolean {
  if (!Node.isBindingElement(node)) return false;
  const parent = node.getParentOrThrow();
  if (!Node.isObjectBindingPattern(parent)) return false;
  const grandParent = parent.getParentOrThrow();
  if (!Node.isVariableDeclaration(grandParent)) return false;
  return true;
}

project.getSourceFiles().forEach((sourceFile) => {
  let changed = false;

  sourceFile.forEachDescendant((node) => {
    if (node.getKind() !== SyntaxKind.Identifier) {
      return;
    }

    const snake = node.getText();

    if (!isSnakeCase(snake)) {
      return;
    }

    const parent = node.getParentOrThrow();

    if (!isNamedNodeStatement(parent)) {
      return;
    }

    // Only rename if this is a variable declaration (including destructuring) or a function parameter
    const isDeclaration =
      (isNormalVariableDeclaration(parent) ||
        isDestructuringVariableDeclaration(parent) ||
        Node.isParameterDeclaration(parent)) &&
      // Check that this is actually the declaration, not a reference
      parent.getNameNode() === node;

    if (!isDeclaration) {
      return;
    }

    const camel = toCamelCase(snake);
    if (camel === snake) {
      // This should never happen, but just in case
      console.warn(`Skipping ${snake} because it is already camelCase`);
      return;
    }

    // Check all ancestor scopes for shadowing
    if (wouldShadowInAncestors(node, camel)) {
      console.warn(`Skipping ${snake} because it would shadow ${camel}`);
      return; // If shadowed, skip silently
    }

    // Check all descendant scopes for shadowing
    if (wouldShadowInDescendants(node, camel)) {
      console.warn(
        `Skipping ${snake} because it would be shadowed by a descendant scope with ${camel}`
      );
      return;
    }

    const identifier = node as Identifier;
    // Find all references before renaming
    const references = identifier.findReferences();

    identifier.rename(camel); // This will update all references
    changed = true;

    // After renaming, update all object literal shorthand property assignments to explicit property assignments
    references.forEach((ref) => {
      ref.getReferences().forEach((refNode) => {
        const refNodeActual = refNode.getNode();
        const parent = refNodeActual.getParent();
        if (
          parent &&
          Node.isShorthandPropertyAssignment(parent) &&
          parent.getNameNode() === refNodeActual
        ) {
          // Convert to explicit property assignment: { camelCase } -> { snake_case: camelCase }
          parent.replaceWithText(`${snake}: ${camel}`);
        }
      });
    });
  });

  if (changed) {
    sourceFile.saveSync();
    console.log(`Updated: ${sourceFile.getFilePath()}`);
  }
});
