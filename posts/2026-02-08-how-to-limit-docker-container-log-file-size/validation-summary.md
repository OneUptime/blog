# Validation Summary: How to Limit Docker Container Log File Size

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine logging drivers
- Docker CLI
- Docker Compose logging configuration
- Docker daemon configuration
- systemd journald
- syslog
- Bash shell scripting

## Sources Consulted
- Docker Docs: Configure logging drivers - https://docs.docker.com/engine/logging/configure/
- Docker Docs: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs: Local file logging driver - https://docs.docker.com/engine/logging/drivers/local/
- Docker Docs: Journald logging driver - https://docs.docker.com/engine/logging/drivers/journald/
- Docker Docs: Syslog logging driver - https://docs.docker.com/engine/logging/drivers/syslog/
- Docker Docs: Compose services `logging` reference - https://docs.docker.com/reference/compose-file/services/#logging
- Docker CLI help output for `docker run`, `docker inspect`, `docker ps`, and `docker compose config`
- GNU coreutils help output for `truncate`, `sort`, and `stat`
- systemd `journald.conf` documentation - https://www.freedesktop.org/software/systemd/man/latest/journald.conf.html

## Issues Found
- The examples labeled as checking or truncating logs for all containers used `docker ps -q`, which only lists running containers. Changed those examples to `docker ps -a -q` so stopped containers with retained log files are included.
- The monitoring script updated `TOTAL_BYTES` inside a pipeline loop. In Bash, that loop commonly runs in a subshell, so the parent shell would still see `TOTAL_BYTES=0` after the loop. Changed the loop to use process substitution with `done < <(docker ps -a -q)` so the total is available for the threshold check.

## Review Notes
- Docker's official documentation confirms that `json-file` is the default logging driver, `max-size` defaults to unlimited for that driver, and `max-file` only affects rotation when `max-size` is set.
- Docker's official documentation recommends the `local` driver for preventing disk exhaustion because it rotates by default and uses a more efficient file format.
- The post is Linux-oriented for direct `/var/lib/docker/containers` paths and `systemctl` commands; Docker Desktop users configure daemon settings through Docker Desktop's Docker Engine settings.
