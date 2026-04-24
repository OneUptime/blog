# Validation Summary: How to Deploy the PLG Stack (Promtail, Loki, Grafana) via Portainer - Deploy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Portainer stacks
- Grafana Loki
- Promtail
- Grafana
- LogQL

## Sources Consulted
- Portainer stack deployment docs: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer relative path volume docs: https://docs.portainer.io/sts/advanced/relative-paths
- Docker Compose top-level `version` docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Grafana Promtail lifecycle docs: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Promtail `docker` stage docs: https://grafana.com/docs/loki/latest/send-data/promtail/stages/docker/
- Grafana Loki log query docs: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki storage docs: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki retention docs: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana provisioning docs: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Loki 2.9.4 Promtail configuration reference (upstream docs source): https://raw.githubusercontent.com/grafana/loki/v2.9.4/docs/sources/send-data/promtail/configuration.md
- Loki 2.9.4 retention docs (upstream docs source): https://raw.githubusercontent.com/grafana/loki/v2.9.4/docs/sources/operations/storage/retention.md
- Loki 2.9.4 local config example: https://raw.githubusercontent.com/grafana/loki/v2.9.4/cmd/loki/loki-local-config.yaml

## Issues Found
- The stack used relative bind mounts (`./loki.yaml`, `./promtail.yaml`, and `./grafana-datasources.yaml`), but Portainer documents relative path volumes as a Business Edition feature for Git-based stack deployments. I replaced them with explicit Docker host paths under `/opt/plg` and updated the surrounding instructions so the stack works as a normal Portainer deployment.
- The Compose snippet used the top-level `version` field. Current Docker Compose documentation marks this field as obsolete, so I removed it.
- The post presented Promtail as if it were still a normal current deployment choice. Grafana’s official documentation states that Promtail reached end-of-life on March 2, 2026, so I added a short caveat that new deployments should use Grafana Alloy instead.
- The Promtail pipeline used an extra `json` stage after `docker: {}`. Grafana’s documentation explains that the `docker` stage already unwraps Docker’s JSON log format and extracts the stream label, so I removed the redundant parsing stage and the unused `/var/lib/docker/containers` bind mount.
- The LogQL example labeled “Top 10 slowest requests” did not compute a top 10; it only filtered lines where `response_ms > 500`. I corrected the label to match what the query actually does.

## Review Notes
- The post pins Loki/Promtail `2.9.4` and Grafana `10.3.1`, which are older releases. The examples were validated against those pinned versions and upstream 2.9.4 documentation, not against the latest Grafana stack releases.
- The Loki configuration still uses `boltdb-shipper` with schema `v11`. That is consistent with Grafana’s upstream Loki 2.9.4 local config and 2.9.x docs, even though newer Loki documentation recommends TSDB for newer deployments.
- The Promtail positions file remains at `/tmp/positions.yaml`, so recreating the Promtail container can reset read positions and cause already-seen logs to be reread.
- The example matches Portainer on a Docker host using Compose-style stack semantics. If a reader is deploying to Docker Swarm through Portainer, startup-order behavior such as `depends_on` health conditions differs.
- Docker was not installed in this review environment, so validation was performed against official documentation and upstream versioned configuration sources rather than by running the containers locally.
