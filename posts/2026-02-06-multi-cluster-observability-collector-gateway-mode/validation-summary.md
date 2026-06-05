# Validation Summary: How to Set Up Multi-Cluster Observability with Collector Gateway Mode

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Operator for Kubernetes
- Kubernetes DaemonSets, Deployments, Services, and headless Services
- OpenTelemetry Collector processors, receivers, exporters, and extensions
- OTLP over gRPC/HTTP
- Tail sampling
- Load balancing exporter
- TLS and mTLS
- AWS Route53 private DNS

## Sources Consulted
- OpenTelemetry Operator for Kubernetes: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Operator horizontal pod autoscaling: https://opentelemetry.io/docs/platforms/kubernetes/operator/horizontal-pod-autoscaling/
- OpenTelemetry Collector gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector internal telemetry: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration and TLS/mTLS guidance: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processors list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector exporters list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry tail sampling concepts: https://opentelemetry.io/docs/concepts/sampling/
- Tail sampling processor reference: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- Filter processor reference: https://pkg.go.dev/go.opentelemetry.io/collector/processor/filterprocessor
- Load balancing exporter reference: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/loadbalancingexporter
- AWS Route53 change-resource-record-sets command reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html

## Issues Found
- The OpenTelemetryCollector examples used components such as `k8sattributes`, `tail_sampling`, and `loadbalancing` without specifying a Collector distribution that includes them. Added `image: otel/opentelemetry-collector-k8s:0.153.0` to both Collector custom resources.
- The tail sampling policy named `cross-cluster` matched `k8s.cluster.name` against all listed production clusters, which would sample ordinary single-cluster traces from those clusters rather than only cross-cluster traces. Changed it to match an explicit `trace.cross_cluster: "true"` attribute.
- The load-balancer trace affinity explanation implied that generic load balancers can hash on trace ID from OTLP traffic. Clarified that plain OTLP/gRPC carries the trace ID inside the payload, so this requires explicit request metadata or an intermediate proxy; otherwise the Collector load balancing exporter is the practical option.
- The load balancing exporter example used a cluster-local headless service name for a cross-cluster agent. Changed it to an externally resolvable private DNS name and clarified that remote clusters need multi-cluster DNS or private DNS records for gateway pod IPs.
- The load balancing exporter snippet could be interpreted as replacing the OTLP exporter for all signals. Updated it so trace traffic uses `loadbalancing` while metrics and logs continue to use the regular OTLP exporter.
- The internal telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Replaced it with the current `readers.pull.exporter.prometheus.host` and `port` configuration.

## Review Notes
- The examples are structurally valid for the OpenTelemetry Operator and current Collector configuration style, but production deployments still need the referenced certificates, RBAC, service accounts, DNS records, and any required volume mounts for certificate files.
- Host metrics collection inside Kubernetes may require additional host filesystem mounts depending on which host metrics are needed and how the Collector image is deployed.
