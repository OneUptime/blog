# Validation Summary: How to Alert on Felix Metrics in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Felix
- Kubernetes
- kubectl
- Prometheus
- Prometheus Operator ServiceMonitor
- Grafana
- Alertmanager

## Sources Consulted
- Calico docs, Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico docs, Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico docs, FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes docs, kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes docs, kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes docs, JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The description claimed the post configured Prometheus alert rules and covered IPAM allocation errors, but the post only configures Felix metric scraping and discusses dataplane failures and policy calculation latency. Updated the description to match the actual technical content.
- The introduction described dataplane failures as Felix failing to program iptables rules. Calico documents `felix_int_dataplane_failures` as data plane update failures that will be retried, and Felix can run with non-iptables dataplanes. Updated the wording to "apply data plane updates."
- The ServiceMonitor example selected `k8s-app: calico-node` directly but did not define a Service. Prometheus Operator ServiceMonitors select Services, and `endpoints[].port` refers to the Service port name. Added a headless Service with a named `http-metrics` port on 9091, matching Calico's documented Felix metrics port.

## Review Notes
- The `kubectl patch felixconfiguration default --type=merge -p ...` command aligns with Calico's documented Felix metrics enablement flow and uses JSON merge patch, which is appropriate for a custom resource.
- The `kubectl exec ... -- wget ...` commands use valid `kubectl exec` syntax, but they assume the `calico-node` image includes `wget`. Calico's official documentation uses `curl` for local metric inspection; in minimal images, operators may need to use whichever HTTP client is available.
- The ServiceMonitor will only be scraped if the cluster has Prometheus Operator installed and the Prometheus resource selects ServiceMonitors in `calico-system`.
