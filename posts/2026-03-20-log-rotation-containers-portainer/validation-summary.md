# Validation Summary: How to Set Up Log Rotation for Containers in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker `json-file` logging driver
- Docker Compose service `logging` configuration
- Portainer stacks
- Linux shell commands for log inspection

## Sources Consulted
- Docker Docs, Configure logging drivers: https://docs.docker.com/engine/logging/configure/
- Docker Docs, JSON File logging driver: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs, Define services in Docker Compose: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, `docker system df` CLI reference: https://docs.docker.com/reference/cli/docker/system/df/
- Portainer Docs, Add a new stack: https://docs.portainer.io/sts/user/docker/stacks/add

## Issues Found
- The `daemon.json` example included `//` and inline comments, which made the snippet invalid JSON. I removed the comments from the JSON block and moved the file-path note into prose.
- The original verification command used `docker info | grep -A 5 "Logging Driver"`, which only shows the default driver and not the active log configuration. I replaced it with `docker info --format '{{.LoggingDriver}}'` and added a `docker inspect` example for checking a recreated container's log config.
- The per-service example included `labels` and `env` logging options even though the post is about log rotation and Docker documents those as advanced logging metadata controls. I removed them to keep the example accurate and focused on rotation.
- The command `docker system df -v | grep "CONTAINER\\|LOG SIZE"` does not report container log-file usage. I replaced it with file-based commands that measure `json-file` logs directly, including rotated files.
- The "keep only last 1000 lines" example rewrote the log file with `tail` and `mv`, which can replace the file instead of truncating it in place. I removed that example and kept only in-place truncation as a last-resort emergency operation.
- The `logrotate` section conflicted with Docker's documented warning that `json-file` logs should be managed by the Docker daemon rather than external tools. I replaced that section with a warning to avoid `logrotate` for `json-file` logs and pointed readers back to Docker-managed rotation.
- The compression savings claims (`~70%`, `60-80%`) were environment-specific and not documented guarantees. I softened them to say compression can significantly reduce storage for text-based logs.

## Review Notes
- Docker currently recommends the `local` logging driver for many non-Kubernetes use cases because it rotates by default. The post remains valid because it explicitly covers the `json-file` driver and its supported rotation options.
- Step 5 is still an emergency-only measure. Docker's docs caution against external manipulation of `json-file` log files, so built-in rotation and container recreation remain the supported approach.
