# Validation Summary: Deploying Prometheus and Grafana with Helm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes
- kube-prometheus-stack
- Prometheus Operator
- Prometheus and PromQL
- Alertmanager
- Grafana
- Thanos
- Node Exporter
- kube-state-metrics

## Sources Consulted
- Helm command documentation: https://helm.sh/docs/helm/helm_repo_add/
- Helm usage documentation: https://helm.sh/docs/intro/using_helm/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- kube-prometheus-stack chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator Thanos integration documentation: https://prometheus-operator.dev/docs/platform/thanos/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager official example configuration: https://github.com/prometheus/alertmanager/blob/main/doc/examples/simple.yml
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Thanos releases: https://github.com/thanos-io/thanos/releases

## Issues Found
- The Prometheus PodDisruptionBudget was nested under `prometheus.prometheusSpec`, but kube-prometheus-stack configures it under `prometheus.podDisruptionBudget`. Moved the block to the correct chart value path.
- The Alertmanager routing and inhibition examples used deprecated `match`, `match_re`, `source_match`, and `target_match` fields. Updated them to `matchers`, `source_matchers`, and `target_matchers`.
- The PagerDuty receiver used `service_key`, which is for the older Prometheus integration type. Updated the example to `routing_key` for PagerDuty Events API v2.
- The `HighErrorRate` PromQL expression returned a ratio while the annotation displayed the value as a percentage. Updated the expression to multiply by 100 and compare against `5`.
- The `HighMemoryUsage` alert could fire incorrectly for containers without a memory limit because it divided by zero-valued limits. Added a matching condition requiring `container_spec_memory_limit_bytes > 0`.
- The Grafana dashboard ConfigMap used the HTTP API import wrapper shape with a top-level `dashboard` object. Provisioned dashboard files should contain the dashboard JSON itself, so the example now uses direct dashboard JSON and a current `timeseries` panel type.
- The Thanos sidecar example pinned an old image and omitted `version`, which the Prometheus Operator API recommends setting when `image` is specified. Updated the image to `v0.41.0` and added the matching `version`.

## Review Notes
- `helm` and `kubectl` were not installed in the local environment, so CLI syntax was checked against official documentation instead of local `--help` output.
- The sizing table is a reasonable starting point, but real Prometheus CPU, memory, and storage requirements depend heavily on scrape target count, label cardinality, scrape interval, retention, and rule load.
