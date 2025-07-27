import { describe, it, expect, beforeEach } from 'vitest';
import { Project, SourceFile } from 'ts-morph';
import { convertSourceFile } from '../../convert-source-file';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

describe('convertSourceFile Integration', () => {
  let project: Project;
  const filesToSave = new Set<string>();

  beforeEach(() => {
    project = new Project({
      useInMemoryFileSystem: true,
    });
    filesToSave.clear();
  });

  const shouldExcludeFile = (sourceFile: SourceFile) =>
    sourceFile.getFilePath().includes('excluded');

  const loadTestFile = (filePath: string): string => {
    return readFileSync(join(__dirname, filePath), 'utf-8');
  };

  const createSourceFileFromPath = (filePath: string) => {
    const content = loadTestFile(filePath);
    const fileName = filePath.split('/').pop()!;
    return project.createSourceFile(fileName, content);
  };

  const getTestFiles = (): string[] => {
    const fromDir = join(__dirname, 'from');
    return readdirSync(fromDir)
      .filter((file) => file.endsWith('.ts'))
      .map((file) => `from/${file}`);
  };

  const notSaving = ['/interfaces.ts', '/excluded.ts', '/camel-consts.ts'];

  it('should convert snake_case identifiers to camelCase correctly across all scenarios', () => {
    // Get all test files from the 'from' directory
    const testFiles = getTestFiles();

    // Load the "from" files and create source files
    const sourceFiles = testFiles.map((filePath) =>
      createSourceFileFromPath(filePath)
    );

    // Load the expected "to" files
    const expectedContents = testFiles.map((filePath) => {
      const toPath = filePath.replace('from/', 'to/');
      return loadTestFile(toPath);
    });

    // Apply the conversion function to all source files
    const converter = convertSourceFile({ shouldExcludeFile, filesToSave });
    sourceFiles.forEach((sourceFile) => converter(sourceFile));

    // Get the converted content and assert it matches expected content
    sourceFiles.forEach((sourceFile, index) => {
      const convertedContent = sourceFile.getFullText();
      const expectedContent = expectedContents[index];

      const context = `File: ${sourceFile.getFilePath()}`;

      expect(convertedContent, context).toBe(expectedContent);

      // Verify that files were marked for saving
      expect(filesToSave.has(sourceFile.getFilePath()), context).toBe(
        !notSaving.includes(sourceFile.getFilePath())
      );
    });
  });
});
