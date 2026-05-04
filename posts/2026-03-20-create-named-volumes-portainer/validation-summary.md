# Validation Summary: How to Create Named Volumes in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (UI navigation)
- Docker volumes (named volumes, tmpfs, NFS, CIFS/SMB)
- Docker bind mounts
- Docker CLI (`docker volume`, `docker run`, `docker system df`)
- tar (for volume backup)

## Sources Consulted
- Docker `docker volume create` reference: https://docs.docker.com/reference/cli/docker/volume/create/
- Docker storage / volumes documentation: https://docs.docker.com/engine/storage/volumes/
- Docker `docker volume prune` reference: https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker `docker system df` reference: https://docs.docker.com/reference/cli/docker/system/df/
- Linux `mount.nfs(8)` and `mount.cifs(8)` man pages for valid mount option names
- Portainer Volumes documentation: https://docs.portainer.io/user/docker/volumes

## Issues Found
No technical issues found. All commands were verified against the official Docker CLI reference and Linux mount option documentation:

- `docker volume create myapp-data` is the correct minimal syntax for a named volume.
- The tmpfs example (`--driver local --opt type=tmpfs --opt device=tmpfs --opt o=size=100m`) matches accepted local-driver syntax.
- The NFS example uses valid options; `vers=4` is accepted as an alias for `nfsvers=4` by the kernel NFS client.
- The CIFS example's `username`, `password`, `domain`, and `addr` options are valid `mount.cifs` options, and `device=//server/share` is the correct UNC form.
- The bind mount syntax (`-v /host:/container[:ro]`) is correct.
- The backup pattern (`docker run --rm -v vol:/source -v $(pwd):/backup alpine tar czf ...`) is the standard, working approach.
- `docker volume ls -f dangling=true`, `docker volume prune`, and `docker system df -v` are all valid current commands.

## Review Notes
- The post is framed as a Portainer guide but is almost entirely Docker CLI commands; only the first section actually mentions Portainer's UI. This is a stylistic/scope observation, not a technical error.
- For CIFS volumes, embedding the password in `--opt o=...` exposes it via shell history and `docker volume inspect`. A future revision could mention `credentials=/path/to/file` as a safer alternative, but the shown syntax is technically valid.
- For NFS, modern Docker docs more commonly use `nfsvers=4` rather than `vers=4`. Both work today; if NFS client behavior ever diverges, switching to `nfsvers=` would be the safer choice.
- `docker volume ls -f dangling=true` still works but Docker considers any volume not currently in use as "dangling" — note that since Docker 23+, `docker volume prune` only removes anonymous volumes by default and requires `-a` / `--all` to also remove unused named volumes. The post's `docker volume prune` line is correct as written but readers should be aware of this default.
