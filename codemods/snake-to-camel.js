const { Project, SyntaxKind, Node } = require("ts-morph");
const { camelCase } = require("lodash");
const path = require("path");
const fs = require("fs");

function isSnakeCase(name) {
  // Check for snake_case pattern: all lowercase with underscores
  return /^[a-z]+(_[a-z0-9]+)*$/.test(name);
}

function toCamelCase(name) {
  return camelCase(name);
}

const targetPath = process.argv[2];
const tsconfigPath = process.argv[3] || path.join(process.cwd(), "tsconfig.json");
if (!targetPath) {
  console.error("Usage: node snake-to-camel.js <folder> [tsconfig.json path]");
  process.exit(1);
}

const project = new Project({
  tsConfigFilePath: tsconfigPath,
  skipAddingFilesFromTsConfig: true,
});

function getAllFiles(dir, exts, fileList = []) {
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

const files = targetPath.endsWith(".ts") || targetPath.endsWith(".tsx")
  ? [targetPath]
  : getAllFiles(targetPath, [".ts", ".tsx"]);

// Add all files to the project first
files.forEach((filePath) => {
  project.addSourceFileAtPath(filePath);
});

// Helper to get all direct declared name nodes in a scope
function getDirectDeclaredNameNodes(scope) {
  if (Node.isBlock(scope) || Node.isSourceFile(scope)) {
    // Collect all direct variable, function, class, interface, type, enum name nodes in this scope
    return scope.getStatements()
      .flatMap(stmt => {
        // Collect variable declaration names (e.g., let foo = 1;)
        if (stmt.getVariableDeclarations) return stmt.getVariableDeclarations().map(decl => decl.getNameNode());
        // Collect names of functions, classes, interfaces, types, enums, etc. (e.g., function foo() {}, class Bar {})
        if (stmt.getNameNode) return [stmt.getNameNode()];
        return [];
      });
  } else if (Node.isClassDeclaration(scope)) {
    // Collect all static property and static method name nodes in this class
    return [
      ...scope.getStaticProperties().map(prop => prop.getNameNode()),
      ...scope.getStaticMethods().map(method => method.getNameNode())
    ];
  } else if (
    Node.isFunctionDeclaration(scope) ||
    Node.isFunctionExpression(scope) ||
    Node.isArrowFunction(scope)
  ) {
    // Parameters of the function
    return scope.getParameters()
      .map(param => param.getNameNode());
  }
  return [];
}

// Check if a name would be shadowed in any ancestor scope (only direct declarations in each scope)
function wouldShadowInAncestors(node, newName) {
  let current = node.getParent();
  while (current) {
    const nameNodes = getDirectDeclaredNameNodes(current);
    if (nameNodes.some(n => n && n.getText() === newName && n !== node)) return true;
    current = current.getParent();
  }
  return false;
}

function isNormalVariableDeclaration(node) {
  return Node.isVariableDeclaration(node);
}

function isDestructuringVariableDeclaration(node) {
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

    const name = node.getText();
    const parent = node.getParent();

    // Only rename if this is a variable declaration (including destructuring)
    const isDeclaration =
      (isNormalVariableDeclaration(parent) || isDestructuringVariableDeclaration(parent))
      // Check that this is actually the declaration, not a reference
      && parent.getNameNode() === node;

    if (!isDeclaration || !isSnakeCase(name)) {
      return;
    }

    const camel = toCamelCase(name);
    if (camel === name) {
      // This should never happen, but just in case
      console.warn(`Skipping ${name} because it is already camelCase`);
      return;
    }

    // Check all ancestor scopes for shadowing
    if (wouldShadowInAncestors(node, camel)) {
      console.warn(`Skipping ${name} because it would shadow ${camel}`);
      return; // If shadowed, skip silently
    }

    node.rename(camel); // This will update all references
    changed = true;
  });

  if (changed) {
    sourceFile.saveSync();
    console.log(`Updated: ${sourceFile.getFilePath()}`);
  }
});
