# Validation Summary: How to Fix Podman Registry Mirror Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- containers registries.conf
- Container registry mirrors
- Container auth.json
- TOML configuration

## Sources Consulted
- containers/image official `containers-registries.conf(5)` documentation: https://github.com/containers/image/blob/main/docs/containers-registries.conf.5.md
- containers/image official `containers-registries.conf.d(5)` documentation: https://github.com/containers/image/blob/main/docs/containers-registries.conf.d.5.md
- containers/image official `containers-auth.json(5)` documentation: https://github.com/containers/image/blob/main/docs/containers-auth.json.5.md
- Podman official `podman-login(1)` documentation: https://docs.podman.io/en/v5.1.0/markdown/podman-login.1.html
- Podman official `podman-pull(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-pull.1.html
- Podman official `podman-info(1)` documentation: https://github.com/containers/podman/blob/main/docs/source/markdown/podman-info.1.md

## Issues Found
- The post described the old format as INI-style. The official documentation calls it version 1 format and documents it as part of `registries.conf`; I updated the wording and code fence accordingly.
- The registry configuration precedence was inaccurate. I changed it to reflect the documented behavior for per-user main files, system-wide main files, and drop-in directories.
- The short-name section said Podman simply tries registries in order. I updated it to account for short-name resolution modes and interactive prompts.
- The blocked registry section showed two entries with the same `prefix` to both block and redirect Docker Hub. Since matching registry tables are selected/merged by prefix and `blocked = true` forbids matching pulls, I replaced it with a redirect-only example.
- The authentication section implied `podman login` writes to either runtime or persistent auth files by default. I corrected it to state the Linux default runtime auth file and added the documented `--authfile` command for persistent credentials.
- The manual `auth.json` example used a placeholder that looked like a base64-encoded string containing only the username. I replaced it with the base64 value for `username:password`.
- The `podman info --format` command was labeled as listing all configured registries but only prints search registries. I corrected the label and added newline output.
- The migration section showed an old `[registries.mirror]` table, but version 1 format does not support registry mirrors. I removed that table and noted that mirrors must be added in the version 2 format.

## Review Notes
Podman was not installed in the local workspace, so CLI behavior was verified against official Podman documentation instead of local `--help` output. The post remains version-sensitive because distributions may ship different default `registries.conf.d` short-name alias files and short-name modes.
