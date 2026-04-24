# Validation Summary: How to Set Up Portainer Stacks for Home Server Applications on NAS

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Compose YAML
- NAS-hosted Docker deployments
- Jellyfin
- Radarr
- Sonarr
- Prowlarr
- Home Assistant
- Eclipse Mosquitto
- Nextcloud
- Redis
- MariaDB

## Sources Consulted
- Portainer Docs, "Add a new stack": https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Docs, "Inspect or edit a stack": https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer Docs, "Docker Compose files including build steps fail": https://docs.portainer.io/faqs/known-issues/docker-compose-files-including-build-steps-fail
- Docker Docs, "Version and name top-level elements": https://docs.docker.com/reference/compose-file/version-and-name/
- Jellyfin Docs, "Container": https://jellyfin.org/docs/general/installation/container/
- LinuxServer.io, "radarr": https://docs.linuxserver.io/images/docker-radarr/
- LinuxServer.io, "sonarr": https://docs.linuxserver.io/images/docker-sonarr/
- LinuxServer.io, "prowlarr": https://docs.linuxserver.io/images/docker-prowlarr/
- Home Assistant Docs, "Alternative installation methods": https://www.home-assistant.io/installation/alternative/
- Docker Hub, "eclipse-mosquitto - Official Image": https://hub.docker.com/_/eclipse-mosquitto/
- Docker Hub, "nextcloud - Official Image": https://hub.docker.com/_/nextcloud/
- Docker Hub, "mariadb - Official Image": https://hub.docker.com/_/mariadb

## Issues Found
- The introduction overstated Portainer stack support as "full Docker Compose support". I changed this to a narrower, accurate description because Portainer documents stack deployment caveats and environment-specific limitations.
- The deployment-method list used inaccurate Portainer UI terminology. I changed `Repository` to `Git repository` and `Template` to `Custom template` to match the documented stack creation options.
- All Compose examples used the top-level `version` field. I removed it because current Docker Compose documentation marks `version` as obsolete and only kept for backward compatibility.
- The Mosquitto example exposed port `9001` without showing WebSocket listener configuration, and it mounted `/mosquitto/config` without clarifying that a `mosquitto.conf` file must exist there. I removed the unused `9001` port mapping and added a note that the config file must be present before first start.
- The Nextcloud example defined a Redis container but did not configure Nextcloud to use it. I added `REDIS_HOST=nextcloud-redis` and included Redis in `depends_on` so the stack matches the comment claiming Redis is used for caching/file-locking support.
- The MariaDB service used `MYSQL_*` variables even though the current MariaDB official image documents `MARIADB_*` variables. I updated the database service to the documented variable names.
- The GitOps section said updates happen automatically "on commits". I corrected this to explain that Portainer GitOps updates are configured through polling or webhook triggers.
- The update section implied `Pull and redeploy` is the universal stack-update path. I corrected it to distinguish Git-deployed stacks from stacks created in the web editor or by upload.
- The NAS path convention section presented `/volume1/...` as generic NAS layout. I clarified that this is a Synology-style convention and that other NAS platforms use different base paths.

## Review Notes
- The examples still use moving tags such as `latest` and `stable`. These are technically valid, but pinning specific image versions would make updates more predictable.
- The Home Assistant container example is valid as written, but some integrations require extra device mappings or D-Bus access beyond the minimal example shown.
