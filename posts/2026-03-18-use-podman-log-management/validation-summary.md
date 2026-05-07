# Validation Summary: How to Use Podman for Log Management

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- systemd journald
- Grafana Loki
- Promtail
- Grafana
- Elasticsearch
- Kibana
- Node.js
- Pino
- Python logging

## Sources Consulted
- Podman `run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `logs` documentation: https://docs.podman.io/en/latest/markdown/podman-logs.1.html
- Podman volume option documentation: https://docs.podman.io/en/v4.4/markdown/options/volume.html
- `containers.conf` reference from the official containers/common repository: https://github.com/containers/common/blob/main/docs/containers.conf.5.md
- Grafana Loki configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Promtail journal scraping documentation: https://grafana.com/docs/loki/latest/clients/promtail/scraping/
- Promtail lifecycle status and EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/
- Loki log ingestion guidance for Grafana Alloy: https://grafana.com/docs/loki/latest/send-data/alloy/
- Elasticsearch Docker installation docs: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-with-docker
- Kibana Docker installation docs: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-kibana-with-docker
- Pino API docs: https://github.com/pinojs/pino/blob/main/docs/api.md
- Python logging documentation: https://docs.python.org/3/library/logging.html

## Issues Found
- The `k8s-file` example said it was the default for rootless Podman. Current Podman docs describe the default more narrowly, so this was changed to say `k8s-file` is common when journald is unavailable, including many rootless setups.
- The Promtail section treated Promtail as a normal current deployment choice even though Grafana documents it as end-of-life as of March 2, 2026. I added an explicit lifecycle note and clarified that Grafana Alloy is the recommended choice for new Loki deployments.
- The Promtail example tried to scrape `/var/log/containers/*.log` without configuring Podman to write logs there. I removed that file-scraping block and kept the journald-based collection path, which matches the rest of the post and Podman’s documented journald integration.
- The Promtail example wrote `~/logging/promtail/config.yml` without creating `~/logging/promtail` first. I added `mkdir -p ~/logging/promtail`.
- The Promtail container example mounted journal directories but omitted `/etc/machine-id`, which Grafana documents as required for journal scraping inside a container. I added that bind mount.
- The health-check script queried Promtail on `localhost:9080`, but the Promtail container was not publishing port `9080`. I added `-p 9080:9080` to the container run command.
- The ELK section used `docker.io/library/elasticsearch` and `docker.io/library/kibana`, but Elastic’s official Docker images are published from `docker.elastic.co`. I corrected both image references.
- The Kibana example passed `ELASTICSEARCH_HOSTS` as a plain string even though the setting maps to Kibana’s array-valued `elasticsearch.hosts`. I changed it to a JSON array string.
- The log retention section said Podman “rotates” the log when `max-size` is hit. The official `containers.conf` reference describes truncation and reopening rather than multi-file rotation, so I corrected that wording.
- The Loki query in the health-check script used braces directly in the URL, which requires disabling curl URL globbing. I added `-g` and also changed the readiness checks to use `curl -f` instead of matching response text.

## Review Notes
- The Loki, Promtail, and Grafana container examples still use `:latest` tags, which is valid but less reproducible than pinning explicit versions.
- The ELK example pins Elastic `8.12.0`. The commands remain valid for that release line, but that version is older than current Elastic releases and should be refreshed periodically.
