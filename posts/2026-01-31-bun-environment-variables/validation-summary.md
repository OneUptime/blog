# Validation Summary: How to Use Environment Variables in Bun

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bun runtime
- `Bun.env`, `process.env`, `import.meta.env`
- `.env` file loading (`.env`, `.env.development`, `.env.production`, `.env.test`, `.env.local`)
- TypeScript (interface-based env typing)
- `Bun.serve` (HTTP server API)
- `Bun.file` (file I/O)
- HashiCorp Vault / AWS Secrets Manager (mentioned as runtime secret sources)

## Sources Consulted
- Bun runtime env docs: https://bun.sh/docs/runtime/env
- Bun HTTP server docs: https://bun.sh/docs/api/http
- Bun file I/O docs: https://bun.sh/docs/api/file-io

## Issues Found
1. **Incorrect claim that `Bun.env` is faster than `process.env`.** The post originally stated that "Bun offers `Bun.env` as a more performant and type-safe alternative" and "`Bun.env` is slightly faster since it does not need to go through the Node.js compatibility layer". Per the official Bun docs, `Bun.env`, `process.env`, and `import.meta.env` are all aliases of the same underlying object — there is no performance difference. Rewrote the intro paragraph, the "key difference" sentence, and the Best Practices bullet ("Use Bun.env over process.env - It is faster") to reflect that they are aliases.

2. **Incorrect `.env` file loading order.** The post listed the precedence as `.env` → `.env.local` → `.env.{NODE_ENV}` → `.env.{NODE_ENV}.local`. According to the official Bun docs, the actual order (increasing precedence) is `.env` → `.env.production`/`.env.development`/`.env.test` (chosen by `NODE_ENV`) → `.env.local`. Updated the list to match the documented behavior.

3. **References to `.env.development.local` / `.env.production.local` as supported files.** Bun does not natively load these specific filenames. Removed the line "`.env.development.local` or `.env.production.local` - Local environment-specific overrides" from the loading-order list. Also trimmed the corresponding entries in the `.gitignore` example (kept `.env.local` and the broader `.env.*.local` glob, which is still a reasonable safety net even if Bun doesn't read those exact names).

## Review Notes
- The TypeScript helpers (`getRequiredEnv`, `getNumericEnv`, etc.) and the `Bun.serve` options (`port`, `hostname`, `fetch`) used throughout the post are all valid and match the current Bun API.
- The `Bun.file(path).text()` usage in the secrets-loading example is correct per the Bun file I/O reference.
- The post does not call out Bun's TypeScript-specific approach of using `declare module "bun" { interface Env { ... } }` for typing `process.env` / `Bun.env` directly. The custom typed-config pattern shown is still valid, just not the only option; this is a possible future improvement, not an error.
- The post does not mention `--env-file` or `--no-env-file` CLI flags, which are useful for overriding default loading. Again, not an error — just a notable omission for a comprehensive guide.
