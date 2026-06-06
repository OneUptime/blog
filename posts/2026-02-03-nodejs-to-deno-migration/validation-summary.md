# Validation Summary: How to Migrate from Node.js to Deno

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Deno 2.x runtime
- Node.js (CommonJS and ESM)
- TypeScript
- npm packages via `npm:` specifier
- Deno standard library (`@std`)
- Deno permission model
- Deno built-in HTTP server (`Deno.serve`)
- Deno test runner
- `deno.json` configuration

## Sources Consulted
- Deno 1.x to 2.x Migration Guide — https://docs.deno.com/runtime/reference/migration_guide/
- Deno Node and npm Compatibility — https://docs.deno.com/runtime/fundamentals/node/
- Deno Standard Library on JSR announcement — https://deno.com/blog/std-on-jsr
- Deno package.json support — https://deno.com/blog/package-json-support
- Deno Security and Permissions — https://docs.deno.com/runtime/fundamentals/security/
- Deno ImportMeta API — https://docs.deno.com/api/web/~/ImportMeta
- wessberg/cjstoesm GitHub repo — https://github.com/wessberg/cjstoesm
- lebab GitHub repo — https://github.com/lebab/lebab

## Issues Found

1. **Non-existent `--unstable-node-compat` flag.** The post repeatedly referenced a `--unstable-node-compat` flag (in the "Node Compatibility Mode" section, Phase 1 of the migration strategy, and the summary table). This flag does not exist in Deno 2.x — Node.js compatibility is automatic and built-in in Deno 2.x, requiring no flag. Removed all occurrences and reworded the surrounding text to reflect that Node compat is built-in.

2. **Non-existent `cjs-to-esm` repository.** The post linked to `https://github.com/nicolo-ribaudo/cjs-to-esm`, which does not exist (Nicolò Ribaudo is a Babel maintainer but has no such repo). Replaced with the real, well-known equivalent: `cjstoesm` by Frederik Wessberg (`https://github.com/wessberg/cjstoesm`).

## Review Notes

- The post uses legacy `https://deno.land/std@0.220.0/...` URLs for the standard library. These still resolve and work, but the std library has officially moved to JSR (`jsr:@std/...`) and the deno.land/std host is deprecated for new code. Left as-is because the URLs still function and the post pins to a specific working version, but future updates should migrate to JSR specifiers.
- The `deno.json` `compilerOptions` includes both `strict: true` and `noImplicitAny: true`; the latter is implied by `strict`, so it is redundant but not incorrect.
- All Deno APIs used (`Deno.serve`, `Deno.readTextFile`, `Deno.writeTextFile`, `Deno.env.get/set`, `Deno.exit`, `Deno.test`, `import.meta.dirname`, `import.meta.filename`) are accurate and stable in current Deno releases.
- All permission flags (`--allow-net`, `--allow-read`, `--allow-write`, `--allow-env`, `--allow-run`, `--allow-ffi`, `--allow-all` / `-A`) are valid.
- The `npm:` specifier examples (including version pinning like `npm:express@4`) are syntactically and semantically correct.
- The CommonJS-to-ESM conversion table is accurate.
