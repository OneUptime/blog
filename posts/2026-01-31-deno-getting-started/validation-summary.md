# Validation Summary: How to Get Started with Deno Runtime

## Status
validated

## Post Type
Tutorial / Getting-started guide

## Technologies Covered
- Deno runtime (v2.x, with v2.1.4 used in sample output)
- TypeScript (built-in support in Deno)
- Deno CLI (`run`, `fmt`, `lint`, `test`, `compile`, `task`, `bench`, `coverage`)
- Deno permission model (`--allow-read`, `--allow-write`, `--allow-net`, `--allow-env`, `--allow-run`, `--allow-ffi`, `--no-prompt`)
- Deno standard library (`deno.land/std`)
- npm specifier imports (`npm:` scheme)
- Oak web framework (v12.6.1)
- Import maps via `deno.json`
- Built-in test runner (`Deno.test`, `assertEquals`, `assertExists`, `assertThrows`)

## Sources Consulted
- [Deno CLI Reference – deno fmt](https://docs.deno.com/runtime/reference/cli/fmt/)
- [Deno CLI Reference – deno run](https://docs.deno.com/runtime/reference/cli/run/)
- [Deno Security and Permissions](https://docs.deno.com/runtime/fundamentals/security/)
- [Deno 2.0 Release notes](https://deno.com/blog/v2.0-release-candidate)
- [GitHub Issue: Remove --allow-hrtime](https://github.com/denoland/deno/issues/25364)
- [Oak v12.6.1 documentation on deno.land/x](https://deno.land/x/oak@v12.6.1)

## Issues Found

1. **Removed `--allow-hrtime` permission flag from the Permission Flags section.**
   The post stated the runtime version is Deno 2.1.4, but listed `--allow-hrtime` as a usable flag. `--allow-hrtime` was removed as a breaking change in Deno 2.0 because high-resolution timing is now always available. Verified via the Deno 2.0 release notes and GitHub issue #25364.

2. **Replaced `deno fmt --stdout app.ts` with `cat app.ts | deno fmt -`.**
   The `--stdout` flag is not part of the current `deno fmt` CLI. The official, documented way to format from a source and write the formatted output to stdout is to pipe content through `deno fmt -` (using the `-` argument to read from stdin). Verified against the official `deno fmt` reference.

3. **Rewrote the "Permission Prompts" section.**
   The post claimed `--prompt` enables runtime permission prompts. That flag does not exist. Interactive permission prompts are enabled by default whenever stdout/stderr is a TTY; the actual flag is `--no-prompt`, which disables prompting and causes a `PermissionDenied` error to be raised instead. Verified against the Deno security/permissions documentation.

4. **Fixed Oak body parsing API in the REST API example (two places).**
   The example imports Oak `v12.6.1`, but called `await ctx.request.body.json()`, which is the property-style API introduced in later Oak releases. In Oak v12.x, `body` is a function: the correct usage is `await ctx.request.body({ type: "json" }).value`. Both the POST and PUT handlers were updated.

## Review Notes
- The post pins `deno.land/std@0.220.0` and `oak@v12.6.1`. Both are valid releases, but newer alternatives exist (`jsr:@std/...` and Oak v17+ with the property-style body API). The chosen versions match each other and the code samples now work as written.
- `Deno.stdout.write` is still a supported API in Deno 2.x, though newer Web Streams idioms (`Deno.stdout.writable.getWriter()`) are also available. No change needed.
- The sample `deno --version` output (`deno 2.1.4`, `v8 13.0.245.12-rusty`, `typescript 5.6.2`) is plausible for the corresponding Deno 2.1.x release line.
- The `deno compile --target` triple names (`x86_64-unknown-linux-gnu`, `x86_64-pc-windows-msvc`, `x86_64-apple-darwin`) are correct supported targets.
- The Node.js comparison table is accurate; modern Node.js does support ESM and a built-in test runner, but the post fairly characterizes Deno as having these as native, default behaviors.
