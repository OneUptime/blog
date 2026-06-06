# Validation Summary: How to Calculate the True Cost of Running OpenTelemetry at Scale

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry SDKs
- OTLP exporter
- Collector processors: batch, filter, attributes, tail sampling
- Kubernetes Deployments and DaemonSets
- Prometheus scraping
- AWS EC2, Fargate, S3, and cross-AZ data transfer pricing
- Jaeger, Grafana Tempo, Elasticsearch, and managed observability backends

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector Docker installation documentation: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector releases repository: https://github.com/open-telemetry/opentelemetry-collector-releases
- OpenTelemetry Collector contrib repository: https://github.com/open-telemetry/opentelemetry-collector-contrib
- AWS EC2 On-Demand pricing: https://aws.amazon.com/ec2/pricing/on-demand/
- AWS Fargate pricing: https://aws.amazon.com/fargate/pricing/
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/
- AWS cross-AZ transfer pricing examples: https://docs.aws.amazon.com/

## Issues Found
- The Collector internal metrics example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Updated the snippet to use the current `service.telemetry.metrics.readers.pull.exporter.prometheus` shape.
- The internal metrics example listed raw Collector metric names while exposing metrics through Prometheus. Added `without_type_suffix: true` and `without_units: true` so the scraped metric names match the names shown in the post.
- The first Collector configuration snippet referenced `otlp`, `batch`, and `otlp/backend` without defining those components. Added minimal receiver, processor, and exporter definitions so the example is structurally valid.
- The Kubernetes Deployment example was missing the required `spec.selector` and matching `template.metadata.labels` fields for an `apps/v1` Deployment. Added both fields.
- The Collector image tag was pinned to `0.96.0`, which is outdated for a 2026 review. Updated it to `0.153.0`, the current Collector release available at review time.
- The DaemonSet optimization guidance said applications can send telemetry to `localhost` to reach a DaemonSet Collector. In Kubernetes, `localhost` inside an application pod refers to that pod's network namespace, not another DaemonSet pod on the node. Updated the text to describe node-local endpoints through sidecars, host networking, hostPort, or node IP, and clarified same-AZ forwarding.
- The cross-AZ reduction claim gave a fixed 60-80% reduction without enough topology context. Reworded it to state that reduction depends on how much traffic can stay in the same availability zone.
- The network transfer Mermaid diagram used subgraph labels with hyphens and spaces directly in the identifier position. Updated the diagram to use explicit subgraph IDs with quoted display labels.
- Added `error_mode: ignore` to the filter processor example to match current OpenTelemetry examples and avoid unexpected pipeline failures from filter expression evaluation errors.

## Review Notes
The post's cost numbers are reasonable illustrative estimates, but real AWS and observability backend pricing is region-, vendor-, contract-, and retention-dependent. The sizing and compression ratios should be treated as starting assumptions that require load testing against the user's Collector distribution and backend.
