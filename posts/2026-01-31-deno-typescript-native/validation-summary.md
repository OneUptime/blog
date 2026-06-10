# Validation Summary: How to Use TypeScript Native Support in Deno

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Deno runtime
- TypeScript (interfaces, generics, decorators, utility types, discriminated unions, type-only imports)
- `deno.json` configuration (compilerOptions, lint, fmt, imports, tasks)
- Deno standard library (`deno.land/std`)
- Oak web framework

## Sources Consulted
- Deno official docs — TypeScript fundamentals: https://docs.deno.com/runtime/fundamentals/typescript/
- Deno standard library `http/server.ts` at version 0.224.0: https://deno.land/std@0.224.0/http/server.ts
- TypeScript handbook (compiler options, utility types, decorators)

## Issues Found

1. **Incorrect claim about default type checking behavior.**
   The post stated "By default, Deno performs type checking on your TypeScript files." This is incorrect. Per the official Deno docs, `deno run` does NOT type check by default (this default was changed back in Deno 1.23, June 2022) — it strips types and executes the resulting JavaScript for speed. Type checking is opt-in via `--check` (or `--check=all` to include remote/npm code). I rewrote the "Default Type Checking" section to reflect the actual behavior and clarified that `--no-check` is mainly useful for commands like `deno test` that DO type check by default.

2. **Misleading "type errors at runtime" framing in the intro example.**
   The greeting example's comment and the paragraph immediately after it implied Deno would automatically report type errors before running the code. Reworded to clarify that type stripping happens by default and `--check` is required to surface type errors before execution.

3. **Misleading "Built-in Type Checking" bullet.**
   The original bullet said Deno "performs type checking at runtime." Reworded to accurately describe that Deno ships a TypeScript compiler usable via `deno check` / `deno run --check`, without forcing a runtime type-check pass.

4. **Non-existent `ServerRequest` import.**
   The "Importing from Remote URLs" example imported `ServerRequest` from `https://deno.land/std@0.224.0/http/server.ts`. That symbol is not exported from that module — `ServerRequest` belonged to the long-removed legacy HTTP API. Replaced with `Handler` (which is exported from that file at 0.224.0) and updated the example body to match the `Handler` signature (taking a `Request` and returning a `Response`).

## Review Notes

- The post's `deno.land/std@0.224.0` references are still resolvable, but the entire `deno.land/std` registry has been deprecated in favor of `@std/*` packages on JSR (jsr.io). A future revision could update the URLs and import map to use JSR (e.g., `"@std/http": "jsr:@std/http@^1"`). The current URLs still work, so this is a soft recommendation rather than a correctness issue.
- The Oak example pins `v12.6.1`. Oak has had many releases since; the pinned version still works but is significantly behind current. Pinning is fine for a tutorial, just worth noting for readers.
- The decorator example uses legacy (`experimentalDecorators`) decorators. Deno also supports TC39 Stage 3 decorators (TypeScript 5.0+), which use a different signature and don't require `experimentalDecorators`. Both forms work today; the post explicitly notes the experimental flag requirement, which is accurate for the syntax shown.
- `emitDecoratorMetadata` is listed in the example `deno.json`. Older Deno versions did not honor this flag for decorator metadata emission; recent Deno releases (2.x) do support it. Accurate for 2026.
- The `findById` generic constraint example relies on TypeScript narrowing `T["id"]` per the concrete `T`. This works as written and is a good demonstration of indexed access types under constraints.
