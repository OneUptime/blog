# Validation Summary: How to Design Stateless OpenTelemetry Collector Architectures

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP receiver and exporter
- OpenTelemetry Collector batch, resource detection, memory limiter, and tail sampling processors
- OpenTelemetry Collector load-balancing exporter
- Kubernetes Horizontal Pod Autoscaler

## Sources Consulted
- OpenTelemetry Collector gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector agent-to-gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/other/agent-to-gateway/
- OpenTelemetry Collector load-balancing exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector exporter helper documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Kubernetes HorizontalPodAutoscaler v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The tail-sampling Tier 1 example used `loadbalancing`, which is now a deprecated alias for the load-balancing exporter. Changed it to `load_balancing` and updated the pipeline exporter reference.
- The Tier 1 load-balancing exporter configured `protocol.otlp.endpoint`, but the official load-balancing exporter documentation says the OTLP sub-exporter endpoint should not be set because it is supplied by the resolver. Removed that endpoint and kept the DNS resolver hostname and port as the backend source.
- The Tier 1 example described trace-ID routing but relied on the default routing behavior. Added `routing_key: traceID` so the configuration matches the explanation explicitly.
- The Tier 1 internal OTLP connection did not specify TLS behavior. Added `tls.insecure: true` for the in-cluster example, matching the plaintext Kubernetes service pattern shown in the official examples.
- The Tier 2 sampler snippet referenced `receivers: [otlp]` in the service pipeline but did not define an OTLP receiver. Added the receiver definition.
- The retry comment said to let the load balancer retry elsewhere, which could imply the load balancer retries data already accepted by a failed collector. Reworded it to clarify that clients retry via the load balancer.

## Review Notes
- The post is technically valid after the fixes. The recovery time numbers are reasonable examples, but real startup and rescheduling times depend on image pull behavior, node capacity, scheduler state, and readiness probe settings.
- The load-balancing exporter documentation notes practical caveats during backend topology changes; trace affinity can be disrupted briefly when the resolved backend set changes.
