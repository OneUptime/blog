# Validation Summary: How to Configure Collector Agent and Gateway Topology for Large Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector contrib components
- OTLP/gRPC
- Kubernetes DaemonSet, Deployment, Service, and HorizontalPodAutoscaler
- Kubernetes headless services and client-side load balancing
- Tail-based sampling
- Collector internal telemetry and zpages

## Sources Consulted
- OpenTelemetry Collector gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector scaling guidance: https://opentelemetry.io/docs/collector/scaling/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector v0.96.0 gRPC config documentation and source: https://github.com/open-telemetry/opentelemetry-collector/tree/v0.96.0/config/configgrpc
- OpenTelemetry Collector contrib v0.96.0 load-balancing exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.96.0/exporter/loadbalancingexporter
- OpenTelemetry Collector contrib v0.96.0 tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.96.0/processor/tailsamplingprocessor
- OpenTelemetry Collector contrib v0.96.0 filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.96.0/processor/filterprocessor
- OpenTelemetry Collector contrib v0.96.0 Kubernetes attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.96.0/processor/k8sattributesprocessor

## Issues Found
- The agent `k8sattributes` example did not filter discovery to the local node. Added `filter.node_from_env_var: KUBE_NODE_NAME` and added the matching DaemonSet downward API environment variable, as recommended for DaemonSet agents in large clusters.
- The agent OTLP exporter claimed `balancer_name: round_robin` would load balance across gateway replicas while pointing at a normal ClusterIP service. Removed that field from the basic forwarding example because trace-aware distribution is handled later with the `loadbalancing` exporter, and client-side gRPC balancing requires a headless endpoint.
- The DaemonSet introduction claimed the manifest included appropriate RBAC, but the snippet only referenced a service account. Updated the wording to say the required `k8sattributes` RBAC must be created for that service account.
- The memory limiter explanation said it drops data at ingestion. Adjusted this to say it refuses new data before downstream processing, which better matches Collector behavior.
- The Kubernetes service load-balancing explanation described standard services as random or round-robin. Updated it to connection-level load balancing and clarified the long-lived gRPC connection issue.
- The monitoring section referenced `otelcol_processor_dropped_spans`, which is not a current general Collector internal telemetry metric. Replaced it with documented receiver refusal and exporter enqueue/send failure counters.

## Review Notes
The Collector image is pinned to `otel/opentelemetry-collector-contrib:0.96.0`, which is valid for the shown component set but is old relative to the current Collector release stream. Future updates should consider refreshing the image version and revalidating component stability levels and internal telemetry names.
