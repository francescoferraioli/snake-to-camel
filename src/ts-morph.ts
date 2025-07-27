import { Node, NamedNodeSpecificBase, SyntaxKind } from 'ts-morph';

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
function getDirectDeclaredVariableNames(
  scope: Node,
  originalNode: Node
): string[] {
  return getDirectDeclaredNameNodes(scope, originalNode).map((node) =>
    node.getText()
  );
}
export function isNamedNodeStatement(
  stmt: any
): stmt is NamedNodeSpecificBase<Node> {
  return (stmt as NamedNodeSpecificBase<Node>).getNameNode !== undefined;
}
// Helper to get all direct declared name nodes in a scope
function getDirectDeclaredNameNodes(scope: Node, originalNode: Node): Node[] {
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
      // For constructor parameter property shorthand, we need to get the instance properties and methods
      ...(isConstructorParameterProperty(originalNode)
        ? [
            ...scope.getInstanceProperties().map((prop) => prop.getNameNode()),
            ...scope.getInstanceMethods().map((method) => method.getNameNode()),
          ]
        : []),
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
export function wouldShadowInAncestors(node: Node, newName: string): boolean {
  let current = node.getParent();
  while (current) {
    const nameNodes = getDirectDeclaredVariableNames(current, node);
    if (nameNodes.includes(newName)) return true;
    current = current.getParent();
  }
  return false;
}
function getParentOfType<T extends Node>(
  node: Node,
  typePredicate: (node: Node) => node is T
): T | undefined {
  if (typePredicate(node)) return node;
  let current = node.getParent();
  while (current) {
    if (typePredicate(current)) return current;
    current = current.getParent();
  }
  return undefined;
}
function getParentScope(node: Node): Node {
  const parent = getParentOfType(node, isScope);
  if (!parent) throw new Error('No scope found');
  return parent;
}
function isScope(node: Node): node is Node {
  return (
    Node.isBlock(node) ||
    Node.isSourceFile(node) ||
    Node.isClassDeclaration(node) ||
    Node.isFunctionDeclaration(node)
  );
}
// Check if a name would be shadowed in any descendant scope (only direct declarations in each scope)
export function wouldShadowInDescendants(node: Node, newName: string): boolean {
  let shadowed = false;
  // Helper to recursively check descendant scopes
  function checkDescendantScopes(scope: Node) {
    // Check direct declared names in this scope
    const nameNodes = getDirectDeclaredVariableNames(scope, node);
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
export function isNormalVariableDeclaration(node: Node): boolean {
  return Node.isVariableDeclaration(node);
}
type IsDestructuringVariableDeclarationResult =
  | 'not destructuring'
  | 'shorthand destructuring'
  | 'explicit destructuring';
export function isDestructuringVariableDeclaration(
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
export function isTypeOrInterfacePropertyReference(node: Node): boolean {
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
function isConstructorParameterProperty(node: Node): boolean {
  const param = getParentOfType(node, Node.isParameterDeclaration);
  if (!param) return false;
  const constructor = getParentOfType(param, Node.isConstructorDeclaration);
  if (!constructor) return false;
  return param.hasScopeKeyword() || param.isReadonly();
}
