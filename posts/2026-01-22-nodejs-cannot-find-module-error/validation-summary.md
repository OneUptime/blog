# Validation Summary: How to Fix 'Error: Cannot find module' in Node.js

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Node.js CommonJS modules
- Node.js ECMAScript modules
- npm CLI
- TypeScript path aliases
- ts-node
- tsconfig-paths
- module-alias
- Native Node.js modules

## Sources Consulted
- Node.js CommonJS modules documentation: https://nodejs.org/api/modules.html
- Node.js ECMAScript modules documentation: https://nodejs.org/api/esm.html
- Node.js command-line help for `--require` and `NODE_DEBUG`
- npm install documentation: https://docs.npmjs.com/cli/v10/commands/npm-install/
- npm link documentation: https://docs.npmjs.com/cli/v10/commands/npm-link/
- npm rebuild documentation: https://docs.npmjs.com/cli/v10/commands/npm-rebuild/
- npm ls, doctor, root, and cache command help from npm 10.9.4
- TypeScript `paths` TSConfig documentation: https://www.typescriptlang.org/tsconfig/paths.html
- ts-node `paths` and `baseUrl` documentation: https://typestrong.org/ts-node/docs/paths/

## Issues Found
- The missing file extension section incorrectly said `require('./data')` might fail when `data.json` exists. Node.js CommonJS resolution tries `.js`, `.json`, and `.node`, so this was changed to state that it works for those extensions and that extensions are required for file types such as `.cjs`.
- The corrupted `node_modules` section recommended removing `package-lock.json` as generally helpful. This was narrowed to say it should only be removed when the lockfile is suspected to be wrong.
- The working directory section implied relative `require()` paths break when a script is started from a parent directory. CommonJS relative imports are resolved relative to the requiring file, so the example was changed to refer to code that reads files from `process.cwd()`.
- Several code fences mixed shell commands, JavaScript, and JSON. These were split or relabeled so the examples are syntactically correct.
- The `module-alias` and ESM package configuration snippets used comments inside `json` code blocks. Those comments were moved outside the JSON snippets.
- The ES module section implied `require()` cannot load ES modules in all cases and used top-level `await` in a CommonJS example. This was updated to reflect modern Node.js behavior: `require()` can load some synchronous ES modules, but packages without a CommonJS entry point or modules with top-level await still need `import()`, an older CommonJS-compatible version, or an ESM project setup. The dynamic import example was changed to a valid CommonJS async function.

## Review Notes
The diagnostic script is useful but simplified: it checks common CommonJS file extensions and `index.js`, while Node's full resolution also considers package metadata and additional directory cases. This is acceptable for a troubleshooting helper, but could be expanded in a future revision.
