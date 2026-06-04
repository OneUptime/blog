# Validation Summary: How to Use Docker Compose logging Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Docker Compose
- Docker logging drivers
- json-file logging driver
- local logging driver
- Fluentd logging driver
- syslog logging driver
- journald logging driver
- GELF logging driver
- AWS CloudWatch Logs logging driver

## Sources Consulted
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker logging driver configuration: https://docs.docker.com/engine/logging/configure/
- Docker json-file logging driver: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker local logging driver: https://docs.docker.com/engine/logging/drivers/local/
- Docker Fluentd logging driver: https://docs.docker.com/engine/logging/drivers/fluentd/
- Docker syslog logging driver: https://docs.docker.com/engine/logging/drivers/syslog/
- Docker journald logging driver: https://docs.docker.com/engine/logging/drivers/journald/
- Docker GELF logging driver: https://docs.docker.com/engine/logging/drivers/gelf/
- Docker AWS CloudWatch Logs logging driver: https://docs.docker.com/engine/logging/drivers/awslogs/
- Docker dual logging documentation: https://docs.docker.com/engine/logging/dual-logging/
- Docker CLI `docker container logs` reference: https://docs.docker.com/reference/cli/docker/container/logs/

## Issues Found
- Removed obsolete top-level `version: "3.8"` lines from Compose examples. Current Compose uses the Compose Specification, and the `version` top-level element is obsolete.
- Changed the Fluentd failure explanation. Docker documents that a container stops immediately if it cannot connect to Fluentd unless `fluentd-async` is used; the previous text said every log write would block and eventually hang.
- Changed the syslog example from `tcp://` to `tcp+tls://` because Docker ignores `syslog-tls-cert` and `syslog-tls-key` unless the syslog address protocol is `tcp+tls`.
- Changed the journald queries from `CONTAINER_NAME=myapp` to `CONTAINER_TAG=myapp`. The example configures `tag: "myapp"`, which maps to `CONTAINER_TAG` and `SYSLOG_IDENTIFIER`, not `CONTAINER_NAME`.
- Changed the AWS CloudWatch Logs example from `awslogs-stream: "app-{{.Name}}"` to `tag: "app-{{.Name}}"`. Docker documents Go template support for `tag`; `awslogs-stream` is a literal stream name and overrides `tag` when both are set.
- Updated the `docker logs` limitation note. Docker Engine supports dual logging, so `docker logs` can read recent logs even with remote drivers unless the cache is disabled.

## Review Notes
The remaining examples use driver options that are documented by Docker. The `du` and direct log file path examples are Linux Docker Engine specific; Docker also warns that json-file log files are intended for Docker daemon access, so future revisions could add that caveat if the post is expanded.
