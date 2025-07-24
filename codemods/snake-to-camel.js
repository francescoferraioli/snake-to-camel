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

// Check if a name would be shadowed in any ancestor scope
function wouldShadowInAncestors(node, newName) {
  let current = node.getParent();
  while (current) {
    if (
      Node.isBlock(current) ||
      Node.isSourceFile(current) ||
      Node.isFunctionDeclaration(current) ||
      Node.isArrowFunction(current) ||
      Node.isFunctionExpression(current)
    ) {
      // Check for any identifier with the newName in this scope
      const hasConflict = current.getDescendantsOfKind(SyntaxKind.Identifier)
        .some((id) => id.getText() === newName && id !== node);
      if (hasConflict) return true;
    }
    current = current.getParent();
  }
  return false;
}

project.getSourceFiles().forEach((sourceFile) => {
  let changed = false;

  sourceFile.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.Identifier) {
      const name = node.getText();
      const parent = node.getParent();
      // Only rename if this is a variable declaration (including destructuring)
      const isDeclaration =
        (Node.isVariableDeclaration(parent) && parent.getNameNode() === node) ||
        (Node.isBindingElement(parent) && parent.getNameNode() === node && Node.isVariableDeclaration(parent.getParentOrThrow()));
      if (isDeclaration && isSnakeCase(name)) {
        const camel = toCamelCase(name);
        if (camel !== name) {
          // Check all ancestor scopes for shadowing
          if (!wouldShadowInAncestors(node, camel)) {
            node.rename(camel); // This will update all references
            changed = true;
          }
          // If shadowed, skip silently
        }
      }
    }
  });

  if (changed) {
    sourceFile.saveSync();
    console.log(`Updated: ${sourceFile.getFilePath()}`);
  }
});
