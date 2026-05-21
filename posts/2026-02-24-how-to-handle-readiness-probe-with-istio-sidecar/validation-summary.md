# Validation Summary: How to Handle Readiness Probe with Istio Sidecar

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes readiness probes
- Kubernetes sidecar containers
- Kubernetes readiness gates and EndpointSlices
- Istio sidecar injection
- Istio probe rewriting
- Istio ProxyConfig and `holdApplicationUntilProxyStarts`
- Istio egress traffic configuration
- kube-state-metrics and Prometheus

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes documentation: Sidecar Containers - https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes documentation: EndpointSlices - https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Istio documentation: Health Checking of Istio Services - https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio documentation: Sidecar Injection Problems - https://istio.io/latest/docs/ops/common-problems/injection/
- Istio documentation: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/
- Istio documentation: PeerAuthentication - https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio documentation: Understanding TLS Configuration - https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio documentation: Accessing External Services - https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- kube-state-metrics documentation: Endpoint Metrics - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/service/endpoint-metrics.md

## Issues Found
- Istio probe rewrite port was incorrect. The post said rewritten application probes go through port `15021`; Istio's health-check documentation shows application probe rewrites using the sidecar agent on port `15020`. Updated the text and debugging command to use `15020` for `/app-health/...`.
- Kubernetes native sidecar version guidance was imprecise. The post said Kubernetes `1.28+` handles sidecars as a native concept; Kubernetes 1.28 introduced the feature as alpha, while it is enabled by default from 1.29 and stable in current Kubernetes. Updated the wording.
- The sidecar readiness explanation implied the application readiness probe alone determines pod readiness. Istio injects a readiness probe for the proxy container, and Kubernetes pod readiness depends on all containers being ready. Updated the text to say the pod is marked ready only when both the application container and proxy container are ready.
- The database egress section incorrectly tied external database failures to `STRICT` mTLS directly. Istio `PeerAuthentication` controls inbound mTLS acceptance; outbound TLS is configured with `DestinationRule`, and external services can be handled with `ServiceEntry` or traffic-capture exclusions. Updated the explanation while keeping the existing exclusion annotation example.
- The Prometheus example used `kube_endpoint_address_available`, which is deprecated in newer kube-state-metrics releases. Updated it to `kube_endpoint_address{endpoint="api-service",ready="true"}`.

## Review Notes
The YAML snippets use current Kubernetes API fields and valid Istio annotations. The `exec` probe examples assume `/bin/sh` and `curl` are present in the application image; minimal container images may need a different probe implementation.
