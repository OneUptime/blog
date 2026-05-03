# Validation Summary: How to Deploy Loki via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Grafana Loki 3.0.0 (log aggregation system)
- Grafana Promtail 3.0.0 (log shipper)
- Portainer (Docker management UI / Stacks)
- Docker Compose (v3.8 schema)
- Loki Docker logging driver plugin
- Grafana (data source / Explore)
- LogQL (Loki's query language)

## Sources Consulted
- Official Grafana Loki configuration documentation (https://grafana.com/docs/loki/latest/configure/)
- Loki schema_config / TSDB store requirements (v13 schema, 24h period)
- Grafana Promtail configuration & pipeline stages docs (https://grafana.com/docs/loki/latest/send-data/promtail/configuration/)
- Grafana Loki Docker driver docs (https://grafana.com/docs/loki/latest/send-data/docker-driver/)
- LogQL reference (https://grafana.com/docs/loki/latest/query/)
- Docker Compose `logging` driver options reference

## Issues Found
1. **Loki Docker driver `loki-url` used wrong hostname.** The original config used `loki-url: "http://loki:3100/loki/api/v1/push"`. The Loki Docker logging driver is a managed Docker plugin that runs at the Docker daemon level — it does not have access to user-defined Docker networks, so the service-name DNS alias `loki` will not resolve. Changed to `http://localhost:3100/loki/api/v1/push`, which is the canonical example in Grafana's official Docker driver docs and works because the Loki Compose service publishes port 3100 to the host.

## Review Notes
- **Promtail is in feature-freeze.** Loki 3.0+ era documentation now recommends Grafana Alloy for new deployments; Promtail remains supported and functional but is no longer receiving new features. The post does not mention this. Future updates could note the Alloy alternative.
- **Container name regex requires Docker daemon tag config.** The pipeline stage `(?P<container_name>(?:[^|]*))\|0` only extracts a container name when the Docker daemon (or compose service) has been configured with a `tag` log option such as `tag: "{{.Name}}|{{.ImageID}}"`. Without this, `attrs.tag` is empty and the `container_name` label will not be populated. This is the canonical Grafana docs pattern, but the post does not call out the prerequisite. A simpler alternative is the built-in `- docker: {}` pipeline stage, which parses the json-file driver output without manual JSON+regex stages.
- **Relative bind-mount paths in Portainer Stacks.** `./loki-config.yml` and `./promtail-config.yml` are relative to the stack working directory created by Portainer; the user must place these files in that directory (or use Portainer's Git-backed templates / Docker configs). This is a Portainer-specific UX gotcha rather than a config error.
- **`/run/docker.sock` mount in Promtail is not strictly required** for this configuration, since the scrape uses static file paths under `/var/lib/docker/containers`, not `docker_sd_configs`. Harmless but unused.
- **`grpc_listen_port: 9096`** differs from Loki's default of 9095; this is intentional/valid and avoids potential conflicts.
- **Compose `version: "3.8"`** is ignored by current Docker Compose but remains harmless.
- LogQL query examples and the `docker plugin install grafana/loki-docker-driver --alias loki` install command are correct.
- Loki schema_config (v13 / tsdb / filesystem / 24h period) and `common` block (instance_addr, path_prefix, replication_factor: 1, inmemory ring) are valid for a single-node Loki 3.x deployment.
