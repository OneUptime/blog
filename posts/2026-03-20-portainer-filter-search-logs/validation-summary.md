# Validation Summary: How to Filter and Search Container Logs in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- `grep`
- `jq`
- Grafana Loki
- Grafana Alloy
- Grafana
- LogQL

## Sources Consulted
- Portainer Docs, "View container logs" - https://docs.portainer.io/user/docker/containers/logs
- Docker Docs, "`docker container logs`" - https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs, "`docker compose logs`" - https://docs.docker.com/reference/cli/docker/compose/logs/
- Docker Docs, "Version and name top-level elements" - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, "View container logs" - https://docs.docker.com/engine/logging/
- jq Manual - https://jqlang.org/manual/
- Grafana Loki Docs, "Log queries" - https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki Docs, "Query examples" - https://grafana.com/docs/loki/latest/query/query_examples/
- Grafana Loki Docs, "Pipelines" - https://grafana.com/docs/loki/latest/send-data/promtail/pipelines/
- Grafana Alloy Docs, "Run Grafana Alloy in a Docker container" - https://grafana.com/docs/alloy/latest/set-up/install/docker/
- Grafana Alloy Docs, "Monitor Docker containers with Grafana Alloy" - https://grafana.com/docs/alloy/latest/monitor/monitor-docker-containers/
- Grafana Loki official example, `alloy-local-config.yaml` - https://raw.githubusercontent.com/grafana/loki/v3.7.0/examples/getting-started/alloy-local-config.yaml

## Issues Found
- Portainer log viewer behavior was described imprecisely. I changed Step 1 to use the documented **Search** box and **Filter search results** toggle, and Step 2 to mention Portainer's documented **Date picker** instead of saying Portainer only limits lines.
- The fixed-time `docker logs --since/--until` examples omitted a timezone suffix. I updated them to explicit UTC `Z` timestamps to keep the RFC3339 examples unambiguous.
- Several `grep` examples used BRE alternation with `\|`. I changed them to `grep -E` form for clearer, portable alternation syntax and adjusted the script's JSON-matching regexes to tolerate optional whitespace around `:` characters.
- The centralized logging section was outdated. It used Promtail even though Grafana documents Promtail as deprecated and EOL on March 2, 2026, so I replaced that example with Grafana Alloy and removed the obsolete top-level Compose `version` field.
- The article labeled the Docker Compose logging stack as a production setup, but Grafana's current installation guidance recommends Helm or Tanka for production. I changed the section to present Compose as a self-hosted example and noted the production recommendation.
- One LogQL example was invalid: `{job="docker"} |= "timeout" | rate[5m] > 10`. I replaced it with a valid metric query form using `sum(rate(...[5m])) > 10` and made the label assumption explicit.

## Review Notes
- `docker logs` output depends on the container's logging configuration. Docker documents that some remote logging-driver setups may not return useful output unless log reading is supported or dual logging is enabled.
