# Validation Summary: How to Run a Database with Quadlet

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- PostgreSQL
- Podman named volumes
- Podman health checks
- Podman secrets

## Sources Consulted
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman secret create documentation: https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html
- Podman create/run secret option documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Docker Official PostgreSQL image documentation: https://hub.docker.com/_/postgres/

## Issues Found
- The deployment commands labeled `systemctl --user enable postgres.service` as "Enable at boot". For a rootless user service, this enables the service for the user manager, but it does not necessarily start at machine boot unless the user manager starts at boot, such as when linger is enabled. Changed the comment to "Enable for future user sessions" to avoid implying boot-time startup behavior.

## Review Notes
- The Quadlet keys used in the container and volume snippets are current and match the official Podman Quadlet documentation, including `Volume=pgdata.volume:/var/lib/postgresql/data`, health check fields, `Notify=healthy`, `PublishPort=5432:5432`, and `Secret=...,type=env,target=...`.
- The PostgreSQL image environment variables and `PGDATA=/var/lib/postgresql/data/pgdata` are valid for `postgres:16`.
- The example publishes PostgreSQL on the host port without access restrictions and uses a sample password. That is acceptable for a tutorial snippet, but a production deployment should also address network exposure, password generation/rotation, TLS, backups, monitoring, and host hardening.
