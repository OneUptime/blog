# Validation Summary: How to Set Up Watchman for File System Events on Ubuntu

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- Watchman (Meta/Facebook file watching service)
- Ubuntu (Linux installation, sysctl, inotify limits)
- Node.js (fb-watchman npm client)
- inotify (Linux kernel file change notification)
- bash / CLI usage

## Sources Consulted
- Watchman official documentation: https://facebook.github.io/watchman/
- Watchman install guide: https://facebook.github.io/watchman/docs/install.html
- Watchman CLI options: https://facebook.github.io/watchman/docs/cli-options.html
- Watchman config docs: https://facebook.github.io/watchman/docs/config.html
- Watchman clockspec: https://facebook.github.io/watchman/docs/clockspec.html
- `since` expression: https://facebook.github.io/watchman/docs/expr/since.html
- `suffix` expression: https://facebook.github.io/watchman/docs/expr/suffix.html
- `find` command: https://facebook.github.io/watchman/docs/cmd/find.html
- `since` command: https://facebook.github.io/watchman/docs/cmd/since.html
- `trigger` command: https://facebook.github.io/watchman/docs/cmd/trigger.html
- GitHub releases: https://github.com/facebook/watchman/releases (verified `watchman-v2024.01.22.00-linux.zip` asset exists)

## Issues Found

1. **Incomplete binary install steps**: The original install commands only copied the `watchman` binary and missed the `lib/*` files that ship in the release zip. Per the official install docs, both `bin/` and `lib/` contents must be copied to `/usr/local/{bin,lib}`. Replaced the `sudo install` lines with `mkdir -p /usr/local/{bin,lib}`, `cp bin/*`, `cp lib/*`, and the correct chmod values (`755` for the binary, `2777` for the run dir) per the official guide.

2. **Invalid `watchman find --since` flag**: The example `watchman find ~/project -- --since 10s` is not valid syntax — the `find` command does not accept a `--since` flag and Watchman does not accept human-readable durations like `10s` as a clock value. Replaced with a valid `watchman find ~/project '*.js'` pattern example.

3. **Invalid `["since", "5m", "mtime"]` expression**: The `since` expression term only accepts a unix timestamp (integer) or a clock string (e.g., `c:1234:567`) — not duration strings like `"5m"`. Replaced the example with `["since", $(($(date +%s) - 300)), "mtime"]` that computes a unix timestamp from 5 minutes ago, and updated the expression-types table to show `["since", 1706000000, "mtime"]` with a corrected description.

4. **`.watchmanconfig` is not user-level**: The post originally instructed readers to create `~/.watchmanconfig`, but the official docs state `.watchmanconfig` is a per-project config placed at the root of the watched directory. Changed the path to `~/project/.watchmanconfig`, updated the surrounding text, and added a note that changes require `watch-del`/`watch` to take effect.

5. **Wrong state directory `~/.watchman/`**: Watchman's default state directory is `<PREFIX>/var/run/watchman/<USER>-state/` (typically `/usr/local/var/run/watchman/$USER-state/`), not `~/.watchman/`. Updated the State Management section and the log-tail command in the Debugging section accordingly.

6. **Bogus `--debug-watchman-version` flag**: The post's "View Watchman logs" command used a flag (`--debug-watchman-version`) that does not exist in Watchman's CLI options. Removed it and kept the correct `tail -f` against the actual log path.

7. **`watchman --foreground watch ~/project`**: The `--foreground` flag is a server option that runs the Watchman service in the foreground — it is not chained with the `watch` client subcommand on the same invocation. Simplified the example to `watchman --foreground`.

## Review Notes

- The pinned `WATCHMAN_VERSION="2024.01.22.00"` is verified to exist on GitHub releases, but as of the validation date (2026-05-17) the latest release is `v2026.05.11.00`. Readers should bump the version when copying the snippet.
- The Ubuntu apt package warning is mild — the official docs explicitly recommend against using distro-supplied packages because they lag on security and performance fixes. The post's phrasing ("usually older version") is accurate but understates the recommendation.
- The build-from-source section uses the `autogen.sh` / `configure` / `make` flow which is still part of the modern process (alongside Cargo), so it is left as-is.
- The `watchman -- trigger` form (with the leading `--` separator) used in the basic trigger example is the documented legacy CLI form, so it is correct and not a typo.
- The Node.js `fb-watchman` example follows the package's documented API (`capabilityCheck`, `watch-project`, `clock`, `subscribe`, `'subscription'` event) and is left unchanged.
