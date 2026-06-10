# Validation Summary: How to Build CLI Applications with Deno

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Deno runtime (CLI APIs: `Deno.args`, `Deno.exit`, `Deno.stdin`, `Deno.stdout`, `Deno.Command`, `Deno.mkdir`, `Deno.writeTextFile`, `Deno.cwd`)
- Deno standard library (`std@0.224.0`): `cli/parse_args`, `fmt/colors`, `fs/ensure_dir`, `path/mod`
- TypeScript (type-safe argument parsing, interfaces)
- `deno compile` (cross-platform binary compilation)
- `deno install` (script installation)
- GitHub Actions (release workflow with `denoland/setup-deno@v1`, `actions/checkout@v4`, `actions/upload-artifact@v4`, `softprops/action-gh-release@v1`)
- JSR (JavaScript Registry) for distribution
- Oak framework (`deno.land/x/oak@v12.6.1`) referenced in scaffolding template

## Sources Consulted
- Deno official documentation: https://docs.deno.com/
- `deno install` reference (Deno 2 breaking change): https://docs.deno.com/runtime/reference/cli/install/
- Deno 2 release notes / migration guide (re: `deno install --global` requirement): https://github.com/denoland/deno/issues/23062
- `Deno.stdin` API reference: https://docs.deno.com/api/deno/~/Deno.stdin
- `Deno.Command` API reference: https://docs.deno.com/api/deno/~/Deno.Command
- `deno compile` reference (supported target triples): https://docs.deno.com/runtime/reference/cli/compile/
- Deno std library `parseArgs` source: https://deno.land/std@0.224.0/cli/parse_args.ts

## Issues Found
1. **`deno install` missing `--global` flag (Deno 2 breaking change)**: The post used the Deno 1.x form `deno install --allow-read --allow-write -n mycli ./mod.ts`. In Deno 2 (released October 2024), `deno install` without `--global` was repurposed to install dependencies into `deno.json` rather than installing a script as a global executable. A reader in 2026 running this command would not get a global `mycli` binary. Fixed both occurrences (the "Direct Installation from URL" section and inside the generated README template) by adding `--global`.

## Review Notes
- The post imports the standard library via the legacy `deno.land/std@0.224.0/...` URLs. These still resolve and work in Deno 2, but the modern preferred path is JSR (`jsr:@std/cli`, `jsr:@std/fmt/colors`, `jsr:@std/fs`, `jsr:@std/path`). Not changed since the URL imports are still functional and the change would be stylistic, not corrective.
- The GitHub Actions workflow uses `deno-version: v1.x` which pins to Deno 1.x. With the rest of the post written against std 0.224.0 (Deno 1.x era release), this is internally consistent. Readers targeting Deno 2 may want `v2.x` or `vx.x.x` instead. Not changed since `v1.x` is still a valid setup-deno input.
- `parseArgs<CliArgs>(Deno.args, {...})` passes a custom interface as the generic parameter. The actual generic on `parseArgs` is `TArgs extends Values<...>`, not the return type — so this pattern can produce a TypeScript constraint mismatch in strict mode depending on how the interface aligns with the inferred options. The runtime behavior is unaffected; left as-is per the author's style.
- The `Deno.stdin.read(buf)` Reader-style pattern used in the prompts and scaffolding examples still works in Deno 2 but is older than the newer `ReadableStream` approach. Functionally correct; left untouched.
- There is a markdown nesting glitch inside the `templates.ts` example (line ~711) where a 4-backtick fence appears inside the outer 3-backtick code block. This is a rendering quirk in the embedded template content, not a technical correctness issue, so left untouched per scope.
- `deno.land/x/oak@v12.6.1` referenced in the scaffolding template is a real published version of Oak; newer Oak releases exist but v12.6.1 is still valid.
