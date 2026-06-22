# Validation Summary: How to Use ES6 Import and Export in Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js ECMAScript modules
- CommonJS interoperability
- JavaScript import/export syntax
- JSON modules and import attributes
- TypeScript NodeNext module configuration
- Node.js package.json module fields

## Sources Consulted
- Node.js ECMAScript modules documentation: https://nodejs.org/api/esm.html
- Node.js package documentation: https://nodejs.org/api/packages.html
- Node.js CommonJS modules documentation: https://nodejs.org/api/modules.html
- TypeScript TSConfig `module` documentation: https://www.typescriptlang.org/tsconfig/module
- TypeScript TSConfig `moduleResolution` documentation: https://www.typescriptlang.org/tsconfig/moduleResolution.html

## Issues Found
- The post said there were only two ways to use ES modules in Node.js. Node.js also supports other explicit markers such as `--input-type=module`, so the wording was changed to "two common ways."
- The default export example included two `Logger` class declarations in the same code block, which would be a syntax error if copied as one file. The alternative export style was split into its own code block.
- The re-exporting example attempted to re-export a default export from `user.js` even though `user.js` did not define one, and it reused the `User` export name. The example now defines a default export and re-exports it as `DefaultUser`.
- The JSON module section said "Node.js 18+" and called `with { type: 'json' }` an import assertion. Node.js marks JSON modules as no longer experimental in v18.20.5, v20.18.3, v22.12.0, and v23.1.0, and the current syntax is import attributes. The version wording and terminology were corrected.
- The JSON import example reused the `config` identifier for mutually exclusive alternatives in the same code block. The dynamic import and filesystem examples now use distinct variable names.
- The CommonJS named import warning used Node's built-in `fs` module as the unreliable example, but Node built-ins support named ES module exports. The warning now uses the user-created CommonJS module, and built-in module examples use the `node:` protocol.
- The TypeScript example combined `"module": "ESNext"` with `"moduleResolution": "NodeNext"`. TypeScript's NodeNext resolution is intended to be paired with the corresponding NodeNext module setting, so `"module"` was changed to `"NodeNext"`.
- JSON code fences included JavaScript-style comments, making the snippets invalid JSON. The file labels were moved outside the JSON blocks.
- The CommonJS-to-ESM migration example used a named import from the CommonJS `express` package. It now imports the default and destructures `Router`, which is the safer interop pattern.
- The summary table described tree shaking as simply "No" for CommonJS and "Yes" for ES modules. This was refined to describe tree shaking in bundlers, where ES modules provide better static analysis.

## Review Notes
The remaining examples are technically sound for modern Node.js. The post still uses some broad recommendation language, such as preferring `"type": "module"` for new projects, which is an editorial recommendation rather than a correctness issue.
