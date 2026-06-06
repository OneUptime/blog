# Validation Summary: How to Configure the AWS CloudWatch Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib AWS CloudWatch receiver
- AWS CloudWatch metrics
- AWS IAM permissions
- OTLP HTTP exporter
- OpenTelemetry Collector processors: batch, attributes, resourcedetection, filter

## Sources Consulted
- OpenTelemetry Collector Contrib AWS CloudWatch receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/awscloudwatchreceiver/README.md
- OpenTelemetry Collector Contrib AWS CloudWatch receiver config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/awscloudwatchreceiver/config.go
- OpenTelemetry Collector receiver component list: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- AWS CloudWatch GetMetricData API reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_GetMetricData.html
- AWS CloudWatch metrics and dimensions documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/viewing_metrics_with_cloudwatch.html
- AWS CloudWatch permissions reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/permissions-reference-cw.html
- AWS CloudWatch pricing: https://aws.amazon.com/cloudwatch/pricing/
- OneUptime host OpenTelemetry Collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The receiver examples used an unsupported top-level `collection_interval` and `namespaces` schema with nested `metrics`, `statistic`, `unit`, and dimension value arrays. Updated the examples to the current `metrics.collection_interval`, `metrics.period`, `metrics.delay`, and `metrics.queries` schema with `namespace`, `metric_name`, `dimensions`, and `stats`.
- The post implied the receiver supports explicit `access_key_id` and `secret_access_key` fields. Removed those fields from Collector snippets and clarified that access keys should be supplied through the AWS SDK credential chain, such as environment variables or credentials files.
- The IAM policy included `cloudwatch:GetMetricStatistics` and several AWS service describe/list permissions as part of a minimal metrics policy. Reduced the minimal policy to `cloudwatch:GetMetricData` and `cloudwatch:ListMetrics`, which matches the current receiver's metrics APIs.
- The production receiver example included unsupported receiver-level `timeout` and `retry_on_failure` settings. Removed them and kept retry, timeout, and queue settings on the OTLP HTTP exporter where those settings are supported.
- The filter processor examples used legacy `metrics.datapoint` configuration and `value_int`. Updated them to the current `metric_conditions` format with `datapoint.value_double`, and used the CloudWatch receiver's emitted metric name format.
- The "Filtering by Tags and Dimensions" section described tag filtering, but the receiver configuration supports CloudWatch dimensions for explicit queries. Renamed and adjusted the section to describe dimension filtering only.
- Troubleshooting and summary wording referred to obsolete namespace selection and top-level collection interval placement. Updated those references to current `metrics` configuration fields.

## Review Notes
- The AWS CloudWatch receiver is listed as alpha for metrics in the OpenTelemetry Collector Contrib distribution, so future schema changes are possible.
- YAML and JSON fenced blocks in the updated post were parsed successfully for syntax.
