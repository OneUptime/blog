# Validation Summary: How to Monitor Certificate Expiration in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istiod certificate authority metrics
- Envoy sidecar metrics
- Prometheus and PrometheusRule
- Grafana dashboards
- Kubernetes ConfigMaps and CronJobs
- OpenSSL, kubectl, istioctl, jq

## Sources Consulted
- Istio pilot-discovery command reference and exported metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio certificate management documentation: https://istio.io/latest/docs/tasks/security/cert-management/
- Istio plug-in CA certificates documentation: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio in-mesh certificate management documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/manage-mesh-certificates/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template reference: https://prometheus.io/docs/prometheus/2.55/configuration/template_reference/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Envoy listener TLS statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats
- Grafana visualization and threshold documentation: https://grafana.com/docs/grafana/latest/panels-visualizations/

## Issues Found
- Corrected the claim that Istio does not auto-rotate root certificates. Istio has self-signed root certificate rotation controls, while plugged-in CA certificate rotation remains operator-managed.
- Replaced the istiod metrics check that executed `curl` inside the istiod container with a `kubectl port-forward` workflow, because the monitoring endpoint is exposed on port 15014 and the container image should not be assumed to include curl.
- Added missing Istio CA error metrics for CSR signing and identity extraction failures, and updated the issuance failure alert to cover those cases.
- Fixed Prometheus alert descriptions that used `humanizeTimestamp` on a duration expression. The alert expression returns seconds remaining, so `humanizeDuration` is correct.
- Fixed the bulk workload certificate script so it actually checks pods across all namespaces and passes the namespace to `istioctl proxy-config secret`.
- Clarified that `istio-ca-root-cert` ConfigMaps are distributed to namespaces managed by istiod, not necessarily every namespace in the cluster.
- Corrected Grafana thresholds for "days remaining" so low values are red, medium values are yellow, and healthy values are green.
- Replaced deprecated Grafana `graph` panel types with `timeseries`.
- Corrected Envoy Prometheus queries to account for Envoy's stat-name prefixing of listener and cluster TLS counters.

## Review Notes
The CronJob example is a minimal health-check pattern. In a production cluster, the referenced service account needs RBAC allowing it to read the target ConfigMap, and the chosen image must include `kubectl`, `openssl`, and a compatible `date` implementation.
