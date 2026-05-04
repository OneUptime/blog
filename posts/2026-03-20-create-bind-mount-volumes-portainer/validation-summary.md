# Validation Summary: How to Create Bind Mount Volumes in Portainer

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Portainer (volume management UI)
- Docker (named volumes, bind mounts)
- Docker `local` volume driver with tmpfs, NFS, and CIFS/SMB backends
- Linux filesystems (NFS v4, CIFS/SMB)
- Tar (volume backup)

## Sources Consulted
- Docker `docker volume create` reference: https://docs.docker.com/reference/cli/docker/volume/create/
- Docker `docker run` reference (bind mounts and `-v` syntax): https://docs.docker.com/reference/cli/docker/container/run/
- Docker `docker volume prune` / `ls` reference: https://docs.docker.com/reference/cli/docker/volume/
- Docker `docker system df` reference: https://docs.docker.com/reference/cli/docker/system/df/
- Docker `local` driver options (tmpfs / NFS / CIFS via `--opt type=...`): https://docs.docker.com/engine/storage/volumes/
- Linux `mount.nfs` / `mount.cifs` man pages for option syntax (`addr`, `vers`, `username`, `password`, `domain`)
- Portainer Volumes documentation: https://docs.portainer.io/user/docker/volumes

## Issues Found
No technical issues found.

- `docker volume create` invocations are syntactically correct, including `--driver local` with `--opt type=tmpfs|nfs|cifs`, `--opt device=...`, and `--opt o=...`.
- NFS option string `addr=...,rw,vers=4` and `device=:/exports/mydata` follow the correct local-driver/NFS conventions.
- CIFS option string `addr=...,username=...,password=...,domain=...` and `device=//server/share` are valid.
- Bind mount `-v /host/path:/container/path` and `:ro` modifier are correct.
- Backup pattern using `alpine` + `tar czf` is the standard documented approach.
- `docker volume ls -f dangling=true`, `docker volume prune`, and `docker system df -v` are all valid current commands.

## Review Notes
- The tmpfs example uses a named volume backed by the `local` driver with `type=tmpfs`. This works, though for ephemeral in-container scratch space the more common pattern is `docker run --tmpfs /path` or `--mount type=tmpfs,...`. Both are valid; the post's choice fits the "named volume" framing.
- Storing the CIFS password directly in `--opt o=...` is functional but, in production, a credentials file (`credentials=/path`) is generally preferred. Out of scope for this post.
- The post focuses primarily on CLI examples; the Portainer UI workflow is only briefly referenced. The CLI commands shown are equally applicable when a Portainer-managed Docker host is targeted, so the content remains accurate to the title.
