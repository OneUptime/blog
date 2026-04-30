# Validation Summary: How to Forward Container Logs to Loki via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Grafana Loki
- Loki Docker driver plugin
- Promtail
- Grafana Alloy
- LogQL

## Sources Consulted
- Docker Docs, Configure logging drivers: https://docs.docker.com/engine/logging/configure/
- Docker Docs, Customize log driver output: https://docs.docker.com/engine/logging/log_tags/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Grafana Loki docs, Docker driver client: https://grafana.com/docs/loki/latest/send-data/docker-driver/
- Grafana Loki docs, Docker driver client configuration: https://grafana.com/docs/loki/latest/send-data/docker-driver/configuration/
- Grafana Loki docs, Promtail agent: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki docs, Install Promtail: https://grafana.com/docs/loki/latest/send-data/promtail/installation/
- Grafana Loki docs, Configuring Promtail for service discovery: https://grafana.com/docs/loki/latest/send-data/promtail/scraping/
- Grafana Loki docs, Promtail `docker` stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/docker/
- Grafana Loki docs, Promtail `labels` stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/labels/
- Grafana Loki docs, Promtail `output` stage: https://grafana.com/docs/loki/latest/send-data/promtail/stages/output/
- Grafana Loki docs, Query examples: https://grafana.com/docs/loki/latest/query/query_examples/
- Grafana Loki docs, Loki HTTP API: https://grafana.com/docs/loki/latest/api/
- Prometheus docs, configuration reference for `docker_sd_config`: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The Docker plugin install example used `grafana/loki-docker-driver:latest`, which is not how the current Grafana docs show installation. I changed it to a versioned, architecture-specific tag and added the ARM64 note to match the official install guidance.
- The post said the Loki Docker plugin intercepts logs "at the kernel level". That is inaccurate. I corrected the explanation to say it runs as a Docker logging driver on the host.
- The default-driver section implied restarting Docker was enough to move all containers to Loki. Docker’s docs say changing `daemon.json` only affects newly created containers, so I added a note that existing containers must be recreated.
- The verification command for the default logging driver used `docker info | grep "Logging Driver"`. That works on Linux, but Docker’s documented command is `docker info --format '{{.LoggingDriver}}'`, so I switched to the official form.
- The per-service examples used `loki-labels`, which is not a supported Loki Docker driver option in the current Grafana docs. I replaced it with supported `loki-external-labels` values.
- The post used custom `loki-external-labels` values without preserving the default `container_name` label. Grafana’s docs warn that custom `loki-external-labels` replaces the default, so I added `container_name={{.Name}}` where needed.
- The API pipeline referenced `timestamp` in a `timestamp` stage but never extracted that field. I added `timestamp: timestamp` to the JSON expressions so the example is internally consistent.
- The Compose snippets included a top-level `version` key. Docker now marks that field as obsolete, so I removed it from the examples.
- The Promtail section presented Promtail as a current peer to the Docker driver and pinned an old `grafana/promtail:2.9.0` image. Promtail is end-of-life as of March 2, 2026, and current installation docs use `3.6.0`, so I updated the version and clarified that this method is only for existing deployments.
- The Promtail Compose snippet attached the service to `logging_net` without defining that network. I added the missing top-level `networks` entry so the Compose example is valid.
- The Promtail configuration claimed to read Docker JSON log files but did not set `__path__` to those files, did not decode Docker’s JSON wrapper first, and used `__meta_docker_container_log_stream`, which is not a documented Docker service-discovery meta label. I corrected the config by mapping container IDs to `/var/lib/docker/containers/*-json.log`, adding the `docker: {}` stage, promoting `stream` from the decoded Docker log wrapper, parsing JSON from the extracted `output` field, and unwrapping the final log line before sending it to Loki.
- The LogQL metric query `sum(rate({stack="myapp", level="error"}[5m])) by (service)` used invalid aggregation syntax. I corrected it to `sum by (service) (rate({stack="myapp", level="error"}[5m]))`.
- The conclusion overstated that the Docker driver captures "all metadata automatically" and recommended Promtail without qualification. I narrowed that claim to basic container and Compose metadata and noted that Grafana recommends Alloy for new file-based collection.

## Review Notes
- Promtail is end-of-life as of March 2, 2026. Keeping it in the post is still technically relevant for existing environments, but new file-based deployments should use Grafana Alloy instead.
- The host-side commands assume a Linux Docker host with `systemd` and GNU `date`, which fits the examples shown but is not portable to Windows or macOS.
- I did not execute the Docker, Loki, or Promtail commands in this environment because the required services are not available here; the review was done against current official documentation.
