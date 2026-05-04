# Validation Summary: How to Configure Volume Drivers in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (UI navigation)
- Docker volumes / Docker CLI
- Docker `local` volume driver with type options (tmpfs, NFS, CIFS/SMB)
- Bind mounts
- tar (backup)

## Sources Consulted
- Docker volume CLI reference: https://docs.docker.com/reference/cli/docker/volume/create/
- Docker storage volumes guide: https://docs.docker.com/engine/storage/volumes/
- Docker `docker run` `-v` flag reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker `docker system df` reference: https://docs.docker.com/reference/cli/docker/system/df/
- Linux kernel NFS mount options (man 5 nfs)
- Linux kernel CIFS mount options (man 8 mount.cifs) — confirms `addr`/`ip` are valid options
- Portainer documentation on Volumes management

## Issues Found
No technical issues found. All commands were verified:
- `docker volume create` syntax with `--driver local` and `--opt` flags is correct.
- The tmpfs options (`type=tmpfs`, `device=tmpfs`, `o=size=100m`) are valid for the local driver.
- The NFS options (`type=nfs`, `o=addr=...,rw,vers=4`, `device=:/exports/...`) follow the correct pattern.
- The CIFS options (`type=cifs`, `o=addr=...,username=...,password=...,domain=...`, `device=//server/share`) are valid; `addr` is an accepted CIFS mount option.
- Bind mount `-v /host:/container[:ro]` syntax is correct.
- Backup pattern using `alpine` + `tar czf` with `$(pwd)` and `$(date +%Y%m%d)` is correct.
- `docker volume ls -f dangling=true`, `docker volume prune`, and `docker system df -v` are all valid commands.

## Review Notes
- The title and intro mention Portainer, but the body is primarily Docker CLI. This is a content-scope observation, not a technical correctness issue, so no changes were made.
- For CIFS mounts, users should be aware that putting plaintext credentials in `--opt o=...` exposes them in `docker inspect`/process listings; using a credentials file is generally preferred in production. This is a security best-practice note rather than a correctness issue.
- For NFS volumes using NFSv4, the export path on `device=` should match the NFS server's export configuration; the example as written is syntactically valid.
