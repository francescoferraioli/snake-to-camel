const { Project } = require("ts-morph");
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

const files = getAllFiles(targetPath, [".ts", ".tsx"]);

files.forEach((filePath) => {
  const sourceFile = project.addSourceFileAtPath(filePath);
  let changed = false;

  sourceFile.forEachDescendant((node) => {
    if (node.getKindName() === "Identifier") {
      const name = node.getText();
      if (isSnakeCase(name)) {
        const camel = toCamelCase(name);
        if (camel !== name) {
          node.replaceWithText(camel);
          changed = true;
        }
      }
    }
  });

  if (changed) {
    sourceFile.saveSync();
    console.log(`Updated: ${filePath}`);
  }
});
