# Validation Summary: How to Configure Health Checks for Prometheus ServiceMonitor in ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD custom resource health checks
- Argo CD sync hooks
- Kubernetes ConfigMaps and Jobs
- Prometheus Operator CRDs
- Prometheus ServiceMonitor, PodMonitor, PrometheusRule, Prometheus, Alertmanager, and AlertmanagerConfig resources
- Lua health check scripts
- promtool
- kubectl, curl, and jq

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus promtool documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus GitHub releases: https://github.com/prometheus/prometheus/releases
- Linked OneUptime blog URLs were checked and returned HTTP 200.

## Issues Found
- The ServiceMonitor, PodMonitor, PrometheusRule, and AlertmanagerConfig health examples checked `obj.status.conditions` for `Reconciled`, `Available`, or `Ready` conditions. The current Prometheus Operator API documents configuration-resource status as `status.bindings[].conditions[]`, with `Accepted` as the supported condition type when the `StatusForConfigurationResources` feature gate is enabled. Updated those Lua examples to inspect `status.bindings` and `Accepted` conditions.
- The validation hook claimed to validate all PrometheusRule resources, but the Job only runs `promtool` against files mounted from a ConfigMap. Updated the text and comment to clarify that rule files must be exported to the ConfigMap first.
- Replaced the mutable `prom/prometheus:latest` image tag with `prom/prometheus:v3.11.3`, the current latest stable Prometheus release listed on GitHub at review time.
- Updated the best-practice note about newer Prometheus Operator status reporting to mention the `StatusForConfigurationResources` feature gate.

## Review Notes
The health checks remain intentionally limited because Argo CD custom health scripts can only inspect the resource object passed to the script. ServiceMonitor target reachability still needs verification through Prometheus targets or operator-generated status when available.
