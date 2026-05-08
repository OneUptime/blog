# Validation Summary: How to Create a Named Volume with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman named volumes
- Container volume mounts
- PostgreSQL container storage
- Bash scripting

## Sources Consulted
- Podman `volume create` documentation: https://docs.podman.io/en/stable/markdown/podman-volume-create.1.html
- Podman `run --volume` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html#volume-v-source-volume-host-dir-container-dir-options
- Podman `volume ls` documentation: https://docs.podman.io/en/v5.1.1/markdown/podman-volume-ls.1.html
- Podman `volume inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-inspect.1.html
- Podman `volume exists` documentation: https://docs.podman.io/en/v3.2.2/markdown/podman-volume-exists.1.html
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres/

## Issues Found
- The post used `podman volume list` in several examples. Current official Podman documentation documents `podman volume ls`, so the examples were updated to use `podman volume ls`.
- The section showing `--opt type=tmpfs` and `--opt o=bind` did not note that these local-driver mount options require root privileges. Added a brief comment before those examples because Podman documents that local-driver `o` options other than UID/GID options require root privileges.

## Review Notes
Podman was not installed in the local environment, so command behavior was verified against official Podman documentation rather than local CLI execution. The PostgreSQL example uses `postgres:16`, for which mounting persistent storage at `/var/lib/postgresql/data` is still appropriate.
