# snake-to-camel-ts

This project provides a codemod to convert snake_case identifiers to camelCase in TypeScript and TSX files using ts-morph.

## Requirements

- Node.js
- [ts-morph](https://ts-morph.com/) (installed as a dependency)
- [lodash](https://lodash.com/) (installed as a dependency)

## Usage

To run the codemod, use:

```
yarn snake-to-camel <folder> [tsconfig.json path]
```

This will use the TypeScript version of the script via tsx.

## Example

```sh
./run-snake-to-camel.sh ./src ../myproject/tsconfig.json
```

This will process all `.ts` and `.tsx` files in `./src` using the TypeScript configuration at `../myproject/tsconfig.json`.

## Notes

- This codemod uses [lodash.camelCase](https://lodash.com/docs/4.17.15#camelCase) for conversion.
- Review changes before committing, as automated renaming may have side effects in some codebases.
