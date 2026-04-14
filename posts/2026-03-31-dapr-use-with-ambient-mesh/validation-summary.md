# Validation Summary: How to Use Dapr with Ambient Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Istio Ambient Mesh (ztunnel, waypoint proxies)
- Kubernetes
- Prometheus (metrics querying)
- Zipkin (distributed tracing)

## Sources Consulted
- [Istio - Install with istioctl (Ambient)](https://istio.io/latest/docs/ambient/install/istioctl/) — verified `istioctl install --set profile=ambient --skip-confirmation` command
- [Istio - Add workloads to the mesh](https://istio.io/latest/docs/ambient/usage/add-workloads/) — verified `istio.io/dataplane-mode=ambient` namespace label
- [Istio - Configure waypoint proxies](https://istio.io/latest/docs/ambient/usage/waypoint/) — verified `istioctl waypoint apply -n production --enroll-namespace` command
- [Istio - Standard Metrics reference](https://istio.io/latest/docs/reference/config/metrics/) — verified reporter label values for ztunnel metrics
- [Istio - Verify mutual TLS is enabled](https://istio.io/latest/docs/ambient/usage/verify-mtls-enabled/) — confirmed ztunnel uses `reporter="source"` not `reporter="ztunnel"`
- [Istio - Installation Configuration Profiles](https://istio.io/latest/docs/setup/additional-setup/config-profiles/) — verified ambient profile components (istiod, ztunnel, istio-cni)
- [Dapr - Retry resiliency policies](https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/) — verified `policy: exponential` and `maxRetries` field
- [Dapr - Resiliency spec](https://docs.dapr.io/reference/resource-specs/resiliency-schema/) — verified resiliency YAML structure
- [Dapr - Deploy on Kubernetes](https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/) — verified `dapr init -k` and `dapr status -k`
- [Dapr - Set up Zipkin](https://docs.dapr.io/operations/observability/tracing/zipkin/) — verified Zipkin port 9411

## Issues Found
1. **Incorrect Prometheus reporter label for ztunnel metrics**: The Prometheus query used `reporter="ztunnel"` which is not a valid label value. In Istio Ambient Mesh, ztunnel reports metrics using the standard Istio reporter labels (`reporter="source"` or `reporter="destination"`), not a custom `reporter="ztunnel"` value. Changed to `reporter="source"` and added a clarifying comment.

## Review Notes
- The Dapr resiliency YAML snippet omits the `maxInterval` field for the exponential retry policy. While not required (defaults to 60s), official Dapr docs always include it in exponential examples. This is acceptable for a brief illustration.
- The Zipkin port-forward command uses namespace `dapr-monitoring`. Official Dapr docs deploy Zipkin to the `default` namespace, while `dapr-monitoring` is used for Prometheus/Grafana. Using `dapr-monitoring` for Zipkin is a reasonable organizational choice but doesn't match default Dapr documentation. Not changed since this is a deployment convention choice, not a technical error.
- The ambient profile components comment ("no ingress-gateway sidecar injector") is slightly ambiguous in wording but technically correct — the ambient profile does not deploy an ingress gateway, and ambient namespaces do not use sidecar injection.
