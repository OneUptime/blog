# Validation Summary: How to Use the --compact-db Flag to Compress Portainer Database

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Docker
- Docker Compose
- Portainer HTTP API
- BoltDB / bbolt
- Bash

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer CE Docker install docs: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer API example docs: https://docs.portainer.io/admin/environments/add/api
- Portainer database encryption docs: https://docs.portainer.io/advanced/db-encryption
- Portainer rollback / version compatibility docs: https://docs.portainer.io/faqs/upgrading/how-can-i-roll-back-to-a-previous-version-of-portainer
- Portainer source, startup and datastore initialization: https://raw.githubusercontent.com/portainer/portainer/develop/api/cmd/portainer/main.go
- Portainer source, BoltDB connection and compaction behavior: https://raw.githubusercontent.com/portainer/portainer/develop/api/database/boltdb/db.go
- bbolt upstream documentation: https://github.com/etcd-io/bbolt

## Issues Found
- The post treated `--compact-db` as a one-shot command that compacts the database and exits. In Portainer, `--compact-db` is a startup flag: Portainer compacts the database during startup and then continues running normally. I corrected Steps 2 through 7 and the automation examples to reflect startup behavior.
- The post used `portainer/portainer-ce:latest` for compaction. That can unintentionally upgrade Portainer and trigger database schema migrations during maintenance. I changed the workflow to preserve the currently deployed image tag instead.
- The restart and login checks used HTTP on port `9000` as the primary path. Current Portainer install docs use HTTPS on `9443` by default and document `9000` as legacy HTTP. I updated the verification step to use `https://localhost:9443/api/auth` with `curl -k`.
- The backup example in `Important Caveats` copied the database to `/tmp/portainer.db.backup` inside the temporary container instead of the mounted `/backup` path, so the backup would be lost when the container exited. I fixed the destination path.
- The post hard-coded `/data/portainer.db` everywhere. Encrypted Portainer deployments use `/data/portainer.edb` and require the same secret mount to open the database. I added active database file detection and an encryption caveat.

## Review Notes
- Portainer’s current docs recommend `sts` / `lts` style image tags rather than `latest`; the most important requirement for this post is to reuse the exact tag already deployed during compaction.
- The automation example now waits for Portainer’s `database compaction completed` log entry before measuring the new database size. If Portainer changes that log message in a future release, the wait loop may need to be adjusted.
