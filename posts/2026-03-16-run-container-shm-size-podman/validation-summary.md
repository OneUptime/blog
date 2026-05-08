# Validation Summary: How to Run a Container with SHM Size Configuration in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux tmpfs and `/dev/shm`
- PostgreSQL containers
- Selenium Chrome containers
- Python POSIX shared memory
- Machine learning container workloads

## Sources Consulted
- Podman `podman-create` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `podman-pod-create` documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman `podman-container-inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- PostgreSQL Official Image documentation: https://hub.docker.com/_/postgres/
- Selenium Docker image documentation: https://github.com/SeleniumHQ/docker-selenium
- Python `multiprocessing.shared_memory` documentation: https://docs.python.org/3/library/multiprocessing.shared_memory.html

## Issues Found
- The PostgreSQL example used `POSTGRES_SHARED_BUFFERS=128MB`, which is not a supported environment variable for the official `postgres` image. Changed the command to pass `-c shared_buffers=128MB` to the PostgreSQL server, matching the official image documentation.
- The PostgreSQL example ran `psql` immediately after starting the detached container, which can fail before the server finishes initializing. Added a `pg_isready` wait before the `SHOW shared_buffers` command.
- The `/dev/shm` limit failure example attempted to print `$?` from inside a double-quoted host shell string without escaping it. Changed the example to capture and print the exit status inside the container shell.

## Review Notes
Podman's `--shm-size` flag, unit syntax, 64m default, and pod-level `--shm-size` behavior are consistent with the current official documentation. The Selenium `--shm-size 2g` example aligns with the Selenium Docker documentation. The specific SHM size recommendations are workload-dependent guidance rather than hard requirements, so they should be treated as starting points and tested under realistic load.
