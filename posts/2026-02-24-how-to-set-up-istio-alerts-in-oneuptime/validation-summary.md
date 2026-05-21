# Validation Summary: How to Set Up Istio Alerts in OneUptime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- OneUptime
- Kubernetes
- kubectl
- istioctl
- Prometheus / PromQL-style metric queries
- Envoy metrics

## Sources Consulted
- OneUptime Metrics Monitor documentation: https://oneuptime.com/docs/en/monitor/metrics-monitor
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio check-inject documentation: https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Istio pilot-discovery metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html

## Issues Found
- The complete service outage query treated only HTTP 200 responses as successful, which would incorrectly flag services that return other successful 2xx responses such as 201 or 204. Changed the success matcher to `response_code=~"2.*"`.
- The mTLS certificate expiration alert used timestamp arithmetic. Istio exposes `citadel_server_root_cert_expiry_seconds`, which directly reports time remaining before root certificate expiry. Changed the alert condition to use that metric.
- The sidecar injection check only listed containers and filtered out lines without `istio-proxy`, but it did not verify whether injection should have applied to the workload. Added `istioctl experimental check-inject` and kept a container-presence check for existing pods.

## Review Notes
The post is technically valid as an alerting guide. The metric examples are intentionally conceptual and may need label or namespace tuning for a specific OneUptime ingestion pipeline, Prometheus exporter, and Istio telemetry customization.
