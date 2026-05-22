# Validation Summary: How to Calculate Sidecar CPU Requirements for Istio

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio sidecar mode
- Envoy sidecar proxy
- Kubernetes CPU requests and limits
- Kubernetes `kubectl`
- Prometheus and cAdvisor metrics
- Istio Telemetry API
- Istio AuthorizationPolicy
- Istio Sidecar resource
- Istio DestinationRule connection pooling

## Sources Consulted
- Istio Performance and Scalability: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API metrics task: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio Installing the Sidecar: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Envoy admin interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin
- Prometheus cAdvisor guide: https://prometheus.io/docs/guides/cadvisor/
- cAdvisor Prometheus metrics reference: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md

## Issues Found
- The Telemetry examples used `apiVersion: networking.istio.io/v1`. Changed both examples to `apiVersion: telemetry.istio.io/v1`, which is the current API group documented for Istio `Telemetry` resources.
- The `kubectl exec` example described `/server_info` as Envoy CPU stats. Changed the comment to say it returns Envoy runtime and build information, matching Envoy's admin API behavior.

## Review Notes
The CPU sizing tables and formula are presented as practical estimates, not guarantees. Official Istio performance documentation confirms that sidecar CPU varies with request rate, payload size, protocol, connection count, worker threads, and telemetry features, and reports about 0.20 vCPU for a sidecar handling 1000 HTTP requests per second with 1 KB payloads and mTLS in its Istio 1.24 benchmark. The post correctly tells readers to validate sizing with their own measurements.
