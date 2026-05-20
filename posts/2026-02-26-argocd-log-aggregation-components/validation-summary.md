# Validation Summary: How to Set Up Log Aggregation for ArgoCD Components

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Grafana Loki
- Grafana Alloy
- Fluentd
- Elasticsearch
- Kibana KQL
- LogQL

## Sources Consulted
- Argo CD `argocd-cmd-params-cm` reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD additional command configuration method: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/additional-configuration-method/
- Kubernetes `kubectl rollout` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes logging architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Grafana Alloy Kubernetes log collection documentation: https://grafana.com/docs/grafana-cloud/send-data/alloy/collect/logs-in-kubernetes/
- Grafana Alloy `local.file_match` / Kubernetes pod log example: https://grafana.com/docs/alloy/latest/reference/components/local/local.file_match/
- Grafana Alloy `loki.process` reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.process/
- Grafana Loki Promtail service discovery documentation and deprecation notice: https://grafana.com/docs/loki/latest/send-data/promtail/scraping/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Fluentd `in_tail` input plugin documentation: https://docs.fluentd.org/input/tail
- Fluentd parser filter documentation: https://docs.fluentd.org/filter/parser
- Fluentd record transformer documentation: https://docs.fluentd.org/filter/record_transformer
- Fluentd Elasticsearch output plugin documentation: https://docs.fluentd.org/output/elasticsearch
- Linked OneUptime Argo CD OpenTelemetry post: https://oneuptime.com/blog/post/2026-02-26-argocd-full-observability-opentelemetry/view

## Issues Found
- Replaced the Promtail-based Loki option with Grafana Alloy. Promtail is deprecated, was in LTS only through February 28, 2026, and reached EOL on March 2, 2026, so it is no longer a current recommendation on the validation date.
- Updated the Loki collection configuration to use Alloy `discovery.kubernetes`, `discovery.relabel`, `loki.source.kubernetes`, `loki.process`, and `loki.write`, matching Grafana's current Kubernetes log collection model.
- Fixed the Fluentd source parsing. Kubernetes pod log files are wrapped in the CRI log format, so parsing `/var/log/pods/.../*.log` directly as JSON would fail. The post now parses the CRI wrapper first, then parses the Argo CD JSON payload from the `log` field.
- Fixed Fluentd component enrichment. The previous `component ${tag_parts[1]}` value did not reliably map to an Argo CD component from the wildcard file tag. The post now records the tailed file path and derives the container/component directory from that path.
- Replaced the sidecar/init-container enrichment example. The original sidecar snippet did not actually enrich container stdout logs. The post now shows enrichment in the log processing pipeline with Alloy static labels.
- Fixed the Loki retention snippet. The previous top-level `overrides.argocd.retention_period` example was not a valid Loki retention configuration. The post now enables compactor retention and uses `limits_config.retention_stream` for namespace-specific retention.

## Review Notes
- The Argo CD log level and format keys in `argocd-cmd-params-cm` are valid for current Argo CD documentation.
- The `kubectl rollout restart` commands are valid for Deployments and StatefulSets.
- The Alloy DaemonSet snippet assumes the referenced `alloy` ServiceAccount has Kubernetes API permissions to discover and tail pod logs.
