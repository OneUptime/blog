# Validation Summary: How to Visualize Service Mesh with Kiali and Istio

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Istio
- Kiali
- Kubernetes
- Helm
- Prometheus
- Grafana
- Jaeger
- Envoy sidecars
- Istio networking and security resources

## Sources Consulted
- Kiali Quick Start: https://kiali.io/docs/installation/quick-start/
- Kiali Installation Prerequisites: https://kiali.io/docs/installation/installation-guide/prerequisites/
- Kiali Accessing Kiali: https://kiali.io/docs/installation/installation-guide/accessing-kiali/
- Kiali CR Reference: https://kiali.io/docs/configuration/kialis.kiali.io/
- Kiali Traffic Health: https://kiali.io/docs/configuration/health/
- Kiali Prometheus configuration: https://kiali.io/docs/configuration/p8s-jaeger-grafana/prometheus/
- Kiali Topology feature documentation: https://kiali.io/docs/features/topology/
- Istio Kiali integration: https://istio.io/latest/docs/ops/integrations/kiali/
- Istio Visualizing Your Mesh task: https://istio.io/latest/docs/tasks/observability/kiali/
- Istio Download the Istio Release: https://istio.io/latest/docs/setup/additional-setup/download-istio-release/
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio Sidecar Injection: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Trace Sampling: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Kiali API package note: https://pkg.go.dev/github.com/kiali/kiali
- Kiali Operator CR example: https://github.com/kiali/kiali-operator/blob/master/crd-docs/cr/kiali.io_v1alpha1_kiali.yaml
- Istio 1.30 sample addons and Bookinfo manifests: https://github.com/istio/istio/tree/release-1.30/samples

## Issues Found
- The post referenced Istio 1.20 sample directories and raw GitHub URLs. Istio 1.20 is no longer supported as of June 23, 2026, so I updated the examples to Istio 1.30.1 / `release-1.30`, which is currently supported.
- The Kiali Helm and Kiali CR examples used deprecated `accessible_namespaces`. I replaced it with `deployment.discovery_selectors`, which is the current namespace discovery mechanism.
- Several Kiali external service examples used deprecated `in_cluster_url` and `url` fields. I replaced them with `internal_url` and `external_url`.
- The tracing example set `use_grpc: true` while pointing to Jaeger's HTTP query port 16686. I changed the internal URL to port 16685 for the gRPC example.
- The health, tracing, and Grafana examples edited a Kiali ConfigMap directly. Current Kiali documentation describes these settings in the Kiali CR, so I converted those snippets to `kind: Kiali` with `spec` configuration.
- The health-status diagram used fixed success-rate thresholds that did not match Kiali's documented threshold model. I replaced the fixed percentages with threshold-based Healthy, Degraded, Failure, and No Health Information states.
- The production anti-affinity example used `pod_anti_affinity`, which is not the Kiali CR field name. I changed it to `deployment.affinity.pod_anti`.
- The server configuration comment incorrectly described `web_fqdn`, `web_port`, and `web_schema` as read-only mode. I corrected the comment to describe browser-facing host and scheme settings.
- The Bookinfo traffic generation command only handled load balancer IPs. I added a hostname fallback for environments that expose an ingress hostname instead of an IP.
- The post presented Kiali API calls as stable programmatic integration points. Kiali documents its API as internal and not guaranteed stable, so I changed the wording to frame those calls as ad hoc diagnostics.

## Review Notes
The post is now technically valid for a current Istio/Kiali workflow. Kiali's internal API examples may still change across releases, so they should remain diagnostic examples rather than recommended long-term integration contracts.
