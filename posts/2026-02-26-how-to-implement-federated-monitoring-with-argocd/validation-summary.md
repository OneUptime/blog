# Validation Summary: How to Implement Federated Monitoring with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD ApplicationSet
- Kubernetes
- Helm charts
- kube-prometheus-stack
- Prometheus federation
- Prometheus Operator
- Thanos
- External Secrets Operator
- Grafana
- Alertmanager

## Sources Consulted
- Argo CD ApplicationSet Cluster Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus feature flags documentation: https://prometheus.io/docs/prometheus/latest/feature_flags/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- kube-prometheus-stack chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Bitnami Thanos chart values and README: https://github.com/bitnami/charts/tree/main/bitnami/thanos
- Grafana Helm chart documentation: https://grafana.com/docs/grafana/latest/installation/helm/
- Grafana community Helm chart values: https://github.com/grafana-community/helm-charts/blob/main/charts/grafana/values.yaml
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/main/api/externalsecret/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## Issues Found
- The introduction claimed the shown stack provides a unified view of logs, but the implementation only covers metrics and alerts. Changed the wording to "metrics and alerts."
- The ApplicationSet examples used cluster names directly in Kubernetes object names. Changed the application name templates to use `nameNormalized`, matching Argo CD guidance for valid Kubernetes names.
- The leaf Prometheus example enabled `remote-write-receiver` under a comment about exposing federation. Prometheus federation uses the `/federate` endpoint and does not require the remote write receiver feature. Removed that feature flag.
- The central Prometheus federation example used in-cluster Kubernetes service DNS names for other clusters. Replaced them with HTTPS routable endpoint placeholders because Kubernetes `svc` DNS only resolves inside its own cluster unless additional multi-cluster DNS/networking is configured.
- The kube-prometheus-stack, Bitnami Thanos, Thanos sidecar image, and Grafana chart versions were stale. Updated them to current versions verified from official chart/release sources.
- The Thanos sidecar example configured the sidecar but did not enable the kube-prometheus-stack Thanos sidecar services. Added `thanosService.enabled` and `thanosServiceExternal.enabled` so Thanos Query can reach sidecar gRPC endpoints.
- The Bitnami Thanos example used service names that depend on Helm release naming but did not set a release name. Added `releaseName: thanos`, which makes the referenced `thanos-storegateway` service and Grafana datasource names line up with the chart helpers.
- The Thanos Query sidecar store addresses used invalid cross-cluster Kubernetes DNS names. Replaced them with routable Thanos sidecar gRPC endpoint placeholders.
- The Grafana datasource pointed at Thanos Query while query-frontend was enabled. Updated it to point at the Thanos Query Frontend service.
- The Alertmanager route example used deprecated `match` blocks. Replaced them with `matchers`.
- The PagerDuty receiver used `service_key_file`, which is for the older PagerDuty Prometheus integration. Replaced it with `routing_key_file` for Events API v2.
- The Slack receiver omitted a webhook source. Added `global.slack_api_url_file` so the Slack receiver configuration is complete.
- The summary described Thanos retention as "unlimited." Changed this to "long-term retention" because the example configures finite retention periods.

## Review Notes
All YAML and JSON code blocks in the post were parsed successfully after the edits. The examples still use placeholder domains, storage classes, secrets, and cluster URLs that must be adapted for a real environment. Cross-cluster Prometheus federation and Thanos sidecar querying require secure routable network paths, service mesh, VPN, Gateway/API routing, or equivalent multi-cluster connectivity.
