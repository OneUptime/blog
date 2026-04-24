# Validation Summary: How to Fix Missing Stacks After Portainer Database Corruption - Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- BoltDB / bbolt
- Docker Engine
- Docker Compose
- Docker Swarm
- Shell scripting

## Sources Consulted
- Portainer docs: Encrypting the Portainer database - https://docs.portainer.io/advanced/db-encryption
- Portainer docs: What does Portainer's backup include? - https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer docs: General settings, backup and restore - https://docs.portainer.io/admin/settings/general
- Portainer docs: How can I roll back to a previous version of Portainer? - https://docs.portainer.io/faqs/upgrading/how-can-i-roll-back-to-a-previous-version-of-portainer
- Docker docs: `docker container ls` / `docker ps` reference - https://docs.docker.com/reference/cli/docker/container/ls
- Docker docs: `docker compose ls` reference - https://docs.docker.com/reference/cli/docker/compose/ls/
- Docker docs: `docker stack ls` reference - https://docs.docker.com/reference/cli/docker/stack/ls/
- Docker docs: `docker stack services` reference - https://docs.docker.com/reference/cli/docker/stack/services/
- Docker docs: Live restore - https://docs.docker.com/engine/daemon/live-restore/
- Docker docs: Daemon configuration overview - https://docs.docker.com/engine/daemon/
- Docker docs: `dockerd` reference - https://docs.docker.com/reference/cli/dockerd/
- bbolt package documentation - https://pkg.go.dev/go.etcd.io/bbolt
- bbolt releases - https://github.com/etcd-io/bbolt/releases

## Issues Found
- The introduction said corruption is typically caused by an unclean shutdown. bbolt's documentation describes crash-safe behavior for unfinished transactions, so I softened this to storage/truncation-related causes instead of presenting ordinary unclean shutdowns as a typical direct cause.
- The list of corruption indicators included `bolt: timeout` and a generic Go panic string. `bolt: timeout` is associated with file-lock contention rather than corruption, and the panic example was too generic, so I removed both and kept the more specific database-error examples.
- The database-file section said `md5sum` would "check file integrity". Without a known-good checksum, that command only records a fingerprint, so I changed the wording to say it records a checksum before recovery attempts.
- The `bbolt compact` example used the wrong CLI syntax. I corrected it to `bbolt compact -o repaired.db portainer.db` to match current `bbolt` documentation.
- The restore section mixed two different backup types incorrectly. The post first backed up only `portainer.db`, then later restored from a Portainer-generated `tar.gz` by extracting it manually into `/data`. I changed this to restore a raw `portainer.db` backup in place and added the correct note that Portainer `tar.gz` backups are restored on a fresh instance during initial setup.
- The stack-recovery section only looked for Compose labels even though Portainer manages both Docker Standalone/Compose and Docker Swarm environments. I replaced the commands with `docker compose ls` plus Compose-label inspection for standalone stacks, and `docker stack ls` / `docker stack services` for Swarm stacks.
- The prose said `docker-inspect` instead of the actual command name `docker inspect`. I corrected the command name.
- The prevention section said `live-restore` prevents unclean shutdowns and suggested a Docker systemd `ExecStop` override. Docker documents `live-restore` as keeping standalone containers running during daemon unavailability, not as protection against power loss, and it does not apply to Swarm services. I rewrote this section to use the documented `daemon.json` setting plus `systemctl reload docker`, and removed the misleading `ExecStop` override guidance.
- The conclusion treated `live-restore` as a corruption-prevention measure. I changed it to emphasize backups and reliable storage, with `live-restore` framed only as a way to reduce disruption during Docker daemon restarts for standalone containers.

## Review Notes
- The post is technically valid after the fixes above.
- Portainer backups have two distinct restore paths: raw database-file replacement for `portainer.db` backups, and the documented initial-setup restore flow for Portainer-generated `tar.gz` configuration backups.
- Docker and a live Portainer environment were not exercised in this workspace, so command validation was performed against current official documentation rather than a running local setup.
- The Go toolchain was not installed in this workspace, so `bbolt` CLI verification was done from current package documentation and release docs instead of local `--help` output.
