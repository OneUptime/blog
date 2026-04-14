# Validation Summary: How to Monitor Dapr on AWS with CloudWatch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar metrics and configuration)
- AWS CloudWatch (metrics, alarms, Insights queries)
- OpenTelemetry Collector (Prometheus receiver, AWS EMF exporter)
- Fluent Bit (log shipping to CloudWatch Logs)
- Kubernetes (ConfigMaps, pod service discovery)
- AWS CLI (`cloudwatch put-metric-alarm`, `logs start-query`)

## Sources Consulted
- OpenTelemetry Collector Contrib — AWS EMF Exporter: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awsemfexporter
- AWS CLI `put-metric-alarm` reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/
- Dapr Configuration CRD spec: https://docs.dapr.io/operations/configuration/configuration-overview/
- Fluent Bit CloudWatch output plugin: https://docs.fluentbit.io/manual/pipeline/outputs/cloudwatch

## Issues Found

### 1. Incorrect OpenTelemetry Collector exporter name
- **What was wrong:** The exporter was named `awscloudwatch`, which does not exist in the OpenTelemetry Collector Contrib project.
- **What was changed:** Renamed to `awsemf` (AWS Embedded Metric Format exporter), which is the correct exporter for sending metrics to AWS CloudWatch. Updated both the exporter definition and the pipeline reference.
- **Why:** There is no `awscloudwatch` exporter. The `awsemf` exporter converts OpenTelemetry metrics to CloudWatch Embedded Metric Format and sends them via CloudWatch Logs, where they are automatically extracted as CloudWatch metrics.

### 2. Incorrect `--statistic` flag for percentile-based CloudWatch alarm
- **What was wrong:** The second alarm used `--statistic p99`, but the `--statistic` parameter only accepts `SampleCount`, `Average`, `Sum`, `Minimum`, or `Maximum`.
- **What was changed:** Changed `--statistic p99` to `--extended-statistic p99`.
- **Why:** Percentile statistics (p50, p90, p99, etc.) must use the `--extended-statistic` parameter in the AWS CLI `put-metric-alarm` command.

### 3. Incorrect Dapr pub/sub metric names
- **What was wrong:** Pub/sub metrics used the prefix `dapr_pubsub_*` (e.g., `dapr_pubsub_ingress_count`).
- **What was changed:** Updated to `dapr_component_pubsub_*` prefix (e.g., `dapr_component_pubsub_ingress_count`, `dapr_component_pubsub_egress_count`, `dapr_component_pubsub_egress_latencies`). Fixed in both the metrics reference section and the alarm command.
- **Why:** In current Dapr versions, component-level metrics (including pub/sub) use the `dapr_component_` prefix.

## Review Notes
- The `date -d '1 hour ago'` syntax in the CloudWatch Insights query section is GNU coreutils-specific (Linux). On macOS, the equivalent is `date -v-1H`. Since this tutorial targets AWS/EKS (Linux), this is acceptable but worth noting for readers running CLI commands from macOS workstations.
- The `dapr_state_query_total` metric name in the "Key Dapr Metrics" section may not match the exact metric name in all Dapr versions. Readers should verify against their Dapr version's actual `/metrics` endpoint output.
- The Dapr Configuration uses `apiVersion: dapr.io/v1alpha1`, which is correct for current Dapr releases.
- The default Dapr metrics port 9090 used in the OTel scrape config is correct.
