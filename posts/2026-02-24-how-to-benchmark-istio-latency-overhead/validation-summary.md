# Validation Summary: How to Benchmark Istio Latency Overhead

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Istio sidecar mode and mTLS
- Envoy sidecar proxy behavior
- Fortio load testing
- Kubernetes Deployments, Services, namespaces, and kubectl
- Istio PeerAuthentication, Telemetry, and IstioOperator configuration
- jq JSON parsing

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio mutual TLS migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio security model: https://istio.io/latest/docs/ops/deployment/security-model/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio installation customization / IstioOperator documentation: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Kubernetes namespaces and DNS documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Kubernetes kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Fortio official documentation / repository: https://github.com/fortio/fortio and https://fortio.org/

## Issues Found
- The post said each proxy does a TLS handshake for every request. mTLS handshakes happen during connection setup, not for every request on a reused connection, so the wording now distinguishes per-request proxy work from connection setup and encryption/decryption overhead.
- The echo-server section claimed the benchmark measures "only" proxy overhead. Fortio still includes minimal application, Kubernetes networking, and measurement overhead, so the wording now says it minimizes application processing time and focuses on proxy overhead.
- The PeerAuthentication example used `security.istio.io/v1beta1`. Istio's current reference uses the stable `security.istio.io/v1` API, so the example was updated.
- The tail-latency explanation said P99/P99.9 overhead is "always" larger and attributed spikes to TLS session renegotiation. That was too absolute and potentially inaccurate for modern TLS behavior, so it now says tail overhead is usually larger and cites CPU contention, new connection handshakes, and istiod configuration updates.
- The Telemetry example used `telemetry.istio.io/v1alpha1`. Istio's current reference uses the stable `telemetry.istio.io/v1` API, so the example was updated.

## Review Notes
The Fortio flags used in the post (`-c`, `-qps`, `-t`, `-json`, `-payload-size`, `-nocatchup`, and `-keepalive`) match Fortio's documented options. The Kubernetes manifests and kubectl examples are syntactically reasonable, though the benchmark remains intentionally simplified; production-grade benchmarking should also account for warm-up, pod placement, CPU limits, node isolation, and repeated runs.
