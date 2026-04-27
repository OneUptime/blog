# Validation Summary: How to Deploy a Palworld Server via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Docker management UI)
- Palworld dedicated server
- Docker / Docker Compose
- `thijsvanloef/palworld-server-docker` image
- UFW (Uncomplicated Firewall)
- Alpine Linux (for backup container)

## Sources Consulted
- thijsvanloef/palworld-server-docker GitHub repo: https://github.com/thijsvanloef/palworld-server-docker
- thijsvanloef/palworld-server-docker README (env var reference): https://github.com/thijsvanloef/palworld-server-docker/blob/main/README.md
- Docker Compose specification (port mapping list syntax, environment variable mapping syntax, `$$` escape behavior)
- UFW manual (port allow syntax — single port vs port range)

## Issues Found

1. **Invalid Docker Compose port mapping syntax.** The original `- "8211:8211/udp 27015:27015/udp"` placed two port mappings inside one quoted string, which is not valid Compose. Replaced with two separate list items: `"8211:8211/udp"` and `"27015:27015/udp"`.

2. **Invalid environment block (not valid YAML).** The original `environment: PLAYERS=16 SERVER_PASSWORD=secret MULTITHREADING=true COMMUNITY=false` put four key/value pairs on one line, which YAML cannot parse. Rewrote each variable on its own line using the map form (`KEY: value`).

3. **Wrong volume mount path for the Palworld server.** The post mounted the named volume at `/game-data`, but the `thijsvanloef/palworld-server-docker` image stores its game data at `/palworld`. Changed the `game-server` volume mount to `palworld-data:/palworld`. (The backup container's internal mount path of `/game-data` is fine — it is just a read-only mount point inside the alpine container that pairs with the matching `tar -C /game-data` invocation.)

4. **Invalid `ufw` command.** The original `ufw allow 8211:8211/udp 27015:27015/udp` tried to combine two rules into one command, which UFW does not support. Split into two separate `ufw allow 8211/udp` and `ufw allow 27015/udp` commands.

5. **Wrong Docker Compose escape.** Inside the backup service `command:` block, `\$(date ...)` and `\$DATE` would not have been correctly escaped from Compose interpolation. The documented escape for `$` in Compose values is `$$`. Replaced `\$(` → `$$(` and `\$DATE` → `$$DATE` so the shell inside the container actually receives `$(...)` and `$DATE`.

6. **`game-server` was missing from the `game-net` network.** The Compose file declared `game-net` and attached only the backup service to it, leaving the main service implicitly on the default network. Added the `networks: [game-net]` block to `game-server` for consistency with the declared topology.

7. **Wrong env var names for the auto-update section.** The post used `AUTO_UPDATE`, `AUTO_REBOOT`, and `CRON_AUTO_UPDATE`. The image's actual variables are `AUTO_UPDATE_ENABLED`, `AUTO_REBOOT_ENABLED`, and `AUTO_UPDATE_CRON_EXPRESSION`. Renamed accordingly.

8. **`docker exec game-server /restart-server.sh` references a script that does not exist** in the `thijsvanloef/palworld-server-docker` image. Replaced with `docker restart game-server`, which is the standard way to restart the container and is accurate for this image.

9. **Prerequisites listed ports using Docker port-mapping syntax.** Cleaned up the prerequisites bullet from `8211:8211/udp 27015:27015/udp` to `8211/udp, 27015/udp`, matching how a reader would think about firewall rules.

## Review Notes

- The `healthcheck.test: ["CMD", "true"]` always passes and is effectively a no-op. It is not technically wrong, but provides no real liveness signal. A future improvement would be a real check (e.g., `nc -uz 127.0.0.1 8211` or an RCON status probe).
- The post does not expose the REST API port (`8212/tcp`) or RCON port (`25575/tcp`); that is fine since the post does not enable those features, but if a reader sets `REST_API_ENABLED=true` (the image default) they will need to publish `8212/tcp` to reach it from the host.
- `docker attach game-server` will attach to the container's stdio, but the Palworld server inside this image runs without an interactive console attached to PID 1, so `attach` is unlikely to provide an interactive admin prompt. RCON (`RCON_ENABLED=true` plus `rcon-cli`) would be the proper way to send admin commands. Left as-is since it is not strictly incorrect.
- The backup retention `tail -n +8 | xargs rm -f` keeps the 7 newest archives and deletes the rest — this matches the apparent intent.
- `version: "3.8"` in the Compose file is now obsolete in modern Compose (the top-level `version` key is ignored), but it is still accepted, so leaving it does not break anything.
