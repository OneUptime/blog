# Validation Summary: How to Route High-Value Telemetry to Real-Time Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry routing connector
- OpenTelemetry Transformation Language (OTTL)
- OpenTelemetry logs and traces data model
- AWS S3 exporter for OpenTelemetry Collector
- AWS S3 storage classes and pricing
- AWS Athena and OpenX JSON SerDe
- Kubernetes deployment environment variables

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector routing connector documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/routingconnector
- OpenTelemetry Collector OTTL span context documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlspan
- OpenTelemetry Collector OTTL log context documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottllog
- OpenTelemetry logs data model: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- OpenTelemetry Collector AWS S3 exporter documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/awss3exporter
- OpenTelemetry Collector groupbytrace processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/groupbytraceprocessor
- AWS Athena CREATE TABLE documentation: https://docs.aws.amazon.com/athena/latest/ug/create-table.html
- AWS Athena OpenX JSON SerDe documentation: https://docs.aws.amazon.com/athena/latest/ug/openx-json-serde.html
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/

## Issues Found
- The Mermaid diagram described the routing component as a "Routing Processor", but the current Collector component is a routing connector. Changed the label to "Routing Connector".
- The Collector configuration was introduced as complete while it only configured traces and logs, not metrics. Narrowed the wording to "a configuration for traces and logs".
- The trace error routing condition used `attributes["otel.status_code"] == "ERROR"`, which is not the current OTTL span status path. Changed it to a `span` context condition using `status.code == STATUS_CODE_ERROR`.
- The resource-based routing conditions used `resource.attributes[...]` without an explicit context. Changed them to `resource` context conditions using `attributes[...]`, matching the routing connector examples.
- The log severity route used a raw numeric comparison. Changed it to `severity_number >= SEVERITY_NUMBER_WARN`, matching the OTTL log context enum and the OpenTelemetry log severity model.
- The S3 exporter comment incorrectly referred to the file exporter. Changed it to the AWS S3 exporter.
- The S3 exporter used the removed `s3_partition` option. Changed it to the current `s3_partition_format` option.
- The Athena example location included `/traces/`, but the shown S3 exporter configuration writes under the configured `otel/` prefix and partition path. Updated the location to the configured prefix root.
- The S3 Glacier pricing sentence was ambiguous. Clarified that the cited $0.004 per GB-month value refers to S3 Glacier Instant Retrieval in us-east-1.

## Review Notes
The routing connector and AWS S3 exporter are contrib components with alpha stability for the relevant signals, so production deployments should validate behavior against the exact Collector Contrib version they run. The post's warning about using `groupbytrace` before trace-aware routing is directionally correct, but teams should test their route conditions carefully because span-level conditions can still split traces if the routing logic does not make a whole-trace decision.
