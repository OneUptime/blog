# Validation Summary: How to Benchmark Istio CPU Overhead per Pod

## Status
validated

## Post Type
Tutorial / benchmarking guide

## Technologies Covered
- Istio sidecar mode
- Envoy sidecar proxies
- Kubernetes Deployments and kubectl
- Fortio load testing
- Prometheus and PromQL
- Kubernetes container CPU metrics

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio sidecar injection and customization docs: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio performance and scalability docs: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Fortio command documentation: https://github.com/fortio/fortio
- Prometheus query functions and subquery documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/ and https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
- The baseline benchmark referenced `deploy/load-generator` but did not deploy the workload files in the plain namespace. Added `kubectl apply -f echo-server.yaml -n bench-plain` and `kubectl apply -f load-generator.yaml -n bench-plain` so the benchmark setup matches the later Istio setup.
- The mTLS-disabling examples used older `v1beta1` Istio API versions for `PeerAuthentication` and `DestinationRule`. Updated them to the current stable `security.istio.io/v1` and `networking.istio.io/v1` API versions used in current Istio documentation.
- The Telemetry examples used `telemetry.istio.io/v1alpha1`. Updated them to the current stable `telemetry.istio.io/v1` API version.
- The Fortio payload-size loop tested a 1 MiB payload, which exceeds Fortio's default generated-payload cap. Added `-maxpayloadsizekb 2048` to allow the largest payload in the example.

## Review Notes
- The Prometheus CPU examples assume cAdvisor-style container metrics are available with `container`, `namespace`, and `pod` labels. Some managed Prometheus setups rename or relabel these metrics, so readers may need to adapt label names.
- The resource-limit guidance is a rule of thumb, not an Istio default recommendation. It is reasonable in the context of a benchmarking guide, but production values should be based on measured workload behavior and throttling data.
