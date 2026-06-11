# Validation Summary: How to Create Docker Volumes with NFS

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker volumes
- Docker Compose
- NFS server and client configuration
- Linux mount options
- Ubuntu/Debian package and service management
- Firewall configuration with UFW and firewalld

## Sources Consulted
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: Compose file volumes reference - https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs: Compose version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Linux man-pages: nfs(5) - https://man7.org/linux/man-pages/man5/nfs.5.html
- Linux man-pages: exports(5) - https://man7.org/linux/man-pages/man5/exports.5.html
- Ubuntu Server documentation: Network File System (NFS) - https://ubuntu.com/server/docs/how-to/networking/install-nfs/
- Local Docker CLI help: `docker volume create --help`, `docker run --help`, `docker compose config --help`

## Issues Found
- Removed obsolete `version: "3.8"` from Docker Compose examples. Docker Compose now treats the top-level `version` property as obsolete and ignores it.
- Fixed an invalid YAML command example by changing `command: python -c "while True: pass"` to exec-form syntax. The original scalar parsed incorrectly because of the colon in the Python code.
- Corrected the production guidance for `soft` NFS mounts. Linux `nfs(5)` warns that `soft` can cause silent data corruption, so the post now recommends it only when responsiveness matters more than data integrity.
- Removed `noatime` from NFS mount examples and recommendations. Linux NFS clients do not support atime-related mount options in the same way as local filesystems, and `noatime` has no effect on NFS mounts.
- Removed `no_root_squash` from Docker `driver_opts`. It is an NFS server export option in `/etc/exports`, not a client-side mount option passed by Docker.
- Replaced the shutdown troubleshooting advice that recommended `intr`. Linux `nfs(5)` documents `intr` as a backward-compatibility option that is ignored after kernel 2.6.25.
- Updated the stale-file-handle recovery command from legacy `docker-compose` to current `docker compose`.

## Review Notes
- Docker volume and Compose `driver_opts` examples match the documented local-driver pattern for NFS mounts.
- The examples use `soft` in several places for fail-fast behavior. This is now framed with the correct data-integrity caveat, but future revisions could discuss per-workload tradeoffs in more depth.
- The firewall section is broadly correct, though NFSv4-only deployments often need fewer ports than NFSv3 or `showmount` workflows.
