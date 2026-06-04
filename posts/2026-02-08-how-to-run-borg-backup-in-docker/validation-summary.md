# Validation Summary: How to Run Borg Backup in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- BorgBackup
- Borg server mode over SSH
- Borg repository encryption
- Borg deduplication and compression
- Docker
- Docker Compose
- OpenSSH key authentication
- Cron-based automation
- OneUptime TCP monitoring

## Sources Consulted
- BorgBackup official project overview: https://www.borgbackup.org/borgbackup/
- BorgBackup official `borg init` documentation: https://borgbackup.readthedocs.io/en/stable/usage/init.html
- BorgBackup official `borg create` documentation: https://borgbackup.readthedocs.io/en/stable/usage/create.html
- BorgBackup official `borg serve` documentation: https://borgbackup.readthedocs.io/en/stable/usage/serve.html
- BorgBackup official repository hosting documentation: https://borgbackup.readthedocs.io/en/stable/deployment/hosting-repositories.html
- BorgBackup official `borg prune` documentation: https://borgbackup.readthedocs.io/en/stable/usage/prune.html
- BorgBackup official `borg check` documentation: https://borgbackup.readthedocs.io/en/stable/usage/check.html
- BorgBackup official `borg list`, `borg info`, `borg extract`, and `borg mount` documentation: https://borgbackup.readthedocs.io/en/stable/usage/list.html, https://borgbackup.readthedocs.io/en/stable/usage/info.html, https://borgbackup.readthedocs.io/en/stable/usage/extract.html, https://borgbackup.readthedocs.io/en/stable/usage/mount.html
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- nold360/borgserver image documentation on Docker Hub: https://hub.docker.com/r/nold360/borgserver

## Issues Found
- The original Docker Compose section used a borgmatic client-oriented image as an ad hoc SSH server and then switched to a different `borg` user in later commands. Replaced it with a single purpose-built `nold360/borgserver` setup so the image, SSH user, volumes, and later Borg repository URLs are consistent.
- The `nold360/borgserver` compose example mounted `./ssh/authorized_keys` into `/home/borg/.ssh/authorized_keys`, but that image documents `/sshkeys` with per-client public key files under `/sshkeys/clients`. Updated the project directory, volume mount, and client-key setup commands accordingly.
- The compose snippets used the obsolete top-level `version: "3.8"` key. Removed it and used a current `compose.yaml` style snippet.
- The post claimed a specific 50-90% storage saving range and implied a 100 MB database change always stores only exactly 100 MB. Reworded those claims to reflect Borg's chunk-based deduplication without promising exact ratios.
- The post described Borg encryption as "AES-256 encryption" only. Reworded this to "authenticated encryption" and clarified `repokey-blake2` as BLAKE2b authentication, which Borg documents as often faster on CPUs without hardware-accelerated SHA-256.
- The automated backup script used `$(hostname)` in the repository path while the setup created a repository path named `clientname`. Updated the script to use the same placeholder as the rest of the tutorial.
- The monitoring section said failed backups would "fail silently." Reworded it to say they may fail without alerting, since alerting depends on the client's backup script and notification setup.

## Review Notes
- Borg was not installed in the local environment, so CLI validation was performed against the official Borg 1.4 documentation rather than local `borg --help` output.
- The Docker Compose YAML snippet was parsed successfully with local `docker compose -f - config`.
- Borg 2 changes some command names and repository syntax, but Borg 1.4 stable documentation still supports the `borg init`, `borg create`, `borg prune`, and archive `::name` examples used in this post.
