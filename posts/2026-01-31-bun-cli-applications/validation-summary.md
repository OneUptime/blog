# Validation Summary: How to Build CLI Applications with Bun

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bun runtime (CLI features, `Bun.argv`, `Bun.sleep`, `bun build --compile`)
- TypeScript
- Node.js compatibility APIs (`util.parseArgs`, `fs`, `path`, `process`)
- ANSI escape codes for terminal styling
- npm package distribution (`bin`, `files`, `scripts` in package.json)

## Sources Consulted
- [Bun: Parse command-line arguments guide](https://bun.sh/guides/process/argv) — confirms `Bun.argv` is a valid API and that index 0 is the runtime path, index 1 the script path
- [Bun: Single-file executables docs](https://bun.com/docs/bundler/executables) — lists valid `--target` values (`bun-darwin-x64`, `bun-darwin-arm64`, `bun-linux-x64`, `bun-linux-arm64`, `bun-windows-x64`, etc.) and documents which flags are supported with `--compile`
- [Bun: Read from stdin guide](https://bun.com/docs/guides/process/stdin) — confirms `for await (const line of console)` is the idiomatic pattern for line-based stdin in Bun
- [Bun: util.parseArgs reference](https://bun.sh/reference/node/util/parseArgs) — confirms `parseArgs` API shape (options with `type`, `short`, `default`; `strict`, `allowPositionals`)

## Issues Found
- **Unsupported `--public-path` flag with `--compile`.** The "Compiling to a Single Executable" section previously demonstrated `bun build ./cli.ts --compile --outfile my-cli --public-path=./assets --asset-naming=[name].[ext]`. Per the official Bun executables documentation, `--public-path` is explicitly listed as **not supported** by `--compile`. The example would fail or silently ignore the flag, misleading readers about how to embed assets. I replaced the snippet with the documented approach: importing assets via `with { type: "file" }` in source, then using `--asset-naming` to control the embedded filename. `--asset-naming` is supported by `--compile` and the import-attribute syntax is the canonical way to embed assets into a single-file executable.

## Review Notes
- The custom `parseArguments` function in `lib/args.ts` is a simplified illustrative parser rather than a robust one — for example, it treats any short option whose following token starts with `-` as a boolean flag, which can mishandle negative numeric values. This is acceptable as a teaching example but the post could note that real-world projects should prefer `util.parseArgs` or a dedicated package.
- The valid `--target` list shown in the post is correct for the platforms covered. Bun additionally supports `*-baseline`, `*-modern`, `bun-linux-x64-musl`, `bun-linux-arm64-musl`, and `bun-windows-arm64` targets not mentioned here; the omission is a reasonable simplification rather than an error.
- The `Timer` type used by `setInterval`'s return value is a Bun/Node global that works without import in Bun; this is correct.
- All ANSI escape codes used (`\x1b[31m`, `\x1b[?25l`, `\x1b[K`, etc.) are standard and correct.
- The `console` async-iterable pattern (`for await (const line of console)`) is Bun-specific and would not work in Node.js — readers porting code to Node should be aware.
