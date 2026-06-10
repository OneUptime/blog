# Validation Summary: How to Handle Environment Variables in Deno

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Deno runtime
- Deno.env API (`get`, `set`, `delete`, `toObject`)
- Deno standard library `dotenv` module (`std@0.224.0/dotenv`)
- Deno permission system (`--allow-env`, `Deno.permissions.request`)
- TypeScript (typed config patterns)
- Zod schema validation (`zod@v3.22.4`)
- Deno.serve HTTP server API

## Sources Consulted
- Deno official documentation for the `Deno.env` namespace: https://docs.deno.com/api/deno/~/Deno.env
- Deno standard library `dotenv` module (std@0.224.0): https://deno.land/std@0.224.0/dotenv/mod.ts
- Deno permissions documentation: https://docs.deno.com/runtime/fundamentals/security/
- Deno.permissions API: https://docs.deno.com/api/deno/~/Deno.permissions
- Deno.serve API: https://docs.deno.com/api/deno/~/Deno.serve
- Zod v3 documentation: https://zod.dev (for v3.22.4 schema/transform/pipe/safeParse APIs)
- Deno errors API: https://docs.deno.com/api/deno/~/Deno.errors.NotFound

## Issues Found
- **"Deno provides two methods for this purpose."** (Getting Environment Variables section): The `Deno.env` API exposes only one method for retrieving a single environment variable (`get()`). The other "method" the author proceeds to show is a user-defined helper, not a built-in API. Changed to: "Deno provides the `get()` method for this purpose." This keeps the surrounding paragraph and code examples intact (the user-defined `getRequiredEnv` helper is still a valid pattern).

## Review Notes
- The post imports `https://deno.land/std@0.224.0/dotenv/mod.ts`. Version 0.224.0 is a real, valid release and was effectively the final `deno.land/std` version before the standard library migrated to JSR (`jsr:@std/dotenv`). The URL still resolves and the code works, but readers writing new code today would typically be pointed at the JSR module. Left as-is because this is a stylistic/migration choice rather than a correctness bug.
- The `load()` function in `std/dotenv` internally catches `Deno.errors.NotFound` and returns an empty object when the target file is missing. As a result, the `try { await load(...) } catch (error) { if (error instanceof Deno.errors.NotFound) ... }` blocks in two examples ("Handling Missing .env Files Gracefully" and the multi-file `env-loader.ts`) are effectively defensive dead code for that specific error — load() will not throw `Deno.errors.NotFound`. The code is still functionally correct (missing files are handled silently and execution proceeds), and the catch still serves as a guard against other I/O errors, so I did not modify it. Future readers should know that the missing-file case is already handled by `load()` itself.
- The "Configuration Factory" pattern uses a shallow merge that does not deep-merge nested overrides beyond one level. For the database/cache shapes shown it's sufficient, but anyone extending it with more deeply nested config should be aware of this. Not a correctness issue with the example as written.
- The Zod example `ENABLE_METRICS: z.string().transform((v) => v === "true").default("false")` is correct in Zod v3: `.default()` applies to the input pre-transform, so the resulting parsed value is a `boolean` (`false`) when the env var is unset. This works as intended.
- `--allow-env`, `--allow-env=VAR1,VAR2`, `Deno.permissions.request({ name: "env", variable: "..." })`, `Deno.env.toObject()`, `Deno.errors.NotFound`, `Deno.exit()`, and `Deno.serve({ port }, handler)` were all verified against current Deno docs and are accurate.
