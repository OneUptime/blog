# Validation Summary: How to Deploy a Counter-Strike 2 Server via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Counter-Strike 2 dedicated server (cm2network/cs2 Docker image)
- Portainer (container management UI)
- Docker / Docker Compose
- UFW (Uncomplicated Firewall)
- Alpine Linux (used in backup sidecar)
- Bash / shell scripting

## Sources Consulted
- cm2network/cs2 Docker Hub page: https://hub.docker.com/r/cm2network/cs2
- Upstream image README (joedwards32/CS2): https://github.com/joedwards32/CS2
- Docker Compose reference (ports, environment, variable interpolation): https://docs.docker.com/compose/compose-file/
- UFW manual: `man ufw` (one port/range and one protocol per `ufw allow` rule)
- Valve / SteamCMD CS2 dedicated server documentation (default port 27015 TCP+UDP)

## Issues Found

1. **Invalid `ufw allow` syntax (Step 1).** The original command `ufw allow 27015:27015/udp 27015:27015/tcp` is not valid — `ufw allow` accepts one port/range and protocol per invocation. Replaced with two separate `ufw allow 27015/udp` and `ufw allow 27015/tcp` rules.

2. **Invalid Docker Compose `ports` mapping (Step 2).** The single string `"27015:27015/udp 27015:27015/tcp"` is not a valid port mapping. Split into two list entries: `"27015:27015/udp"` and `"27015:27015/tcp"`.

3. **Invalid `environment:` block syntax (Step 2).** The original packed three `KEY=VALUE` pairs onto one line under `environment:`, which is neither valid map-form nor list-form YAML for Compose. Converted to map form with one key per line.

4. **Wrong env var name `CS2_TOKEN` (Step 2).** The cm2network/cs2 image (and upstream joedwards32/CS2) uses `SRCDS_TOKEN` for the Game Server Login Token. Renamed `CS2_TOKEN` → `SRCDS_TOKEN`.

5. **Wrong volume mount path `/game-data` for the CS2 container (Step 2).** The cm2network/cs2 image installs the dedicated server at `/home/steam/cs2-dedicated/`; mounting the volume at `/game-data` would not persist game data. Updated the game-server's volume mount target to `/home/steam/cs2-dedicated`. The backup sidecar still mounts the same named volume read-only at `/game-data` for tar convenience, which is fine since each container can mount the volume at its own path.

6. **Broken shell variable escaping in backup `command:` (Step 2).** The original used `\$(date ...)` and `\$DATE`, which Compose still tries to interpolate at parse time, leaving the script broken. In Compose YAML, the correct way to pass a literal `$` to the container shell is `$$`. Replaced `\$` with `$$` throughout the inline backup loop.

## Review Notes
- Step 5 ("Configure Automatic Updates") shows generic env vars `AUTO_UPDATE`, `AUTO_REBOOT`, `CRON_AUTO_UPDATE` that are not supported by cm2network/cs2. The section is prefaced with "Many game server images support automatic updates" which keeps the wording generic, but readers should know cm2network/cs2 auto-updates on container start — restarting the container is the way to pull a new game build, not these env vars.
- Step 7 references `docker attach game-server` and a `/restart-server.sh` script with the caveat "(if supported)". Neither is meaningfully supported by cm2network/cs2 (admin is via RCON; the image has no `restart-server.sh`). The hedging language keeps the section technically defensible, but it is not directly applicable to the chosen image.
- Healthcheck `test: ["CMD", "true"]` is a no-op that always passes — syntactically valid but provides no real liveness signal. Acceptable as a placeholder.
- `version: "3.8"` at the top of the compose file is obsolete in modern Compose v2 (it is ignored, not erroring). Left as-is since it still works.
- The backup sidecar joins `game-net`, but the `game-server` does not. Inconsistent but not harmful here, since the sidecar only touches the shared volume, not the network.
