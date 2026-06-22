# Validation Summary: How to Configure TypeScript with Node.js

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- TypeScript
- Node.js
- tsconfig.json compiler options
- CommonJS and ECMAScript modules
- npm scripts
- ts-node
- tsx
- Node.js package imports

## Sources Consulted
- TypeScript TSConfig `module` documentation: https://www.typescriptlang.org/tsconfig/module
- TypeScript 5.9 release notes for `--module node20`: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html
- TypeScript TSConfig `moduleResolution` documentation: https://www.typescriptlang.org/tsconfig/moduleResolution.html
- TypeScript TSConfig `paths` documentation: https://www.typescriptlang.org/tsconfig/paths.html
- Node.js ECMAScript modules documentation: https://nodejs.org/api/esm.html
- Node.js packages documentation for `type` and `imports`: https://nodejs.org/api/packages.html
- ts-node options documentation: https://typestrong.org/ts-node/docs/options/
- Local CLI checks with Node.js v22.22.0, npm 10.9.4, and TypeScript 5.9.3

## Issues Found
- The Node.js 20+ configuration still recommended `"module": "Node16"`. Updated the Node 20+ examples to `"module": "Node20"` while keeping `"moduleResolution": "Node16"`, which is the valid module resolution mode implied by TypeScript 5.9 for `Node20`.
- The ESM guidance said all imports require file extensions. Node.js requires extensions for relative and absolute ESM specifiers, but not every package or subpath import necessarily follows that wording. Updated the claim to "relative imports."
- The `tsconfig-paths` runtime example used `node -r tsconfig-paths/register dist/index.js` with aliases mapped to `src/*`, which would not resolve the compiled `dist/*` layout shown in the post. Updated the example to describe CommonJS `ts-node` development usage instead.
- The JSON import example used import assertions, `assert { type: "json" }`. Current Node.js documentation uses import attributes, `with { type: "json" }`, and newer Node versions have dropped import assertion support. Updated the snippet.

## Review Notes
The post is technically relevant and broadly correct after the fixes. For future updates, consider mentioning that TypeScript's generated `tsc --init` defaults have changed in TypeScript 5.9 and that `tsx` is usually simpler than `ts-node` for ESM watch-mode development.
