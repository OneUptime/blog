# Validation Summary: How to Set Up Docker Container Logging Drivers

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker Engine logging drivers
- Docker CLI
- Docker daemon configuration
- Docker Compose logging configuration
- json-file, local, syslog, journald, fluentd, awslogs, gcplogs, and splunk logging drivers
- Fluentd
- AWS CloudWatch Logs
- Google Cloud Logging
- systemd journal / journalctl

## Sources Consulted
- Docker Docs: Configure logging drivers - https://docs.docker.com/engine/logging/configure/
- Docker Docs: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs: Local file logging driver - https://docs.docker.com/engine/logging/drivers/local/
- Docker Docs: Fluentd logging driver - https://docs.docker.com/engine/logging/drivers/fluentd/
- Docker Docs: Use docker logs with remote logging drivers - https://docs.docker.com/engine/logging/dual-logging/
- Docker Docs: Syslog logging driver - https://docs.docker.com/engine/logging/drivers/syslog/
- Docker Docs: Amazon CloudWatch Logs logging driver - https://docs.docker.com/engine/logging/drivers/awslogs/
- Docker Docs: Google Cloud Logging driver - https://docs.docker.com/engine/logging/drivers/gcplogs/
- Docker Docs: Journald logging driver - https://docs.docker.com/engine/logging/drivers/journald/
- Docker Docs: Compose file services logging reference - https://docs.docker.com/reference/compose-file/services/#logging
- Local Docker CLI / daemon check: Docker 29.4.2 available logging plugins and `docker run --help`

## Issues Found
- The `docker logs support` table said remote drivers such as syslog, fluentd, awslogs, gcplogs, and splunk did not support `docker logs`. Updated it to reflect Docker 20.10+ dual logging cache behavior, where `docker logs` works by default unless the cache is disabled.
- The daemon configuration examples included `// /etc/docker/daemon.json` comments inside JSON code fences. Removed those comments because `daemon.json` must be valid JSON.
- The post used `sudo systemctl reload docker` after changing daemon logging defaults. Updated it to `sudo systemctl restart docker`, matching Docker documentation that new daemon logging configuration applies to newly created containers after Docker is restarted.
- Fluentd examples used `fluentd-buffer-limit=8MB` and `"16MB"`, but Docker's Fluentd driver treats `fluentd-buffer-limit` as a number of buffered events, not a byte-size value. Replaced them with numeric event counts.
- The dual logging example had duplicate `log-opts` keys and mixed delivery-mode options with cache configuration. Consolidated the JSON and used `cache-max-size` and `cache-max-file`, which are the documented dual logging cache options.
- Credential comments for AWS and GCP were clarified to specify that credentials must be available to the Docker daemon.
- The structured logging section implied Docker parses JSON logs. Adjusted the wording to say JSON-formatted logs should be parsed in the Fluentd pipeline.

## Review Notes
- The Compose example uses `version: '3.8'`. Modern Docker Compose no longer requires the top-level `version` field, but it remains commonly accepted for compatibility, so it was not changed.
