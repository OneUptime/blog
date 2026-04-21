# Validation Summary: How to Deploy a Team Fortress 2 Server via Portainer - Tf2

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Team Fortress 2 dedicated server
- cm2network/tf2 Docker image
- Docker Compose
- Docker CLI
- Portainer stacks
- UFW firewall rules
- Alpine Linux backup container

## Sources Consulted
- cm2network/tf2 Docker Hub image documentation for supported environment variables, compose example, persistent data path, and startup update behavior (https://hub.docker.com/r/cm2network/tf2/)
- Docker Compose file reference for `ports`, `environment`, `restart`, `healthcheck`, `logging`, `stdin_open`, `tty`, and service volumes (https://docs.docker.com/reference/compose-file/services/)
- Docker Compose interpolation reference for escaping literal dollar signs with `$$` (https://docs.docker.com/reference/compose-file/interpolation/)
- Docker Compose volumes reference for named volumes and the `name` attribute (https://docs.docker.com/reference/compose-file/volumes/)
- Docker Compose `version` top-level element documentation noting that `version` is obsolete (https://docs.docker.com/reference/compose-file/version-and-name/)
- Docker CLI documentation for `docker logs`, `docker stats`, `docker exec`, `docker attach`, and `docker restart` (https://docs.docker.com/reference/cli/docker/)
- Ubuntu UFW man page for rule syntax and protocol-specific port rules (https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html)
- Portainer documentation for deploying Docker stacks from Compose YAML files (https://docs.portainer.io/sts/user/docker/stacks/add)
- Valve Developer Community Source Dedicated Server documentation for default SRCDS ports (https://developer.valvesoftware.com/wiki/Source_Dedicated_Server)
- Official Team Fortress Wiki dedicated server configuration reference (https://wiki.teamfortress.com/wiki/Dedicated_server_configuration)

## Issues Found

### 1. Firewall command combined two UFW rules incorrectly
**What was wrong:** The post used `ufw allow 27015:27015/udp 27015:27015/tcp`, which combines two protocol-specific rules in one invalid simple-syntax command.
**What was changed:** Replaced it with separate `ufw allow 27015/udp` and `ufw allow 27015/tcp` commands and updated the prerequisite text.
**Why:** UFW's simple syntax accepts a port with an optional protocol per rule.

### 2. Compose YAML used invalid or obsolete syntax
**What was wrong:** The Compose snippet had an obsolete top-level `version`, a single invalid `ports` entry containing both TCP and UDP mappings, and an `environment` value written as one scalar string instead of a map or list.
**What was changed:** Removed the obsolete `version`, split the TCP and UDP port mappings into separate entries, and rewrote environment variables as a YAML map.
**Why:** Current Compose files use the Compose Specification, port bindings are separate entries, and `environment` must be a map or list.

### 3. TF2 image paths and environment variable names were incorrect
**What was wrong:** The post mounted persistent data at `/game-data` and used `SRCDS_MAP`. The `cm2network/tf2` image documents `/home/steam/tf-dedicated` as the server data path and `SRCDS_STARTMAP` as the start map variable.
**What was changed:** Updated the game and backup volume mounts to `/home/steam/tf-dedicated`, changed `SRCDS_MAP` to `SRCDS_STARTMAP`, and updated backup archive names and wording from "world" data to TF2 server files/configuration.
**Why:** The original volume path would not persist the TF2 server data managed by the image.

### 4. Backup command escaped shell variables incorrectly for Compose
**What was wrong:** The backup service used backslash escapes such as `\$DATE`. Compose interpolation requires `$$` to pass a literal dollar sign through to the container command.
**What was changed:** Replaced those references with `$$`, changed the backup service restart policy to `unless-stopped`, and gave the named volumes explicit Docker volume names so the manual `docker run` backup command refers to the same `tf2-data` volume.
**Why:** Without the Compose-specific escaping, variables can be interpolated before the shell runs. The explicit volume name avoids confusion with stack-scoped Compose volume names.

### 5. Update and restart instructions referenced unsupported behavior
**What was wrong:** The post showed `AUTO_UPDATE`, `AUTO_REBOOT`, and `CRON_AUTO_UPDATE` environment variables that are not documented by `cm2network/tf2`, and it referenced a non-documented `/restart-server.sh` script.
**What was changed:** Replaced the unsupported auto-update environment block and restart script with `docker restart game-server`.
**Why:** The image documentation says the server updates on container startup, so restarting the container is the documented update path.

### 6. Configuration step mixed Portainer console use with host Docker commands
**What was wrong:** The post said to access the container console, then showed `docker logs` and `docker stats`, which are host Docker CLI commands, not commands to run inside the TF2 container.
**What was changed:** Clarified that Docker commands are run from the host and added the documented `docker exec -it game-server nano /home/steam/tf-dedicated/tf/cfg/server.cfg` path for editing `server.cfg`.
**Why:** This matches Docker CLI behavior and the `cm2network/tf2` documentation for editing server configuration.

### 7. Description overstated plugin and map management
**What was wrong:** The description claimed custom plugins and map management, but the post deploys `cm2network/tf2:latest`, which is documented as the bare TF2 server image with no third-party plugins.
**What was changed:** Updated the description to focus on persistent storage and backups.
**Why:** The description now matches the actual deployment shown in the post.

## Review Notes
- The `cm2network/tf2` documentation recommends host networking for the game server. The reviewed post keeps explicit TCP/UDP port publishing, which is valid Compose syntax, but host networking may be preferable for some public SRCDS deployments.
- SourceTV uses UDP 27020 by default. The post only opens and publishes 27015 TCP/UDP, which is sufficient for the main game/RCON port but not for SourceTV if it is enabled.
- The healthcheck remains `test: ["CMD", "true"]`, which only proves the healthcheck command can run. A deeper SRCDS query healthcheck would require adding a suitable query tool or custom script and was outside the narrow correction scope.
- Docker is not installed in this workspace, so `docker compose config` could not be run. I validated the YAML block with PyYAML, checked shell snippets with `bash -n`, and reviewed the Compose semantics against the official Docker documentation.
