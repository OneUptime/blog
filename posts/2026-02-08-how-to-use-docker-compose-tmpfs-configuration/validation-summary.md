# Validation Summary: How to Use Docker Compose tmpfs Configuration

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker
- Docker Compose
- Linux tmpfs
- PostgreSQL containers
- PHP-FPM containers
- Nginx containers

## Sources Consulted
- Docker Docs: tmpfs mounts - https://docs.docker.com/engine/storage/tmpfs/
- Docker Docs: Compose services reference, `tmpfs`, `shm_size`, `read_only`, and `volumes` attributes - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: docker container run reference, `--tmpfs`, `--read-only`, `--memory`, and `--shm-size` - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: runtime metrics and cgroup memory accounting - https://docs.docker.com/engine/containers/runmetrics/
- Docker Docs: PostgreSQL guide and official image notes - https://docs.docker.com/guides/postgresql/
- PostgreSQL Documentation: tablespaces and `temp_tablespaces` behavior - https://www.postgresql.org/docs/current/manage-ag-tablespaces.html
- PHP Manual: session runtime configuration and `session.save_path` - https://www.php.net/manual/en/session.configuration.php
- PHP Manual: `session_save_path()` - https://www.php.net/session-save-path

## Issues Found
- The service-level `tmpfs` example used an invalid map form with `type`, `target`, and nested `tmpfs`. `docker compose config` rejects maps under the `tmpfs` service attribute. Changed that example to the supported path-with-options short syntax and kept the valid long-form `type: tmpfs` example under service `volumes`.
- The post used `version: "3.8"` in Compose examples. Docker's current Compose docs mark the top-level `version` property as obsolete and Compose emits a warning when it is used. Removed the obsolete `version` lines from the examples.
- The tmpfs explanation said files are never written to disk. Docker's tmpfs docs note that tmpfs maps to Linux tmpfs and pages may be written to swap. Updated the explanation and comparison table to mention virtual memory, RAM, and swap.
- The PHP session example set `PHP_SESSION_SAVE_PATH`, which is not the documented PHP configuration directive. Changed the example to pass `session.save_path=/var/lib/php/sessions` to `php-fpm` with `-d`.
- The PostgreSQL example claimed to configure an in-memory temp tablespace while setting `temp_tablespaces=pg_default`. PostgreSQL documentation says `temp_tablespaces` names PostgreSQL tablespaces, and `pg_default` is the default tablespace in the data directory, not a tmpfs-backed temp tablespace. Changed the example to describe tmpfs for shared memory and OS temp files and removed the misleading `temp_tablespaces` setting.
- The PostgreSQL example referenced the named volume `pgdata` without declaring it. Added the top-level `volumes: pgdata:` declaration so the snippet validates as a standalone Compose file.

## Review Notes
Validated representative Compose snippets with `docker compose config` using Docker Compose v5.1.3. The short `tmpfs` strings with size and mode options are accepted by the local Compose parser, while the original map form under `tmpfs` was rejected.
