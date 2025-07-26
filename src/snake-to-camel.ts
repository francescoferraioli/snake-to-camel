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

type SkipReason =
  | 'already camelCase'
  | 'would shadow'
  | 'would be shadowed'
  | 'property in type or interface'
  | 'shorthand destructuring';
type Status = 'skip' | 'success';

// CSV logging with prefix for easy filtering
const CSV_PREFIX = 'SNAKE_TO_CAMEL_CSV:';
let csvHeadersLogged = false;

const csvHeaders: (keyof RenamingContextData)[] = [
  'timestamp',
  'filename',
  'identifier',
  'status',
  'reason',
  'shorthandHandled',
];

function logCsvHeaders(): void {
  if (!csvHeadersLogged) {
    console.log(`${CSV_PREFIX}${csvHeaders.join(',')}`);
    csvHeadersLogged = true;
  }
}

type RenamingContextData = {
  timestamp: string;
  filename: string;
  identifier?: string;
  status?: Status;
  reason?: SkipReason;
  shorthandHandled?: boolean;
};

// Structured logging context builder
class RenamingContext {
  private context: RenamingContextData;

  constructor(filename: string) {
    this.context = {
      timestamp: new Date().toISOString(),
      filename,
    };
  }

  setIdentifier(identifier: string): RenamingContext {
    this.context.identifier = identifier;
    return this;
  }

  skip(reason: SkipReason): void {
    this.context.status = 'skip';
    this.context.reason = reason;
    this.log();
  }

  success(shorthandHandled: boolean = false): void {
    this.context.status = 'success';
    this.context.shorthandHandled = shorthandHandled;
    this.log();
  }

  private log(): void {
    logCsvHeaders();
    const csvLine = csvHeaders
      .map((header) => `"${this.context[header] ?? ''}"`)
      .join(',');

    console.log(`${CSV_PREFIX}${csvLine}`);
  }
}

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

function getDirectDeclaredVariableNames(scope: Node): string[] {
  return getDirectDeclaredNameNodes(scope).map((node) => node.getText());
}

function isNamedNodeStatement(stmt: any): stmt is NamedNodeSpecificBase<Node> {
  return (stmt as NamedNodeSpecificBase<Node>).getNameNode !== undefined;
}

// Helper to get all direct declared name nodes in a scope
function getDirectDeclaredNameNodes(scope: Node): Node[] {
  if (Node.isBlock(scope) || Node.isSourceFile(scope)) {
    // Collect all direct variable, function, class, interface, type, enum name nodes in this block
    const variableDeclarations = scope.getVariableDeclarations();
    const importedNames = getImportedNames(scope);
    const statements = scope.getStatements();

    return [
      ...variableDeclarations.flatMap((decl) =>
        getVariableDeclarationNameNodes(decl)
      ),
      ...importedNames,
      ...statements.flatMap((stmt) => {
        // Collect names of functions, classes, interfaces, types, enums, etc. (e.g., function foo() {}, class Bar {})
        if (isNamedNodeStatement(stmt)) return [stmt.getNameNode()];
        return [];
      }),
    ];
  } else if (Node.isClassDeclaration(scope)) {
    // Collect all static and instance property/method name nodes in this class
    return [
      ...scope.getStaticProperties().map((prop) => prop.getNameNode()),
      ...scope.getStaticMethods().map((method) => method.getNameNode()),
      // Getting the instance properties and methods shouldn't be needed because they need to be accessed using the this keyword
      // However, for constructor parameter property shorthand, these are needed in that case
      // We could check if the reason we are getting these is because of constructor parameter property shorthand, but that's unnecessary for now
      ...scope.getInstanceProperties().map((prop) => prop.getNameNode()),
      ...scope.getInstanceMethods().map((method) => method.getNameNode()),
    ];
  } else if (
    Node.isFunctionDeclaration(scope) ||
    Node.isFunctionExpression(scope) ||
    Node.isArrowFunction(scope)
  ) {
    // Parameters of the function
    return scope
      .getParameters()
      .flatMap((param) => getVariableDeclarationNameNodes(param));
  }
  return [];
}

// Helper function to extract name nodes from a variable declaration (handles both normal and destructuring)
function getVariableDeclarationNameNodes(
  decl: NamedNodeSpecificBase<Node>
): Node[] {
  const nameNode = decl.getNameNode();

  // If it's destructuring, extract all binding elements
  if (Node.isObjectBindingPattern(nameNode)) {
    return nameNode
      .getElements()
      .filter((element) => Node.isBindingElement(element))
      .flatMap((element) => getVariableDeclarationNameNodes(element));
  }

  // If it's a normal variable declaration, return the name node
  return [nameNode];
}

