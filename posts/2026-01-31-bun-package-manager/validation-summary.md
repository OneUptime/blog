# Validation Summary: How to Use Bun as a Package Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bun (package manager)
- npm
- yarn
- pnpm
- bunfig.toml configuration
- GitHub Actions CI/CD
- Workspaces / monorepos
- npm registry / GitHub Packages

## Sources Consulted
- Bun lockfile docs: https://bun.sh/docs/install/lockfile
- Bun `bun add` docs: https://bun.sh/docs/cli/add
- Bun `bun install` docs: https://bun.sh/docs/cli/install
- Bun `bun publish` docs: https://bun.sh/docs/cli/publish
- Bun `bun pm` docs: https://bun.sh/docs/cli/pm
- Bun workspaces docs: https://bun.sh/docs/install/workspaces
- Bun bunfig.toml reference: https://bun.sh/docs/runtime/bunfig
- Bun v1.2 text lockfile blog post: https://bun.com/blog/bun-lock-text-lockfile
- oven-sh/setup-bun GitHub Action: https://github.com/oven-sh/setup-bun

## Issues Found

1. **Outdated lockfile format (`bun.lockb` → `bun.lock`).** Bun v1.2 (January 2025) changed the default lockfile from the binary `bun.lockb` to the text-based `bun.lock` (JSONC). The post (dated 2026-01-31) was written as if the binary format were still the default. Updated the "Understanding the Lockfile Format" section, monorepo file tree, troubleshooting commands, GitHub Actions cache key, benchmark script, best practices list, and conclusion. Added a short migration snippet (`bun install --save-text-lockfile --frozen-lockfile --lockfile-only`) for users coming from older Bun versions.

2. **`bun bun.lockb` command no longer relevant.** The post claimed `bun bun.lockb` prints the lockfile in human-readable YAML. With the text-based `bun.lock` as default, the lockfile is already human-readable, so I replaced this with `cat bun.lock`.

3. **`bunx npm publish` is suboptimal.** Bun ships its own native `bun publish` command (since v1.1.x) which correctly handles `workspace:` and `catalog:` protocols when publishing. Replaced all `bunx npm publish` calls with `bun publish`, and added a `--dry-run` example. Kept `bunx npm login` because Bun does not ship a native login command.

4. **Invalid `[install.registry]` TOML section.** The post defined registry config as `[install.registry]` with `url`/`token` keys — this is not how bunfig.toml works. Per docs, `registry` is an inline value under `[install]` — either a string (`registry = "https://..."`) or an inline table (`registry = { url = "...", token = "..." }`). Fixed both the "Registry Configuration" section and the "Advanced Configuration Options" example.

5. **Invalid bunfig.toml options.** The "Advanced Configuration Options" example included `scripts = true` and `save = true` under `[install]`, neither of which exists. The closest valid option is `ignoreScripts` (negation). Replaced with `ignoreScripts = false`, added the valid `saveTextLockfile` option, and kept `save = true` only under `[install.lockfile]` where it is documented.

6. **Outdated `[run]` config.** The example used `shell = "/bin/bash"` (the valid values are `"bun"` or `"system"`) and `watch = false` (not a valid `[run]` field). Replaced with `shell = "system"` and `silent = false`.

7. **Outdated GitHub Actions versions.** The CI example used `oven-sh/setup-bun@v1` (now v2) and `actions/cache@v3` (now v4), and the cache key hashed `bun.lockb` instead of `bun.lock`. Updated all three.

8. **Misleading default annotation for `install.dev`.** The peer-deps example annotated `dev = true` as "default: true in development". The actual default is simply `true`. Removed the "in development" qualifier.

## Review Notes

- The "25x faster than npm" claim and the comparison numbers in the performance table are consistent with figures Bun has published; actual numbers vary heavily by network and disk. Left as-is since the post itself notes these are typical results.
- The `bun add --optional`, `bun add -d`, `bun add -g`, `bun add github:user/repo`, `bun add lodash@4.17.21` flags and forms are all valid per current docs.
- `bun pm cache`, `bun pm cache rm`, and `bun pm ls` are all valid.
- The `--filter` flag works with both `bun install` and `bun run`, as the post describes.
- `bun install --frozen-lockfile`, `--offline`, `--force`, and `--yarn` are all valid current flags.
- Bun now also offers `bun ci` (equivalent to `bun install --frozen-lockfile`) as a CI-friendly alias — not mentioned in the post but worth being aware of for future updates.
- Since Bun v1.3.2, the default linker for new workspaces changed to `"isolated"` (pnpm-style); the post does not mention linker strategies, which is fine for a beginner-focused guide but worth noting for a future update.
