# Validation Summary: How to Use TypeScript with Bun

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bun (JavaScript/TypeScript runtime)
- TypeScript (language and compiler)
- JavaScript / JSDoc
- React / JSX / TSX
- Bun built-in APIs: `Bun.file`, `Bun.write`, `Bun.serve`, `bun:sqlite`
- TypeScript decorators (legacy / `experimentalDecorators`)
- `bunx`, `bun --watch`, `tsc --noEmit`

## Sources Consulted
- Bun official TypeScript docs: https://bun.sh/docs/typescript
- Bun runtime TypeScript docs: https://bun.sh/docs/runtime/typescript
- Bun HTTP server (Bun.serve) docs: https://bun.sh/docs/api/http
- Bun SQLite docs: https://bun.sh/docs/api/sqlite
- Bun file I/O docs: https://bun.sh/docs/api/file-io
- TypeScript handbook on decorators and compiler options: https://www.typescriptlang.org/docs/handbook/decorators.html
- TypeScript `moduleResolution: "bundler"` reference: https://www.typescriptlang.org/tsconfig#moduleResolution

## Issues Found
- **Outdated type-definitions package**: The post recommended `bun-types` and `"types": ["bun-types"]`. Bun's current official docs recommend `@types/bun` and `"types": ["bun"]`. Updated three places:
  - `bun add -d bun-types` → `bun add -d @types/bun`
  - `"types": ["bun-types"]` → `"types": ["bun"]` in the recommended `tsconfig.json`
  - "fully typed when you install `bun-types`" → "fully typed when you install `@types/bun`"
  - "Always Install bun-types" best-practice bullet → "Always Install @types/bun"

## Review Notes
- `bun --bun tsc --noEmit` is valid: `--bun` forces Bun's runtime for the spawned binary. Both this and `bunx tsc --noEmit` work for type-checking without emit.
- The post uses legacy decorators with `experimentalDecorators: true` and `emitDecoratorMetadata: true`. This is fully supported by Bun and TypeScript. (TypeScript 5.0+ also supports TC39 standard decorators, which use a different signature; the post intentionally sticks to the legacy form, which is appropriate given the `emitDecoratorMetadata` use case.)
- The `MinLength` property decorator example stores `value` in a closure on the prototype, which means all instances of a decorated class would share the same backing field. This is a well-known limitation of the simplified decorator pattern shown in many tutorials; it is not technically incorrect for an illustrative snippet, so it was left as-is.
- Importing named exports (`import { file, write, serve } from "bun"`) is valid; the more common idiom in current Bun docs is `Bun.file()`, `Bun.write()`, `Bun.serve()` on the global `Bun` object. Both forms are correct.
- The path-alias example uses `@types/*` as a project alias. This works because explicit `paths` entries take precedence, but it can be confusing alongside DefinitelyTyped's `@types/*` package convention. Left unchanged since it's not technically wrong.
- The current Bun-recommended `tsconfig.json` uses `"module": "Preserve"` rather than `"module": "ESNext"`. Both are valid configurations for Bun projects; the post's choice was left intact since it is not incorrect.
