# Validation Summary: How to Configure Namespace Monitoring with Separate Prometheus Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes RBAC
- Prometheus
- Prometheus Kubernetes service discovery
- Prometheus Operator
- Prometheus federation
- Prometheus alerting rules
- Grafana datasource provisioning
- Go client-go

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Service DNS documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator getting started / RBAC guide: https://prometheus-operator.dev/docs/platform/platform-guide/
- Prometheus Operator exposing Prometheus and Alertmanager: https://prometheus-operator.dev/docs/platform/exposing-prometheus-and-alertmanager/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/

## Issues Found
- The first namespace-scoped Kubernetes Role included cluster-scoped `nodes` and `nodes/metrics` resources. Kubernetes documentation states node resources require a ClusterRole to be effective, so these entries were removed from the namespaced Role because the example only scrapes pods and services in `team-alpha`.
- The Prometheus Operator example referenced a `prometheus` ServiceAccount without defining it, and did not grant the ServiceAccount namespaced discovery permissions. Added the ServiceAccount, Role, and RoleBinding needed for namespaced service, endpoint, EndpointSlice, pod, and ConfigMap discovery.
- The Prometheus Operator example used `serviceMonitorNamespaceSelector` and `podMonitorNamespaceSelector` with `matchLabels: name: team-beta`, but the namespace did not have that label. Added the namespace label so the selectors match as written.
- The Prometheus Operator example omitted `serviceMonitorSelector` and `podMonitorSelector`. In the Prometheus Operator API, null monitor selectors match no objects, so the example would not scrape the included ServiceMonitor or PodMonitor. Added empty selectors to match all monitors in the selected namespace.
- The alerting section added a PrometheusRule, but the Prometheus resource did not select rules. Added `ruleSelector` and `ruleNamespaceSelector` to the Operator example so namespace rules are eligible for loading.
- The federation and Grafana examples referenced services that were not defined in the manifests. Added ClusterIP Services for `team-prometheus` and `prometheus-federation`.
- The central federation Deployment referenced a missing ServiceAccount and PVC. Added both resources.
- The central federation Deployment used two replicas sharing one `ReadWriteOnce` PVC. Changed it to one replica because a Deployment with multiple replicas sharing a single RWO volume is not a valid general-purpose HA Prometheus pattern.
- The Go example imported `corev1` but never used it, which would prevent compilation. Removed the unused import and added monitor/rule selectors to the generated Prometheus CR so it behaves like the corrected YAML example.

## Review Notes
- The examples still use `prom/prometheus:latest`, which is valid YAML and will run, but pinning an explicit Prometheus version would be better for reproducible production deployments.
- The namespace-per-Prometheus architecture is technically valid, but production environments should also plan Alertmanager routing, network policies, long-term storage, and cardinality controls.
