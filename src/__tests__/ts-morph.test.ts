import { describe, it, expect, beforeEach } from 'vitest';
import {
  Project,
  SyntaxKind,
  Node,
  PropertySignature,
  SourceFile,
} from 'ts-morph';
import {
  wouldShadowInAncestors,
  wouldShadowInDescendants,
  isNormalVariableDeclaration,
  isDestructuringVariableDeclaration,
  isTypeOrInterfacePropertyReference,
} from '../ts-morph';

describe('ts-morph utility functions', () => {
  let project: Project;

  beforeEach(() => {
    project = new Project({
      useInMemoryFileSystem: true,
    });
  });

  // Helper functions to reduce repetition
  const createSourceFile = (code: string) =>
    project.createSourceFile('test.ts', code);

  const getFirstNodeOfKind = <T extends Node>(
    sourceFile: SourceFile,
    kind: SyntaxKind
  ): T => {
    const node = sourceFile.getFirstDescendantByKind(kind);
    expect(node).toBeDefined();
    return node as T;
  };

  const getNodeByText = <T extends Node>(
    sourceFile: SourceFile,
    kind: SyntaxKind,
    text: string,
    index: number = 0
  ): T => {
    const nodes = sourceFile.getDescendantsOfKind(kind);
    const nodesWithText = nodes.filter((node) => node.getText().includes(text));
    return nodesWithText[index] as T;
  };

  const testFunction = <T extends Node>(
    code: string,
    kind: SyntaxKind,
    testFn: (node: T) => void
  ) => {
    const sourceFile = createSourceFile(code);
    const node = getFirstNodeOfKind<T>(sourceFile, kind);
    testFn(node);
  };

  const testShadowing = (
    code: string,
    fromName: string | { text: string; index: number },
    toName: string,
    shadowFn: (node: Node, name: string) => boolean,
    expectedResult: boolean
  ) => {
    const sourceFile = createSourceFile(code);
    const node = getNodeByText(
      sourceFile,
      SyntaxKind.VariableDeclaration,
      typeof fromName === 'string' ? fromName : fromName.text,
      typeof fromName === 'string' ? 0 : fromName.index
    );
    const result = shadowFn(node, toName);
    expect(result).toBe(expectedResult);
  };

  describe('isNormalVariableDeclaration', () => {
    it('should return true for normal variable declarations', () => {
      testFunction(
        'const user_name = 1;',
        SyntaxKind.VariableDeclaration,
        (node) => expect(isNormalVariableDeclaration(node)).toBe(true)
      );
    });

    it('should return false for non-variable declarations', () => {
      testFunction(
        'function test() {}',
        SyntaxKind.FunctionDeclaration,
        (node) => expect(isNormalVariableDeclaration(node)).toBe(false)
      );
    });
  });

  describe('isDestructuringVariableDeclaration', () => {
    it('should return "not destructuring" for normal variables', () => {
      testFunction(
        'const user_name = 1;',
        SyntaxKind.VariableDeclaration,
        (node) =>
          expect(isDestructuringVariableDeclaration(node)).toBe(
            'not destructuring'
          )
      );
    });

    it('should return "shorthand destructuring" for shorthand destructuring', () => {
      testFunction(
        'const { user_name } = obj;',
        SyntaxKind.BindingElement,
        (node) =>
          expect(isDestructuringVariableDeclaration(node)).toBe(
            'shorthand destructuring'
          )
      );
    });

    it('should return "explicit destructuring" for explicit destructuring', () => {
      testFunction(
        'const { user_name: email_address } = obj;',
        SyntaxKind.BindingElement,
        (node) =>
          expect(isDestructuringVariableDeclaration(node)).toBe(
            'explicit destructuring'
          )
      );
    });
  });

  describe('isTypeOrInterfacePropertyReference', () => {
    it('should return true for interface property references', () => {
      testFunction<PropertySignature>(
        'interface Test { user_name: string; }',
        SyntaxKind.PropertySignature,
        (node) => {
          const identifier = node.getNameNode();
          expect(isTypeOrInterfacePropertyReference(identifier)).toBe(true);
        }
      );
    });

    it('should return true for type alias property references', () => {
      testFunction<PropertySignature>(
        'type Test = { user_name: string; }',
        SyntaxKind.PropertySignature,
        (node) => {
          const identifier = node.getNameNode();
          expect(isTypeOrInterfacePropertyReference(identifier)).toBe(true);
        }
      );
    });

    it('should return false for regular variable references', () => {
      testFunction('const user_name = 1;', SyntaxKind.Identifier, (node) =>
        expect(isTypeOrInterfacePropertyReference(node)).toBe(false)
      );
    });
  });

  describe('wouldShadowInAncestors', () => {
    it('should return true when name would shadow in ancestor scope', () => {
      testShadowing(
        `
        const userName = 1;
        function test() {
          const user_name = 2;
        }
        `,
        'user_name',
        'userName',
        wouldShadowInAncestors,
        true
      );
    });

    it('should return false when name would not shadow in ancestor scope', () => {
      testShadowing(
        `
        const user_name = 1;
        function test() {
          const emailAddress = 2;
        }
        `,
        'user_name',
        'userName',
        wouldShadowInAncestors,
        false
      );
    });
  });

  describe('wouldShadowInDescendants', () => {
    it('should return true when name would shadow in descendant scope', () => {
      testShadowing(
        `
        function test() {
          const userName = 1;
        }
        const user_name = 2;
        `,
        'user_name',
        'userName',
        wouldShadowInDescendants,
        true
      );
    });

    it('should return false when name would not shadow in descendant scope', () => {
      testShadowing(
        `
        function test() {
          const email_address = 1;
        }
        const user_name = 2;
        `,
        'user_name',
        'userName',
        wouldShadowInDescendants,
        false
      );
    });
  });
});
