# Validation Summary: How to Configure Prometheus Service Discovery for Istio

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio
- Prometheus
- Kubernetes service discovery
- Prometheus Operator ServiceMonitor and PodMonitor CRDs
- kubectl
- jq

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio application requirements and ports documentation: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio secure Prometheus scraping documentation: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Prometheus configuration and Kubernetes service discovery documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The sidecar scrape example filtered on `__meta_kubernetes_pod_container_name=istio-proxy` and then rewrote every matching target to port `15090`. With Prometheus Kubernetes `pod` discovery, this can create duplicate targets when the sidecar has multiple declared ports. Changed the example to follow Istio's documented pattern of keeping targets whose `__meta_kubernetes_pod_container_port_name` matches `.*-envoy-prom`.
- The gateway scrape example used `endpoints` discovery and rewrote all service endpoint targets to `15090`, which can also create duplicate or misleading targets because gateway services commonly expose multiple service ports. Changed the example to use `pod` discovery and select the gateway's Envoy Prometheus port by container port name.
- The port `15020` description implied it was simply the pilot-agent metrics endpoint. Updated it to describe Istio's documented merged Prometheus telemetry endpoint from the Istio agent, Envoy, and application when metrics merging is enabled.
- The metrics merge section implied annotations are only added when explicitly configured. Updated the text to note that metrics merging is enabled by default in current Istio installs, while still showing how to enable it explicitly.
- The PodMonitor selector explanation described `security.istio.io/tlsMode` as a universally reliable selector. Reworded it to say the label is commonly added by Istio and clarified that `port: http-envoy-prom` selects the Envoy Prometheus port.

## Review Notes
- The examples assume conventional Istio sidecar and gateway port naming, especially `http-envoy-prom` / `*-envoy-prom`, which matches Istio's documented Prometheus scrape configuration.
- The post uses the `endpoints` discovery role for istiod. Prometheus documents that the Kubernetes Endpoints API is deprecated in Kubernetes v1.33+, and recommends `endpointslice` for newer clusters. The istiod example still matches Istio's official Prometheus integration example.
