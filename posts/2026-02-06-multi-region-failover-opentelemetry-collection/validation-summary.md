# Validation Summary: How to Set Up Multi-Region Failover for OpenTelemetry Collection

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry Collector and Collector Contrib
- OpenTelemetry Collector failover connector
- OpenTelemetry Collector OTLP, Kafka, file storage, health check, filter, batch, resource, and memory limiter components
- AWS Route 53 failover routing and health checks
- AWS cross-region networking and data transfer pricing
- Kubernetes Deployments, probes, topology spread constraints, PodDisruptionBudget, and NetworkPolicy
- Prometheus / PromQL for Collector self-metrics

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector connectors list: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector failover connector documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/failoverconnector
- OpenTelemetry Collector file storage extension documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/storage/filestorage
- OpenTelemetry Collector Kafka exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector filter processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor
- AWS Route 53 ChangeResourceRecordSets API reference: https://docs.aws.amazon.com/Route53/latest/APIReference/API_ChangeResourceRecordSets.html
- AWS Route 53 create-health-check CLI reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/route53/create-health-check.html
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Prometheus histogram and query function documentation: https://prometheus.io/docs/practices/histograms/ and https://prometheus.io/docs/prometheus/latest/querying/functions/
- AWS EC2 On-Demand pricing and data transfer pricing page: https://aws.amazon.com/ec2/pricing/on-demand/

## Issues Found
- The Kafka exporter example used top-level `topic` and `encoding` fields. Updated it to current signal-specific `traces`, `metrics`, and `logs` topic/encoding configuration.
- The `file_storage` extension example included `max_file_size_mib`, which is not a valid current file storage extension field. Removed it.
- The failover connector `priority_levels` listed exporter IDs instead of pipeline IDs. Updated the example to use `traces/primary`, `traces/secondary`, and `traces/dlq` pipeline IDs.
- The failover connector example used deprecated `retry_gap` and `max_retries` settings. Removed them and kept `retry_interval`.
- The Route 53 health check example used HTTPS and `/health`, but the Collector health check extension configuration shown exposes HTTP on `/` by default. Updated the health check example to `HTTP` and `/`.
- The PromQL examples used raw Collector metric names and implied Collector self-metrics could be grouped by telemetry resource attributes. Updated the examples to use Prometheus `_total` counter names and exporter-level grouping.
- The Kubernetes image tag was pinned to the outdated `otel/opentelemetry-collector-contrib:0.96.0`. Updated it to `0.153.0`, the current release found during review.
- The NetworkPolicy failover test blocked all `10.0.0.0/8` egress, which could also block the secondary backend and cluster services. Changed it to an explicit placeholder CIDR for the primary backend.
- The shell test read raw Prometheus counter samples and could return multiple matching series. Updated the `awk` commands to aggregate matching samples and renamed the output from "rate" to "sent spans".
- The filter processor example intended to keep critical spans, but filter processor conditions drop matching telemetry and the `duration` expression was not valid current OTTL. Rewrote it to drop non-error spans whose duration is at most five seconds using `(span.end_time - span.start_time) <= Duration("5s")`.

## Review Notes
- The architecture is directionally sound, but real production failover still depends on backend-specific ingestion, deduplication, retention, and query behavior.
- The automated shell test is illustrative; in production, the metric checks should use PromQL rates over a time window rather than comparing raw counter samples to zero.
- AWS cross-region pricing varies by source region, destination region, and networking service path. The post's cost example remains acceptable as an example, but readers should check current pricing for their exact region pair.
