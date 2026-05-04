# Validation Summary: How to Create CIFS/SMB Volumes in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (volume management UI)
- Docker (volumes, bind mounts, `docker volume`, `docker run`, `docker system df`)
- Docker `local` volume driver with mount-syscall passthrough
- CIFS / SMB (Windows network shares) via `mount.cifs`
- NFS (NFSv4)
- tmpfs

## Sources Consulted
- Docker volumes overview: https://docs.docker.com/engine/storage/volumes/
- `docker volume create` reference: https://docs.docker.com/reference/cli/docker/volume/create/
- `docker volume ls` reference: https://docs.docker.com/reference/cli/docker/volume/ls/
- `docker system df` reference: https://docs.docker.com/reference/cli/docker/system/df/
- `mount.cifs(8)` man page: https://man7.org/linux/man-pages/man8/mount.cifs.8.html

## Issues Found
No technical issues found.

Verified specifically:
- `--opt type=cifs` with `--opt o=addr=...,username=...,password=...,domain=...` and `--opt device=//server/share` is correct — the local driver passes `o=` options through to the mount syscall unaltered, and `addr=`, `username`, `password`, `domain` are all valid `mount.cifs` options.
- The tmpfs example matches the canonical Docker reference example.
- The NFS example uses the correct `type=nfs`, `addr=` in the `o=` list, `vers=4`, and the `:/exports/mydata` device format with leading colon required by the local driver.
- `docker volume ls -f dangling=true`, `docker volume prune`, and `docker system df -v` are all current, non-deprecated commands.
- Bind-mount `-v` syntax including the `:ro` suffix is correct.
- The backup pattern (`docker run --rm -v vol:/source -v $(pwd):/backup alpine tar czf ...`) is the standard idiom.

## Review Notes
- The post title emphasizes Portainer, but the body is almost entirely Docker CLI examples with only a single sentence about navigating the Portainer UI. This is a content-scope observation, not a technical correctness issue, so no changes were made.
- The CIFS example embeds plaintext credentials in the `--opt o=` string. This is technically valid but operationally risky (credentials end up in shell history and `docker volume inspect` output). A future revision could mention `credentials=/path/to/creds-file` as a safer alternative supported by `mount.cifs`.
- For CIFS mounts to actually succeed, the Docker host must have `cifs-utils` installed; the post does not call this prerequisite out, but this is a documentation completeness note, not an inaccuracy.
- `vers=4` for NFS is accepted; `nfsvers=4` is the more explicit alias. Both work.
