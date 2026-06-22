# Validation Summary: How to Fix 'Cannot Redeclare Block-Scoped Variable'

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- TypeScript
- JavaScript variable declarations
- TypeScript modules and scripts
- TypeScript declaration files
- TypeScript tsconfig options

## Sources Consulted
- TypeScript Handbook: Modules - https://www.typescriptlang.org/docs/handbook/2/modules.html
- TypeScript Handbook: Variable Declarations - https://www.typescriptlang.org/docs/handbook/variable-declarations.html
- TypeScript Handbook: Declaration Merging - https://www.typescriptlang.org/docs/handbook/declaration-merging.html
- TypeScript TSConfig Reference: lib - https://www.typescriptlang.org/tsconfig/lib.html
- TypeScript TSConfig Reference: moduleDetection - https://www.typescriptlang.org/tsconfig/moduleDetection.html
- TypeScript TSConfig Reference: isolatedModules - https://www.typescriptlang.org/tsconfig/isolatedModules.html
- Local compiler check with TypeScript 5.9.3 via `tsc --noEmit`

## Issues Found
- The original "Conflicts with Type Declarations" example used an imported `interface Request` and a same-named `const Request`. TypeScript has separate type and value namespaces, so that code does not produce the stated block-scoped redeclaration error. Changed the section to a DOM global value conflict using `Request`, which TypeScript reports as `TS2451: Cannot redeclare block-scoped variable 'Request'` in script mode, and updated the fixes to renaming the variable or making the file a module.
- The original `isolatedModules` section said TypeScript requires each file to be a standalone module and showed an unrelated `import type` diagnostic. `isolatedModules` checks compatibility with single-file transpilation and specifically rejects namespaces in global script files. Updated the explanation and example, and added `moduleDetection: "force"` to the tsconfig snippet as the project-level way to treat non-declaration files as modules.
- The tsconfig comment for `isolatedModules` incorrectly described it as ensuring each file is a module. Updated it to describe isolated transpilation correctly.

## Review Notes
The remaining examples and explanations align with TypeScript's documented distinction between scripts and modules, block scoping for `let` and `const`, DOM library globals, and global augmentation patterns. The post is validated after the corrections above.
