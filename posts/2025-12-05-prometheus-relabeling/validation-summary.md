# Validation Summary: How to Configure Relabeling in Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (relabel_configs, metric_relabel_configs)
- Prometheus Kubernetes service discovery (kubernetes_sd_configs)
- PromQL
- promtool
- YAML configuration

## Sources Consulted
- Prometheus configuration docs — relabel_config: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config
- Prometheus configuration docs — metric_relabel_configs and scrape_config: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config
- Prometheus Kubernetes SD meta labels: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config
- Prometheus HTTP API (targets endpoint): https://prometheus.io/docs/prometheus/latest/querying/api/#targets
- promtool reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/

## Issues Found
No technical issues found.

The following were specifically verified as correct:
- Relabel pipeline stages: `relabel_configs` apply to discovered targets before scrape; `metric_relabel_configs` apply to scraped samples before storage.
- Relabel action types table — `replace`, `keep`, `drop`, `hashmod`, `labelmap`, `labeldrop`, `labelkeep`, `lowercase`, `uppercase` are all valid action values (`lowercase`/`uppercase` were introduced in Prometheus 2.23.0).
- Kubernetes SD meta labels used (`__meta_kubernetes_namespace`, `__meta_kubernetes_pod_name`, `__meta_kubernetes_pod_node_name`, `__meta_kubernetes_pod_controller_name`, `__meta_kubernetes_pod_phase`, `__meta_kubernetes_pod_label_*`, `__meta_kubernetes_pod_annotation_*`, `__meta_kubernetes_service_name`, `__meta_kubernetes_service_label_*`, `__meta_kubernetes_service_annotation_*`, `__meta_kubernetes_node_name`, `__meta_kubernetes_node_label_*`) all exist for their respective roles.
- The `__address__` rewrite regex `([^:]+)(?::\d+)?;(\d+)` with replacement `${1}:${2}` is the standard pattern for applying a custom scrape port.
- `labelmap` with a `replacement` (e.g. `node_${1}`) correctly renames mapped labels.
- Hash-based sharding using `hashmod` + `modulus` + `keep` on a temp label is the documented sharding approach.
- Debugging commands: `/targets` UI page, `GET /api/v1/targets`, and `promtool check config prometheus.yml` are all correct and current.

## Review Notes
- The deployment-name extraction regex `(.+)-[a-z0-9]+-[a-z0-9]+` is a reasonable heuristic for stripping a ReplicaSet hash + pod suffix, but it can over-match for Deployments whose names themselves contain hyphenated lowercase/numeric segments. It is presented as an illustrative example and is acceptable; in production `__meta_kubernetes_pod_controller_name` (also shown in the post) is the more robust source.
- Newer relabel actions `keepequal` and `dropequal` (Prometheus 2.41.0+) are not mentioned, but their omission is not an error — the post's coverage is accurate for the actions it lists.
- All YAML snippets are syntactically valid and use current, non-deprecated field names.
