# Validation Summary: How to Fix Missing Stacks After Portainer Database Corruption

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- bbolt (BoltDB)
- Docker CLI
- Docker volumes
- Go toolchain

## Sources Consulted
- Portainer documentation, "What does Portainer's backup include?": https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer documentation, "General" backup and restore section: https://docs.portainer.io/2.33-lts/admin/settings/general
- Portainer documentation, "Add a new stack": https://docs.portainer.io/user/docker/stacks/add
- bbolt README: https://github.com/etcd-io/bbolt
- bbolt CLI source, `command_check.go`: https://github.com/etcd-io/bbolt/blob/main/cmd/bbolt/command/command_check.go
- bbolt CLI source, `command_pages.go`: https://github.com/etcd-io/bbolt/blob/main/cmd/bbolt/command/command_pages.go
- bbolt CLI source, `command_buckets.go`: https://github.com/etcd-io/bbolt/blob/main/cmd/bbolt/command/command_buckets.go
- Docker documentation, `docker inspect`: https://docs.docker.com/reference/cli/docker/inspect/
- Docker documentation, volumes backup and restore examples: https://docs.docker.com/engine/storage/volumes/
- Portainer source, stack datasource bucket name: https://github.com/portainer/portainer/blob/develop/api/dataservices/stack/stack.go
- Portainer source, backup restore implementation: https://github.com/portainer/portainer/blob/develop/api/backup/restore.go

## Issues Found
- The post referenced `alpine/bbolt` as a ready-made Docker image for the bbolt CLI. I replaced it with a working temporary-container approach using `golang:alpine` and `go run`, because the original image reference is not a valid Docker Hub repository.
- The Step 1 comment called the tool the "bolt CLI tool" even though the maintained project and command are `bbolt`. I corrected the wording and made the local install example call the installed binary via `$(go env GOPATH)/bin/bbolt` instead of assuming it is already on `PATH`.
- Step 2 said the `pages` command would export readable data. That is inaccurate: `pages` lists page metadata. I changed the wording to page inspection and added `buckets` as the command that actually lists top-level buckets.
- The article implied any `tar.gz` backup could be restored with the raw volume untar command. I clarified that the shown restore command is for a raw `/data` volume backup, while Portainer's built-in backup archive should be restored through Portainer's fresh-instance setup flow.
- Step 5 said the container-label command could reconstruct the Compose file. It only exposes project metadata and can help identify stack membership, so I softened the wording to "a starting point to reconstruct the compose".

## Review Notes
- The post is technically relevant and salvageable after the corrections above.
- Portainer stores stack records in the `stacks` bucket; this was verified from Portainer source and is not prominently documented in the user docs.
- Raw `/data` tar backups and Portainer's built-in backup archives are different backup formats with different restore procedures.
