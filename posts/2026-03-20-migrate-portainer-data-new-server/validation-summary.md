# Validation Summary: How to Migrate Portainer Data to a New Server

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Portainer CE (2.x)
- Docker (containers, volumes, named volume backup pattern)
- BoltDB / bbolt (Portainer's embedded database)
- Alpine Linux (used as a temporary container for tar)
- tar / gzip (archive format)
- scp / rsync (file transfer)
- Ubuntu / Linux server administration

## Sources Consulted
- Portainer official documentation: https://docs.portainer.io/
- Portainer install docs (Docker Standalone): https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer backup/restore guidance: https://docs.portainer.io/admin/settings/backup
- Docker volume backup/restore pattern: https://docs.docker.com/engine/storage/volumes/#back-up-restore-or-migrate-data-volumes
- Docker installation convenience script: https://docs.docker.com/engine/install/ubuntu/ and https://get.docker.com
- Portainer data path inside container is `/data` (confirmed via official run command in install docs)
- BoltDB: https://github.com/boltdb/bolt and the `bbolt` fork at https://github.com/etcd-io/bbolt

## Issues Found
1. **UI navigation path was inaccurate.** The post said: "Go to **Settings > Environments**". In current Portainer CE 2.x, environments are managed from the **Environments** entry in the left sidebar, not under Settings. Fixed to: "Go to **Environments** in the left sidebar". Also corrected the field label from "URL" to "Environment URL", which is the actual label shown in the Portainer UI for agent endpoints.

## Review Notes
- The Docker run command exposes ports `9000` (HTTP) and `9443` (HTTPS). This works, but the current official Portainer install command leads with `9443` (HTTPS) and `8000` (Edge agent TCP tunnel), and treats `9000` as legacy HTTP. The post's command is still functional and is a common configuration in the wild, so it was left unchanged. Future revisions could mention `8000` for users running Edge agents.
- The list of directories under `portainer_data` (`portainer.db`, `certs/`, `compose/`, `docker_config/`) is accurate but not exhaustive. Real installations also typically contain `bin/` (helper binaries), `tls/` (agent/Edge TLS material), `chisel/` (Edge tunnel data), and `backups/`. The omitted directories don't affect the migration procedure, since the tar archive captures everything under `/data` regardless.
- Stopping Portainer before backing up the BoltDB file is the correct guidance — BoltDB uses an mmap'd file and an in-flight backup against a running container risks an inconsistent snapshot.
- The `docker run --rm -v portainer_data:/data -v $(pwd):/backup alpine tar czf ...` pattern is the canonical Docker-documented way to back up a named volume and works correctly here.
- The `curl -fsSL https://get.docker.com | sh` install method is the official Docker convenience script and is appropriate for a tutorial; production users may prefer the apt repository method, but that's a stylistic preference, not an error.
