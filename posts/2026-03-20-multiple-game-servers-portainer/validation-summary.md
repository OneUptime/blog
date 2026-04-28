# Validation Summary: How to Manage Multiple Game Servers with Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Portainer (stacks, Edge Jobs)
- Docker / Docker Compose v2
- Game servers: Minecraft (PaperMC via itzg/minecraft-server), Valheim, CS2, Factorio, ARK
- Prometheus (with Docker service discovery)
- Grafana
- Uptime Kuma
- cAdvisor
- RCON / `rcon-cli`
- Bash scripting

## Sources Consulted
- [Minecraft Wiki — Server.properties](https://minecraft.wiki/w/Server.properties)
- [Minecraft Wiki — Commands/whitelist](https://minecraft.wiki/w/Commands/whitelist)
- [Minecraft Wiki — Commands/say](https://minecraft.wiki/w/Commands/say)
- [itzg/docker-minecraft-server documentation](https://docker-minecraft-server.readthedocs.io/en/latest/variables/)
- [Factorio Wiki — Multiplayer](https://wiki.factorio.com/Multiplayer)
- [Valheim Dedicated Servers Guide](https://www.valheimgame.com/support/a-guide-to-dedicated-servers/)
- [CS2 Dedicated Servers (Valve Developer Community)](https://developer.valvesoftware.com/wiki/Counter-Strike_2/Dedicated_Servers)
- [ARK Dedicated Server Setup (ark.wiki.gg)](https://ark.wiki.gg/wiki/Dedicated_server_setup)
- [Prometheus configuration — docker_sd_configs](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#docker_sd_config)
- [Docker Compose Deploy Specification](https://docs.docker.com/reference/compose-file/deploy/)
- [Portainer Edge Jobs documentation](https://docs.portainer.io/user/edge/jobs)

## Issues Found

1. **ARK port list was incorrect.** The architecture overview and resource table listed `7777, 27015, 32330`. Port `32330` is not an ARK default — the ARK dedicated server uses UDP `7777` (game), UDP `7778` (peer/raw), and UDP `27015` (Steam query). Updated both the architecture diagram and the resource allocation table to `7777, 7778, 27015`.

2. **Prometheus configuration could not work as written.** The `prometheus.yml` example combined `static_configs` with `relabel_configs` referencing `__meta_docker_container_label_game_server`. The `__meta_docker_*` labels are only populated by `docker_sd_configs`, not by static targets, so the `keep` action would have dropped every target. Changed the scrape config to use `docker_sd_configs` with a Unix socket, which makes the label-based keep filter actually functional.

3. **Minecraft `broadcast` command does not exist.** The daily-restart script invoked `rcon-cli "broadcast ..."`, but vanilla Minecraft (and PaperMC by default) use `/say` for broadcasting messages — `/broadcast` was removed in Java Edition Classic 0.0.16a_01. Replaced with `say`.

## Review Notes
- The `deploy.resources.limits` block in the Compose file is honored by modern Docker Compose v2 outside of Swarm, so the example will work for readers using a current Docker installation. Older Compose v1 users would need `--compatibility`, but Compose v1 is end-of-life.
- Portainer Edge Jobs are still listed as a beta feature limited to Docker Standalone environments and require Edge Compute to be enabled. The post does not call out the beta status, but the feature works as described for the supported scope.
- The maintenance script loops `rcon-cli save-all` over `minecraft valheim cs2`. Only the Minecraft container will respond to that exact command; Valheim and CS2 use different RCON commands. The script tolerates this with `2>/dev/null || true`, so it is functionally harmless, but a future revision could split per-game commands.
- For CS2, port `27015` is correct for the primary game/query port; running RCON or SourceTV would additionally require `27020`/`27017`.
- Valheim's `2456-2458` range covers the game, Steam query, and Steam communication ports.
