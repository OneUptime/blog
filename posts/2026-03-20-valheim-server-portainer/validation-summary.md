# Validation Summary: How to Deploy a Valheim Server via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Docker / Docker Compose
- Portainer (stack deployment)
- Valheim dedicated server (via `lloesche/valheim-server` image)
- UFW (Uncomplicated Firewall)
- Alpine Linux (for backup sidecar)
- Bash scripting / `tar` for backups

## Sources Consulted
- [lloesche/valheim-server on Docker Hub](https://hub.docker.com/r/lloesche/valheim-server) - for correct image name, environment variables (`SERVER_NAME`, `WORLD_NAME`, `SERVER_PASS`, `SERVER_PUBLIC`), volume path (`/config`), and ports (2456-2457/udp).
- [Valheim Official Dedicated Server Guide](https://www.valheimgame.com/support/a-guide-to-dedicated-servers/) - for required UDP ports (2456-2458).
- [Docker Compose specification](https://docs.docker.com/compose/compose-file/) - for the correct ports and environment block syntax.
- [UFW man page / Ubuntu documentation](https://manpages.ubuntu.com/manpages/jammy/en/man8/ufw.8.html) - for port-range syntax (`start:end/proto`) and the inability to pass multiple ports/ranges to a single `allow` command.

## Issues Found
1. **Non-existent Docker image** — The post referenced `itzg/valheim:latest`, which is not a published image (itzg publishes `itzg/minecraft-server`, not a Valheim image). Replaced with `lloesche/valheim-server:latest`, the most widely used community-maintained Valheim server image.
2. **Invalid Docker Compose port mapping** — `"2456-2457/udp 2458/udp"` is not a valid Compose short-form port entry; Compose does not accept multiple port mappings inside a single string. Replaced with two separate list items: `"2456-2457:2456-2457/udp"` and `"2458:2458/udp"`.
3. **Invalid UFW command** — `ufw allow 2456-2457/udp 2458/udp` is not valid UFW syntax. UFW accepts one port/range per invocation and requires `:` (not `-`) for ranges. Split into `ufw allow 2456:2457/udp` and `ufw allow 2458/udp`.
4. **Broken `environment:` block** — All four variables were concatenated on a single unquoted line (`VALHEIM_SERVER_NAME=My Server VALHEIM_WORLD_NAME=Dedicated …`), which is neither valid Compose map nor list syntax. Reformatted as a proper YAML map with one key per line and quoted string values.
5. **Wrong environment variable names** — The variables were prefixed `VALHEIM_*`, but the `lloesche/valheim-server` image uses unprefixed names: `SERVER_NAME`, `WORLD_NAME`, `SERVER_PASS`, `SERVER_PUBLIC`. Corrected.
6. **Wrong container volume path** — `/game-data` is not a path exposed by any real Valheim server image. `lloesche/valheim-server` uses `/config` for world and configuration data. Updated the main service mount to `valheim-data:/config` (left the backup sidecar's read-only mount at `/game-data` since it's arbitrary inside that container).
7. **Missing network assignment on `game-server`** — The backup container joined `game-net` but the game server did not, leaving them on different networks despite the declared network. Added `networks: [game-net]` to the game-server service for consistency.
8. **Shell `$` escaping inside Compose `command`** — In a Compose `command:` string, literal `$` must be escaped as `$$` (not `\$`) so Compose does not interpret it as variable interpolation. Replaced `\$` with `\$$` so the `$` survives both Compose interpolation and the outer YAML/shell layer.

## Review Notes
- The `healthcheck` uses `test: ["CMD", "true"]`, which always succeeds and therefore provides no real health signal. It is syntactically valid, so it was left as-is, but a future revision could use a real TCP/port probe against `2457/udp` via something like `ss` or a dedicated probe.
- The post mentions `AUTO_UPDATE`, `AUTO_REBOOT`, and `CRON_AUTO_UPDATE` as environment variables for "many game server images." For `lloesche/valheim-server` specifically, the equivalents are `UPDATE_CRON`, `RESTART_CRON`, and related `*_SCHEDULE` knobs; the generic example is presented as illustrative rather than image-specific, so it was left unchanged.
- `docker attach game-server` and `docker exec game-server /restart-server.sh` in Step 7 are presented as generic/conditional ("if supported") commands. `lloesche/valheim-server` does not ship `/restart-server.sh`, but because the post frames these as optional examples, no correction was made.
- `tail -n +8 | xargs rm -f` keeps the 7 most recent backups; this matches the intent even though the comment doesn't call out the retention count.
- The `lloesche/valheim-server` image requires `SERVER_PASS` to be at least 5 characters; the example `"secret"` satisfies this, but readers should be warned before shortening it.
