# Validation Summary: How to Plan Network Bandwidth for Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar mode
- Kubernetes
- Kubernetes NetworkPolicy
- Envoy xDS
- Prometheus and PromQL
- TLS and mutual TLS
- Distributed tracing

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/#istioctl-proxy-config-all
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio application requirements and port reference: https://istio.io/latest/docs/ops/deployment/application-requirements/#ports-used-by-istio
- Istio NetworkPolicy documentation: https://istio.io/latest/docs/setup/additional-setup/network-policy/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#rate
- TLS 1.3 RFC 8446: https://www.rfc-editor.org/rfc/rfc8446

## Issues Found
- The Telemetry example used `apiVersion: networking.istio.io/v1`, but Istio Telemetry resources use `telemetry.istio.io/v1`. Updated the API group so the manifest is valid.
- The post said `istiod` performs health checks. Istio sidecar health behavior is tied to Kubernetes health probe handling and sidecar status endpoints, not istiod directly health-checking workloads. Reworded this claim.
- The ongoing xDS formula included initial configuration size in the recurring estimate and referred to all later updates as deltas. Changed the formula to separate the one-time initial push from ongoing changed-configuration traffic.
- The NetworkPolicy example allowed ingress from `istio-system` to workload port `15017`, but `15017` is an istiod webhook container port, not a workload sidecar port. Updated the example to allow Prometheus scraping of sidecar Envoy metrics on `15090` and retain egress to istiod on `15012`.

## Review Notes
The bandwidth figures are reasonable planning estimates, but real values vary significantly by Istio version, mesh configuration, metric cardinality, Prometheus scrape setup, TLS version, connection reuse, and workload traffic shape. The Prometheus `container_network_transmit_bytes_total` metric availability depends on the cluster's Kubernetes/cAdvisor metrics pipeline.
