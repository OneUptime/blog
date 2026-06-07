# Validation Summary: How to Use Podman Volumes

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Podman (container engine, rootless and rootful modes)
- Podman volumes (named volumes, bind mounts, tmpfs mounts)
- Podman pods
- SELinux labels (`:z`, `:Z`, `:U`)
- NFS volume driver
- User namespace mapping (`subuid`/`subgid`, `podman unshare`)
- PostgreSQL container (image `postgres:15`)
- MySQL container (image `mysql:8`)
- Bash scripting (backup automation)
- Mermaid diagrams (for illustration only)

## Sources Consulted
- Podman volume create docs: https://docs.podman.io/en/latest/markdown/podman-volume-create.1.html
- Podman pod create docs: https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- Podman volume ls / inspect / rm / prune man pages (docs.podman.io)
- Podman run `-v` / `--volume` mount option documentation
- Podman rootless storage configuration documentation

## Issues Found

1. **Incorrect claim about pod namespace sharing.** The original text stated: *"Pods group containers that share network and storage namespaces."* According to the official `podman pod create` docs, the default shared namespaces in a pod are `ipc`, `net`, and `uts` — mount/storage namespaces are NOT shared by default. Each container in a pod retains its own mount namespace; sharing storage requires mounting the same named volume into multiple containers (which is what the rest of the post correctly demonstrates).
   - **Fix:** Updated the sentence to: *"Pods group containers that share network, IPC, and UTS namespaces by default. Each container still has its own mount namespace, so storage is shared by mounting the same named volume into multiple containers."* This is consistent with the actual code example that follows it (which mounts named volumes per-container).

## Review Notes
- All `podman volume` subcommands (`create`, `ls`, `inspect`, `rm`, `prune`) and their flags (`--opt`, `--label`, `--filter`, `--format`, `--quiet`, `--force`, `--driver`) are accurate.
- The tmpfs example `--opt device=tmpfs --opt type=tmpfs --opt o=size=100m` matches Podman's official documented example pattern.
- The NFS volume example is valid — Podman's local driver passes through to mount(8), and NFS mount options like `addr`, `rw`, `nolock` are correctly formed.
- SELinux label semantics (`:Z` private/exclusive, `:z` shared) and the `:U` chown option are described correctly.
- The `:Z,U` combination in the rootless permissions section is a valid combined mount option syntax.
- Rootful storage path `/var/lib/containers/storage/volumes` and rootless storage path `~/.local/share/containers/storage/volumes/` are both correct.
- The PostgreSQL and MySQL examples use real, current image tags (`postgres:15`, `mysql:8`) and correct environment variables (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`) and correct data directories (`/var/lib/postgresql/data`, `/var/lib/mysql`).
- The `podman ps --filter volume=...` and `podman volume ls --filter dangling=true` filters are both valid.
- The backup-script `find ... -mtime +$RETENTION_DAYS -delete` rotation pattern is correct.
- Minor stylistic note (not a correctness issue): the first code block contains a blank line between the comment and the `podman volume create mydata` command, which is unusual but harmless.
- Version-specific caveat: `postgres:15` was current at time of writing; `postgres:16` and later are now also available, but the example remains functionally accurate as-is.
