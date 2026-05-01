# Validation Summary: How to Manage Docker Containers on a NAS with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Portainer Stacks
- Docker volumes and bind mounts
- Docker networking
- MariaDB container image
- WordPress container image

## Sources Consulted
- Portainer Documentation: Updating on Docker Standalone — https://docs.portainer.io/start/upgrade/docker
- Portainer Documentation: Add a new container — https://docs.portainer.io/user/docker/containers/add
- Portainer Documentation: Add a new stack — https://docs.portainer.io/user/docker/stacks/add
- Portainer Documentation: Volumes — https://docs.portainer.io/user/docker/volumes
- Portainer Documentation: Add a new volume — https://docs.portainer.io/user/docker/volumes/add
- Portainer Documentation: View container logs — https://docs.portainer.io/user/docker/containers/logs
- Portainer Documentation: View container statistics — https://docs.portainer.io/user/docker/containers/stats
- Portainer Documentation: Access a container's console — https://docs.portainer.io/user/docker/containers/console
- Portainer Documentation: Add a new network — https://docs.portainer.io/user/docker/networks/add
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose Deploy Specification — https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Networks — https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: docker container exec — https://docs.docker.com/engine/reference/commandline/exec
- Docker Docs: Logs and metrics — https://docs.docker.com/engine/logging/
- Docker Docs: docker image prune — https://docs.docker.com/reference/cli/docker/image/prune/
- Docker Official Image docs: WordPress — https://hub.docker.com/_/wordpress
- Docker Official Image docs: MariaDB — https://hub.docker.com/_/mariadb

## Issues Found
- The post said Portainer should be accessed at `http://<nas-ip>:9000` after installation. I updated this to `https://<nas-ip>:9443` by default and noted that `9000` is only available if the legacy HTTP port was explicitly exposed, matching current Portainer documentation.
- The stack example used top-level `version: "3.8"`. I removed it because the current Compose specification marks the top-level `version` field as obsolete.
- The MariaDB service example used `MYSQL_*` variables with the `mariadb:10.11` image. I updated them to the documented `MARIADB_*` variables for the MariaDB official image.
- The NAS path examples used Synology-style `/volume1/...` paths while the article presents itself as a general NAS guide. I replaced those with generic `/path/on/your/nas/...` examples so the instructions are technically correct across vendors.
- The log command example placed the container name before the options. I reordered it to the documented `docker logs --tail 100 --follow <container-name>` form.
- The console section implied Bash was the default equivalent for Portainer console access. I updated it to reflect that Portainer lets you choose the shell, added `/bin/ash` for Alpine, and changed the CLI example to `docker exec -it <container> /bin/sh` or the selected shell.
- The volume usage section overstated what Portainer can always determine for Docker volumes. I reworded it to align with Portainer's documentation about `unused` labels and limited visibility for external volumes.
- The resource-limits paragraph said to "Set limits in Portainer" while showing a Compose snippet. I clarified that the limits are being declared in a stack Compose file deployed through Portainer.

## Review Notes
- Portainer documentation currently defaults the UI/API to HTTPS on port `9443`; `9000` remains a legacy HTTP option only when explicitly published.
- Docker Compose still accepts the top-level `version` key for backward compatibility, but Docker documents it as obsolete and warns when it is used.
- Portainer documents a historical Docker Standalone issue affecting some Compose resource limits in versions `2.14.0` through `2.14.2`; it was fixed in `2.15.0` and later: https://docs.portainer.io/2.33-lts/faqs/known-issues/resource-limits-in-a-compose-file-are-not-applying
- All remaining commands, UI flows, and configuration examples reviewed were consistent with current Portainer and Docker documentation.
