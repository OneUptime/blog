# Validation Summary: How to Deploy a Rust Game Server via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker CLI
- didstopia/rust-server Docker image
- Rust dedicated server
- Oxide/uMod
- UFW firewall
- Alpine Linux backup container

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services reference for ports, command, environment, healthcheck, logging, volumes, and restart fields: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI logs reference: https://docs.docker.com/reference/cli/docker/container/logs/
- Portainer stack deployment documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer container details documentation: https://docs.portainer.io/user/docker/containers/view
- didstopia/rust-server README: https://github.com/Didstopia/rust-server
- didstopia/rust-server Dockerfile and startup scripts: https://github.com/Didstopia/rust-server/blob/master/Dockerfile and https://github.com/Didstopia/rust-server/blob/master/start_rust.sh
- didstopia/rust-server RCON helper: https://github.com/Didstopia/rust-server/blob/master/rcon_app/app.js
- Facepunch Rust dedicated server documentation: https://wiki.facepunch.com/rust/Creating-a-server
- Ubuntu UFW manpage: https://manpages.ubuntu.com/manpages/xenial/man8/ufw.8.html

## Issues Found
- The post description claimed automatic wipes, but the tutorial configured backups rather than wipes. Changed the description to "automatic backups."
- The firewall prerequisite and UFW command used Docker-style host/container port notation and combined multiple port/protocol rules in one command. Updated the prerequisites and UFW commands to open separate `28015/udp`, `28017/udp`, and `28016/tcp` rules.
- The Compose example used the obsolete top-level `version` field. Removed it to align with the current Compose Specification.
- The Compose `ports` entry combined two port mappings into one string, which is not valid Compose short syntax. Split it into separate mappings and added the Rust query port mapping.
- The Rust data volume was mounted at `/game-data`, but the didstopia image stores Rust data under `/steamcmd/rust`. Updated the server and backup mounts and backup commands to use `/steamcmd/rust`.
- The Compose `environment` block was a single invalid scalar containing multiple assignments. Replaced it with a valid mapping and added `RUST_SERVER_QUERYPORT` plus a non-default `RUST_RCON_PASSWORD`.
- The backup service command used shell dollar escaping that is not correct for Compose interpolation. Replaced it with an explicit `/bin/sh -c` command list and `$$` escaping.
- The automatic update snippet used unsupported generic variables (`AUTO_UPDATE`, `AUTO_REBOOT`, and `CRON_AUTO_UPDATE`) for the didstopia image. Replaced them with documented didstopia variables: `RUST_UPDATE_CHECKING`, `RUST_UPDATE_BRANCH`, and `RUST_OXIDE_UPDATE_ON_BOOT`.
- The Docker logs command placed options after the container name. Reordered it to the documented `docker logs -f --tail 100 game-server` form.
- The administration section used `docker attach` and a non-existent `/restart-server.sh`. Replaced those examples with the image's documented `rcon` helper and a save/quit flow that works with the Compose restart policy.

## Review Notes
- Docker was not installed in the review environment, so `docker compose config` could not be run. The YAML snippets were parsed successfully with PyYAML.
- The healthcheck remains a no-op (`true`). It is syntactically valid, but a future improvement would be to replace it with a real Rust/RCON readiness check.
- Port `28082/tcp` is needed only if Rust+ companion app support is required; the post does not configure or claim Rust+ support.
