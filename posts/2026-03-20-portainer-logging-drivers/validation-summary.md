# Validation Summary: How to Configure Container Logging Drivers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker logging drivers
- Grafana Loki Docker driver plugin
- Amazon CloudWatch Logs
- Fluentd
- Syslog

## Sources Consulted
- Portainer Docs, "Advanced container settings": https://docs.portainer.io/user/docker/containers/advanced
- Portainer Docs, "View container logs": https://docs.portainer.io/user/docker/containers/logs
- Docker Docs, "Configure logging drivers": https://docs.docker.com/engine/logging/configure/
- Docker Docs, "JSON File logging driver": https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs, "Fluentd logging driver": https://docs.docker.com/engine/logging/drivers/fluentd/
- Docker Docs, "Syslog logging driver": https://docs.docker.com/engine/logging/drivers/syslog/
- Docker Docs, "Amazon CloudWatch Logs logging driver": https://docs.docker.com/engine/logging/drivers/awslogs/
- Docker Docs, "Use docker logs with remote logging drivers": https://docs.docker.com/engine/logging/dual-logging/
- Grafana Loki Docs, "Docker driver client": https://grafana.com/docs/loki/latest/send-data/docker-driver/
- Grafana Loki Docs, "Docker driver client configuration": https://grafana.com/docs/loki/latest/send-data/docker-driver/configuration/

## Issues Found
- The Portainer UI path was outdated. The post said to use a "Logging" tab, but current Portainer documentation places this under **Advanced container settings > Command & logging**. I updated the steps accordingly.
- The `loki` row in the driver table implied Loki is a standard built-in driver. I clarified that it is available via the Docker plugin, which matches Docker and Grafana Loki documentation.
- The Loki plugin installation command used `:latest`, which is not what the current Grafana Loki docs document. I updated the example to the current documented release tag and noted the ARM64 tag suffix requirement.
- The Loki endpoint example used a bare service name. I changed it to a host-reachable URL example so the configuration reflects how the Docker logging driver connects to Loki.
- The AWS CloudWatch example used `awslogs-stream: "{{.Name}}"`, but Docker documents Go template expansion on the `tag` option, not on `awslogs-stream`. I replaced `awslogs-stream` with `tag`.
- The `daemon.json` snippet contained a JavaScript-style comment inside a JSON block, which made the example invalid JSON. I moved the file path into surrounding prose and left the code block as valid JSON.
- The Portainer log-viewer section was inaccurate. It claimed Portainer only works with `json-file` and `journald`, but Docker now supports dual logging for remote drivers by default, and the Loki driver also keeps `docker logs` working unless `no-file` is set. I rewrote that section to reflect current Docker behavior.

## Review Notes
- The Loki plugin version in the post is correct as of April 24, 2026, but it is version-specific and may need updating later.
- Portainer log visibility for remote drivers depends on Docker's local cache behavior. If `cache-disabled: "true"` is set for a remote driver, or `no-file: "true"` is set for the Loki driver, Portainer will not have local logs to display.
