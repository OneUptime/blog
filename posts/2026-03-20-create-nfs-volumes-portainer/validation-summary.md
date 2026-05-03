# Validation Summary: How to Create NFS Volumes in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker volumes (local driver)
- NFS (Network File System) — versions 3 and 4
- CIFS / SMB (Windows shares)
- tmpfs in-memory volumes
- Portainer (volume management UI)
- Docker bind mounts
- Alpine Linux container (used for backup)

## Sources Consulted
- Docker `docker volume create` reference: https://docs.docker.com/reference/cli/docker/volume/create/
- Docker `docker volume ls` reference: https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker `docker volume prune` reference: https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker `docker system df` reference: https://docs.docker.com/reference/cli/docker/system/df/
- Docker storage / volumes documentation: https://docs.docker.com/engine/storage/volumes/
- Linux `nfs(5)` man page (mount options including `vers`/`nfsvers`)
- Linux `mount.cifs(8)` man page (CIFS mount options)
- Portainer Volumes documentation: https://docs.portainer.io/user/docker/volumes

## Issues Found
No technical issues found.

- The NFS example uses `--opt type=nfs --opt o=addr=...,rw,vers=4 --opt device=:/exports/mydata` — this is a valid form. Equivalent alternatives (`type=nfs4` or `nfsvers=4`) also work; the variant in the post is correct.
- The tmpfs example with `--opt type=tmpfs --opt device=tmpfs --opt o=size=100m` matches the canonical Docker docs example.
- The CIFS/SMB example correctly puts credentials and `addr` under `--opt o=` and the share path under `--opt device=//server/share`.
- Bind mount, backup, and prune commands are all syntactically correct.
- `docker volume ls -f dangling=true`, `docker volume prune`, and `docker system df -v` are all current, supported commands.

## Review Notes
- The post title focuses on Portainer but the body is mostly Docker CLI commands. This is acceptable because Portainer's "Create volume" UI exposes the same `--driver` / `--opt` fields, so the CLI knowledge transfers directly. A future revision could add a brief mapping ("Driver" → `--driver`, "Driver options" → `--opt`) to make the Portainer connection more explicit.
- The CIFS example embeds `password=pass` inline. This works but for production it is safer to use `credentials=/path/to/file` referencing a root-owned credentials file. Worth mentioning as a security note in a future update; not a technical error.
- NFS shares require the host kernel to have NFS client support (`nfs-utils` / `nfs-common` installed) — the post does not state this prerequisite. Not incorrect, but worth a brief note for readers troubleshooting mount failures.
- The `dangling=true` filter for `docker volume ls` lists volumes not referenced by any container; this is still supported in current Docker versions.
