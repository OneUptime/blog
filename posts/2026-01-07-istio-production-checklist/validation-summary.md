# Validation Summary: How to Prepare Istio for Production Deployment

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy
- Prometheus and PrometheusRule
- Grafana
- Jaeger
- cert-manager
- Bash
- Kubernetes NetworkPolicy, RBAC, CronJob, Service, and Deployment resources

## Sources Consulted
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio Platform Setup: https://istio.io/latest/docs/setup/platform-setup/
- IstioOperator Options: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio MeshConfig Reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio PeerAuthentication Reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy Reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio DestinationRule Reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Sidecar Reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio EnvoyFilter Reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio pilot-discovery metrics and environment variables: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio TLS Configuration and Auto mTLS: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/
- Prometheus promtool documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/

## Issues Found
- The Kubernetes version check used `kubectl version --short`, which is no longer part of the current generated kubectl reference. Changed it to `kubectl version`.
- The post claimed "Istio 1.20+ requires Kubernetes 1.26+", but Istio support is release-specific and the current supported Kubernetes versions differ by Istio minor version. Changed the comment to tell readers to check the support matrix for their chosen Istio release.
- The "Resource Sizing and Limits" section was missing Markdown heading markup, which broke the table of contents anchor. Changed it to `## Resource Sizing and Limits`.
- The high-traffic Deployment example omitted the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added a selector and labels.
- Several Istio security and networking examples used older `v1beta1` API versions where the current Istio docs use `v1`. Updated PeerAuthentication, AuthorizationPolicy, DestinationRule, and Sidecar examples to `v1`.
- The mesh-wide DestinationRule example implied that a wildcard rule is required for strict mTLS. Istio Auto mTLS already originates mTLS for in-mesh workloads when possible. Reworded the snippet as an optional per-service DestinationRule.
- The certificate management example used invalid or misleading MeshConfig fields and proxy metadata for certificate rotation. Replaced it with a valid IstioOperator CA-provider example and retained cert-manager for gateway certificates.
- The namespace-wide Sidecar example used an empty `workloadSelector`, while Istio's documented namespace-wide pattern is to omit `workloadSelector`. Removed the empty selector and clarified the comment.
- The canary upgrade script used a non-existent `promql` command inside the Prometheus pod. Replaced it with `promtool query instant`, which is documented by Prometheus.
- The LoadBalancer readiness check only accepted an IP address, but Kubernetes LoadBalancer ingress can also expose a hostname. Updated the jsonpath check to accept either IP or hostname.
- The deprecated API check only inspected a subset of Istio resources and only looked for `v1alpha3`. Expanded it to include the updated security and networking resources and detect both `v1alpha3` and `v1beta1` where those are deprecated for the resources being checked.

## Review Notes
Some examples remain intentionally environment-specific: Prometheus deployment names, ServiceMonitor labels, gateway service account names, dashboard IDs, and Pod Security labels may need adjustment for Helm, Operator, ambient mode, managed add-ons, or organization-specific observability stacks. The EnvoyFilter example still uses `networking.istio.io/v1alpha3` because EnvoyFilter is documented with that API version and should be treated carefully across Istio and Envoy upgrades.
