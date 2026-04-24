# Validation Summary: How to Reduce Portainer Memory Usage

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Go runtime and garbage collection
- BoltDB / bbolt

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer General settings: https://docs.portainer.io/admin/settings/general
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer source (`api/cli/cli.go`): https://github.com/portainer/portainer/blob/develop/api/cli/cli.go
- Portainer source (`api/internal/snapshot/snapshot.go`): https://github.com/portainer/portainer/blob/develop/api/internal/snapshot/snapshot.go
- Portainer source (`api/database/boltdb/db.go`): https://github.com/portainer/portainer/blob/develop/api/database/boltdb/db.go
- Portainer source (`api/portainer.go`): https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Docker CLI `docker container stats`: https://docs.docker.com/reference/cli/docker/container/stats/
- Docker resource constraints: https://docs.docker.com/engine/containers/resource_constraints/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Go GC guide: https://go.dev/doc/gc-guide
- Go `runtime/debug` package docs: https://pkg.go.dev/runtime/debug
- Go `runtime` package docs: https://pkg.go.dev/runtime
- bbolt package docs: https://pkg.go.dev/go.etcd.io/bbolt

## Issues Found
- `--snapshot-interval 300` was invalid because Portainer parses duration strings via Go `time.ParseDuration`; I changed it to `15m` and corrected the default interval note from `60 seconds` to the documented `5 minutes`.
- The multiline `docker run` example for `GOGC` and `GOMEMLIMIT` had inline comments after line-continuation backslashes, which breaks shell parsing. I removed the inline comments and corrected `GOMEMLIMIT` from a "hard" limit to a Go runtime soft memory limit.
- The database compaction workflow used `docker run --rm ... --compact-db` as if it were a one-shot helper. Portainer's `--compact-db` performs compaction on startup and then continues running, so I changed the example to recreate the Portainer container with `--compact-db`.
- The log-level example used `warn`, but Portainer's current CLI accepts uppercase enum values: `DEBUG`, `INFO`, `WARN`, and `ERROR`. I changed it to `WARN` and added the missing baseline Portainer run options so the example is runnable.
- The memory-limit section heading implied memory limits prevent OOM kills. I changed the heading to "Set a Memory Limit to Cap Usage" and completed the Compose example so it includes the Portainer socket and data mounts.
- The environment-removal steps did not match current Portainer documentation. I replaced the outdated "trash icon" instruction and removed the unsupported per-environment auto-snapshot claim.
- The monitoring loop had broken shell quoting around `docker stats --format`; I corrected the quoting so the command is syntactically valid.
- The "Memory Usage by Scale" table presented unverified concrete RAM numbers with no official Portainer sizing source. I replaced it with a source-safe note to measure a local baseline instead.

## Review Notes
- The Compose memory example is valid for Docker Compose service definitions. If readers are deploying Portainer with Docker Swarm via `docker stack deploy`, they would need Swarm-style `deploy.resources.limits.memory` instead.
- The post uses `portainer/portainer-ce:latest`. This tag exists on Docker Hub, but Portainer's install docs typically demonstrate `lts` or `sts` tags.
