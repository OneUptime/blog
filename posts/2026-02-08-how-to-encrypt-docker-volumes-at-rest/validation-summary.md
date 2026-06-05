# Validation Summary: How to Encrypt Docker Volumes at Rest

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker volumes
- Docker Compose
- LUKS
- dm-crypt
- cryptsetup
- eCryptfs
- Linux mount, crypttab, and fstab
- PostgreSQL and Redis container volume usage

## Sources Consulted
- Docker CLI documentation for `docker volume create`: https://docs.docker.com/reference/cli/docker/volume/create/
- Docker Engine storage documentation for volumes: https://docs.docker.com/engine/storage/volumes/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker Compose services reference for `command` behavior: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose environment variables documentation: https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/
- cryptsetup manual: https://man.he.net/man8/cryptsetup
- eCryptfs project documentation: https://www.ecryptfs.org/documentation
- Linux kernel eCryptfs documentation: https://www.kernel.org/doc/html/v4.15/security/keys/ecryptfs.html
- Ubuntu `mount.ecryptfs` manpage: https://manpages.ubuntu.com/manpages/noble/man8/mount.ecryptfs.8.html

## Issues Found
- The `/etc/fstab` example referenced `/mnt/docker-encrypted` without first creating that mount point. Added `sudo mkdir -p /mnt/docker-encrypted` before the fstab entry so the boot-time mount can succeed.
- The `cryptsetup luksFormat` script placed `--batch-mode` after the action and positional arguments. Moved it before `luksFormat` to match documented `cryptsetup [options] action ...` usage.
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it because current Compose uses the Compose Specification schema and documents `version` as obsolete.
- The Redis Compose command expected environment-variable expansion in `command`, but Compose does not automatically run `command` in a shell context. Changed it to run through `sh -c`.
- The Redis example referenced an undefined `REDIS_PASSWORD` value. Updated it to use a Compose secret file and shell command substitution so Redis receives a runtime password value from `/run/secrets/redis_password`.

## Review Notes
The LUKS, Docker local volume driver, external Compose volume, eCryptfs, AES-NI detection, and plaintext canary verification examples are technically consistent with the consulted documentation. Performance percentages are reasonable rules of thumb but are workload- and hardware-dependent; future updates could note that users should benchmark with their own storage and CPU configuration.