// Check if a name would be shadowed in any ancestor scope (only direct declarations in each scope)
function wouldShadowInAncestors(node: Node, newName: string): boolean {
  let current = node.getParent();
  while (current) {
    const nameNodes = getDirectDeclaredVariableNames(current);
    if (nameNodes.includes(newName)) return true;
    current = current.getParent();
  }
  return false;
}

function getParentScope(node: Node): Node {
  let current = node.getParent();
  while (current) {
    if (isScope(current)) return current;
    current = current.getParent();
  }
  throw new Error('No scope found');
}

function isScope(node: Node): boolean {
  return Node.isBlock(node) || Node.isSourceFile(node);
}

// Check if a name would be shadowed in any descendant scope (only direct declarations in each scope)
function wouldShadowInDescendants(node: Node, newName: string): boolean {
  let shadowed = false;
  // Helper to recursively check descendant scopes
  function checkDescendantScopes(scope: Node) {
    // Check direct declared names in this scope
    const nameNodes = getDirectDeclaredVariableNames(scope);
    if (nameNodes.includes(newName)) {
      shadowed = true;
    }
    // For each direct child node that is a scope
    scope.forEachChild((child) => {
      // Recurse into this scope
      checkDescendantScopes(child);
    });
  }
  checkDescendantScopes(getParentScope(node));
  return shadowed;
}

function isNormalVariableDeclaration(node: Node): boolean {
  return Node.isVariableDeclaration(node);
}

type IsDestructuringVariableDeclarationResult =
  | 'not destructuring'
  | 'shorthand destructuring'
  | 'explicit destructuring';

function isDestructuringVariableDeclaration(
  node: Node
): IsDestructuringVariableDeclarationResult {
  if (!Node.isBindingElement(node)) return 'not destructuring';
  const parent = node.getParentOrThrow();
  if (!Node.isObjectBindingPattern(parent)) return 'not destructuring';
  const grandParent = parent.getParentOrThrow();
  if (!Node.isVariableDeclaration(grandParent)) return 'not destructuring';

  // Check if this is shorthand destructuring (we don't have a property name)
  const propertyName = node.getPropertyNameNode();
  if (!propertyName) {
    return 'shorthand destructuring';
  }

  return 'explicit destructuring';
}

// Helper to check if a node is a property in a type or interface
function isTypeOrInterfacePropertyReference(node: Node): boolean {
  let current: Node | undefined = node;
  while (current) {
    if (
      Node.isInterfaceDeclaration(current) ||
      Node.isTypeAliasDeclaration(current) ||
      Node.isTypeLiteral(current)
    ) {
      if (node.getParentOrThrow().getKind() === SyntaxKind.PropertySignature) {
        return true;
      }
    }
    current = current.getParent();
  }
  return false;
}

project.getSourceFiles().forEach((sourceFile) => {
  let changed = false;
  sourceFile.forEachDescendant((node) => {
    const context = new RenamingContext(sourceFile.getFilePath());

    if (node.getKind() !== SyntaxKind.Identifier) {
      return;
    }

    const snake = node.getText();

    if (!isSnakeCase(snake)) {
      return;
    }

    context.setIdentifier(snake);

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
    const references = identifier.findReferences();

    // Check if any reference is a property in a type or interface
    let hasTypeOrInterfacePropertyRef = false;
    references.forEach((ref) => {
      ref.getReferences().forEach((refNode) => {
        const refNodeActual = refNode.getNode();
        if (isTypeOrInterfacePropertyReference(refNodeActual)) {
          hasTypeOrInterfacePropertyRef = true;
        }
      });
    });
    if (hasTypeOrInterfacePropertyRef) {
      context.skip('property in type or interface');
      return; // Skip renaming if any reference is a property in a type or interface
    }

    identifier.rename(camel); // This will update all references
    changed = true;

    // After renaming, update all object literal shorthand property assignments to explicit property assignments
    let shorthandHandled = false;
    references.forEach((ref) => {
      ref.getReferences().forEach((refNode) => {
        const refNodeActual = refNode.getNode();
        const parent = refNodeActual.getParent();
        if (
          parent &&
          Node.isShorthandPropertyAssignment(parent) &&
          parent.getNameNode() === refNodeActual
        ) {
          shorthandHandled = true;
          // Convert to explicit property assignment: { camelCase } -> { snake_case: camelCase }
          parent.replaceWithText(`${snake}: ${camel}`);
        }
      });
    });

    context.success(shorthandHandled);
  });

  if (changed) {
    sourceFile.saveSync();
    console.log(`Updated: ${sourceFile.getFilePath()}`);
  }
});
