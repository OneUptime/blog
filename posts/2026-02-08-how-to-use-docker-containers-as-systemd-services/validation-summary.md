# Validation Summary: How to Use Docker Containers as Systemd Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker CLI
- systemd unit files
- systemd service and target dependencies
- journald and journalctl
- Redis Docker image
- PostgreSQL Docker image

## Sources Consulted
- systemd.unit official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.service official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.exec official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- journalctl official manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- Docker journald logging driver documentation: https://docs.docker.com/engine/logging/drivers/journald/
- Docker run / container execution documentation: https://docs.docker.com/engine/containers/run/
- Docker legacy container links documentation: https://docs.docker.com/engine/network/links/
- Docker deprecated features documentation: https://docs.docker.com/engine/deprecated/
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres
- Redis Docker Official Image documentation: https://hub.docker.com/_/redis
- Local CLI/manual verification: `systemd-analyze verify`, `systemctl --help`, `journalctl --help`, `docker run --help`, `docker stop --help`, `docker pull --help`, `docker network create --help`

## Issues Found
- `StartLimitIntervalSec` and `StartLimitBurst` were shown under `[Service]`. On systemd 255, `systemd-analyze verify` reports these as unknown keys in `[Service]`; the official systemd unit manual documents them as unit-level rate-limit settings. Moved them into `[Unit]` in the main unit example and the explanatory snippet.
- The multi-container example used Docker `--link`, which Docker documents as a legacy feature and recommends replacing with user-defined networks. Replaced the links with a user-defined `myapp-net` network and network aliases for `redis` and `postgres`.
- The stack stop command implied `systemctl stop myapp-stack.target` would stop all component services, but the service units did not include a dependency that propagates target stop/restart operations. Added `PartOf=myapp-stack.target` to the Redis, PostgreSQL, and application service units.
- The PostgreSQL readiness loop used `break`, so the shell command could still exit successfully after all retries failed because the final `sleep` returned success. Changed it to exit successfully only when `pg_isready` succeeds and exit with failure after all retries are exhausted.
- The application service now creates `myapp-net` before startup as well, so restarting `myapp.service` directly still works if the Docker network has been removed.

## Review Notes
Representative corrected unit files were checked with `systemd-analyze verify` successfully. The examples still use placeholder image names, credentials, and URLs, so they require real application images and production secret handling before deployment.
