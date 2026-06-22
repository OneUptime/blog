# Validation Summary: How to Collect Kubernetes Logs with Loki

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- Grafana Loki Helm charts
- Promtail
- Grafana Alloy migration context
- Kubernetes logging
- Kubernetes Events
- Kubernetes audit logging
- Kubernetes RBAC, ConfigMaps, Deployments, and DaemonSets
- LogQL
- Grafana dashboards

## Sources Consulted
- Grafana Loki Promtail agent documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki Promtail configuration reference: https://grafana.com/docs/loki/latest/send-data/promtail/configuration/
- Grafana Loki Promtail CRI pipeline stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/cri/
- Grafana Loki Promtail JSON pipeline stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/json/
- Grafana Loki Promtail multiline pipeline stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/multiline/
- Grafana Loki Helm installation documentation: https://grafana.com/docs/loki/latest/setup/install/helm/
- Grafana loki-stack Helm chart README: https://github.com/grafana/helm-charts/blob/main/charts/loki-stack/README.md
- Grafana Loki storage configuration documentation: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki Kubernetes Monitoring Helm tutorial: https://grafana.com/docs/loki/latest/send-data/k8s-monitoring-helm/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- VMware archived eventrouter repository: https://github.com/vmware-archive/eventrouter

## Issues Found
- The post presented Promtail and `loki-stack` as current production choices. Grafana marks Promtail as EOL as of March 2, 2026, and the `loki-stack` chart is deprecated. Updated the description, introduction, Helm comment, custom values heading, eventrouter note, and conclusion to frame these as legacy examples for existing deployments and to point new production deployments toward Grafana Alloy or another supported Loki client.
- The Loki TSDB configuration used `table_manager` retention. Current Loki documentation says TSDB retention is handled by the compactor and that table manager is deprecated for legacy index types. Replaced the `table_manager` block with `limits_config.retention_period`, `compactor`, and filesystem `storage_config` settings appropriate for the shown TSDB/filesystem example.
- The `kubernetes-events` Promtail scrape job discovered Endpoints in the `default` namespace, but the eventrouter manifest deploys a pod in `kube-system` and does not create a Service. Changed the scrape job to discover pods in `kube-system`, keep the `component=eventrouter` pod, parse its CRI/JSON output, attach event labels, and set `__path__` so Promtail tails the eventrouter log file.
- The troubleshooting command used `kubectl port-forward svc/promtail`, but the standalone Promtail DaemonSet manifest in the post does not define a Service. Updated the command to select a Promtail pod and port-forward to that pod.
- The Grafana dashboard variables snippet was marked as YAML even though it contained `label_values(...)` query expressions. Changed the code fence to `logql`.

## Review Notes
- The post remains technically useful for legacy Promtail environments, but new Kubernetes log collection content should prefer Grafana Alloy and the Grafana Kubernetes Monitoring Helm chart.
- The Heptio/VMware eventrouter project is archived. The post now calls this out, but future content should prefer a maintained events collector.
- YAML snippets in the post were parsed successfully with PyYAML after the code fence correction. Promtail, Helm, and kubectl binaries were not available in the local environment, so those examples were verified against official documentation rather than local CLI execution.
