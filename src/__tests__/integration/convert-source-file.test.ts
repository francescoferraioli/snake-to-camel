import { describe, it, expect, beforeEach } from 'vitest';
import { Project } from 'ts-morph';
import { convertSourceFile } from '../../convert-source-file';
import { readFileSync } from 'fs';
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

  const shouldExcludeFile = () => false; // Don't exclude any files for this test

  const loadTestFile = (filePath: string): string => {
    return readFileSync(join(__dirname, filePath), 'utf-8');
  };

  const createSourceFileFromPath = (filePath: string) => {
    const content = loadTestFile(filePath);
    const fileName = filePath.split('/').pop()!;
    return project.createSourceFile(fileName, content);
  };

  it('should convert snake_case identifiers to camelCase correctly across all scenarios', () => {
    // Load the "from" files
    const userSourceFile = createSourceFileFromPath('from/user.ts');
    const utilsSourceFile = createSourceFileFromPath('from/utils.ts');

    // Load the expected "to" files
    const expectedUserContent = loadTestFile('to/user.ts');
    const expectedUtilsContent = loadTestFile('to/utils.ts');

    // Apply the conversion function
    const converter = convertSourceFile({ shouldExcludeFile, filesToSave });
    converter(userSourceFile);
    converter(utilsSourceFile);

    // Get the converted content
    const convertedUserContent = userSourceFile.getFullText();
    const convertedUtilsContent = utilsSourceFile.getFullText();

    // Assert the converted content matches the expected content
    expect(convertedUserContent).toBe(expectedUserContent);
    expect(convertedUtilsContent).toBe(expectedUtilsContent);

    // Verify that files were marked for saving
    expect(filesToSave.has(userSourceFile.getFilePath())).toBe(true);
    expect(filesToSave.has(utilsSourceFile.getFilePath())).toBe(true);
  });
});
