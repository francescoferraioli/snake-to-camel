# snake-to-camel-ts

This repository provides a [jscodeshift](https://github.com/facebook/jscodeshift) codemod script to convert all `snake_case` variable names to `camelCase` in TypeScript files.

## Setup

1. Install dependencies:
   ```sh
   yarn install
   ```
## Usage

You can use the provided script to run the codemod by simply passing a folder path:

```sh
node run-snake-to-camel.js <folder>
```

- Replace `<folder>` with your TypeScript source directory (e.g., `src`).
- This will automatically apply the codemod to all `.ts` and `.tsx` files, ignoring `node_modules`, `dist`, `build`, and `out`.

## Notes
- This codemod uses [lodash.camelCase](https://lodash.com/docs/4.17.15#camelCase) for conversion.
- Review changes before committing, as automated renaming may have side effects in some codebases. 