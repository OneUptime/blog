# Validation Summary: How to Use Prometheus to Scrape Application Metrics Alongside Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Prometheus
- Prometheus Operator PodMonitor
- Kubernetes
- Istio PeerAuthentication
- Istio Telemetry API
- PromQL
- Go Prometheus client

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio secure metrics scraping documentation: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Istio application requirements and sidecar ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Prometheus configuration reference for Kubernetes service discovery and relabeling: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Operator API reference for PodMonitor: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The introduction overstated that Prometheus cannot directly scrape application metrics after sidecar injection. Updated it to clarify that direct scraping may go through Envoy and must match the mesh mTLS policy.
- The sample Deployment exposed an unnamed metrics port while the later PodMonitor referenced `http-metrics`. Added the matching port name.
- The PodMonitor comment incorrectly said `filterRunning` skips the Envoy sidecar. Updated it to reflect the Prometheus Operator behavior: it drops pods that are not in the Running phase.
- The plain Prometheus application scrape config had a relabel step that would replace `__address__` with only the port before rebuilding the address. Removed the broken step.
- The plain Prometheus Istio sidecar scrape example rewrote targets to port 15020 even though the separate Envoy telemetry endpoint is port 15090. Updated it to 15090.
- The Istio reserved ports list omitted current sidecar ports 15008 and 15053 and incorrectly marked 15090 as deprecated. Updated the list to match current Istio documentation.
- The mTLS exception example used `PERMISSIVE` for a strict namespace. Updated it to `DISABLE`, matching Istio's documented port-level exception pattern for plaintext scraping on a workload port.
- The Prometheus-with-sidecar explanation implied transparent sidecar interception is enough for Prometheus scraping. Updated it to describe using Istio-issued certificates for direct scraping.
- The Go client example was fenced as YAML and used YAML-style comments. Changed the fence to `go` and comments to Go syntax.
- The annotation troubleshooting command piped kubectl JSONPath output through `python3 -m json.tool`, which is not reliable for that JSONPath expression. Replaced it with explicit JSONPath lookups for the relevant annotations.

## Review Notes
The post is now technically consistent with current Istio and Prometheus documentation. One future improvement would be to call out that metrics merging can be a poor fit when application metrics collide with Istio metric names or when Prometheus must scrape metrics over TLS.
