# Validation summary

## Sources reviewed

- https://docs.docker.com/engine/swarm/services/
- https://docs.docker.com/reference/cli/docker/node/update/
- https://prometheus.io/docs/guides/dockerswarm/
- https://docs.docker.com/reference/cli/docker/service/create/
- https://github.com/google/cadvisor/blob/v0.55.1/docs/runtime_options.md
- https://github.com/google/cadvisor/blob/v0.55.1/docs/running.md
- https://prometheus.io/docs/prometheus/latest/configuration/configuration/#dockerswarm_sd_config
- https://github.com/prometheus/prometheus/blob/v3.7.3/discovery/moby/tasks.go

## Checks performed

- Prometheus 3.7.3 promtool accepted exact scrape job.
- Extracted relabel rules executed with github.com/prometheus/prometheus v0.307.3 and normal UTF-8 rule validation: eight cases verified valid IPv4/IPv6 host targets, wrong service, replicated mode, shutdown task, ingress publication, overlay metadata and wrong port. Retained node labels checked.
- Reviewed tagged discovery source to distinguish node-published addresses from network attachments.
- Shell examples passed sh -n; Mermaid five-edge structure checked. Social image generated and visually inspected.
- Image manifest digest reused from directly verified official registry manifest in cAdvisor deployment review.

## Limitations

- No Swarm cluster, Docker daemon, host publication, firewall, exporter startup or metric coverage tested. The service is a staging recipe with deliberately limited metric groups.
- Discovery was source-reviewed; relabeling used synthetic metadata fixtures, not live Docker API results.
- Mermaid not rendered. No claim that non-privileged Swarm runtime matches standalone privileged cAdvisor coverage.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
