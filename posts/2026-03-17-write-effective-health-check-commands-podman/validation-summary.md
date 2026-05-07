# Validation Summary: How to Write Effective Health Check Commands for Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Container health checks
- curl
- wget
- PostgreSQL pg_isready
- MySQL mysqladmin
- Redis redis-cli
- gRPC health probing
- Bash health check scripts

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman healthcheck run documentation: https://docs.podman.io/en/latest/markdown/podman-healthcheck-run.1.html
- curl man page: https://curl.se/docs/manpage.html
- GNU Wget manual: https://www.gnu.org/software/wget/manual/wget.html
- PostgreSQL pg_isready documentation: https://www.postgresql.org/docs/16/app-pg-isready.html
- MySQL mysqladmin documentation: https://dev.mysql.com/doc/refman/en/mysqladmin.html
- Redis PING command documentation: https://redis.io/docs/latest/commands/ping/
- grpc-health-probe documentation: https://github.com/grpc-ecosystem/grpc-health-probe
- GNU Coreutils df documentation: https://www.gnu.org/software/coreutils/df

## Issues Found
- Most examples advised quick, bounded health checks but did not set Podman's `--health-timeout`. Added `--health-timeout` values to the Podman examples so hanging checks are marked failed by Podman.
- The wget example did not include a command-level timeout. Added `--timeout=5`, which is supported by GNU Wget.
- The MySQL example expanded `$MYSQL_ROOT_PASSWORD` unquoted inside the container shell. Changed the outer health command quoting and quoted the variable so passwords containing spaces or shell metacharacters are handled correctly.
- The gRPC example did not include probe-level timeouts. Added `-connect-timeout=2s` and `-rpc-timeout=3s`, which are supported by `grpc_health_probe`.

## Review Notes
The examples assume the relevant probe utilities are installed inside each container image. Podman runs string health commands through `/bin/sh -c`; images without a POSIX shell should use the JSON-array command form instead.
