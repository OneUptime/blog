# Validation Summary: How to Run a Container with Stop Timeout in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux container signals
- PostgreSQL container shutdown
- Nginx graceful shutdown
- Shell signal traps

## Sources Consulted
- Podman `podman stop` documentation: https://docs.podman.io/en/latest/markdown/podman-stop.1.html
- Podman `podman run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman `podman container inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- NGINX runtime control documentation: https://docs.nginx.com/nginx/admin-guide/basic-functionality/runtime-control/
- NGINX signal control documentation: https://nginx.org/en/docs/control.html
- PostgreSQL shutdown documentation: https://www.postgresql.org/docs/current/server-shutdown.html
- Official PostgreSQL Docker image Dockerfile for version 16: https://github.com/docker-library/postgres/blob/master/16/bookworm/Dockerfile

## Issues Found
- Clarified that Podman's default stop signal is SIGTERM only when the image or `--stop-signal` has not configured another signal. This matches Podman's documentation and avoids ambiguity for images such as PostgreSQL.
- Corrected the PostgreSQL shutdown explanation. The official `postgres:16` image sets `STOPSIGNAL SIGINT`, which maps to PostgreSQL fast shutdown: new connections are refused and in-progress transactions are aborted cleanly. The post previously implied active transactions would complete normally.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was verified against official documentation rather than local `--help` output. The commands and flags used in the post are current in Podman's latest documentation.
