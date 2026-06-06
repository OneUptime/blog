# Validation Summary: How to Configure the AWS CloudWatch Logs Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- AWS CloudWatch Logs exporter
- AWS CloudWatch EMF exporter
- OpenTelemetry Collector processors and connectors
- AWS CloudWatch Logs
- AWS CLI
- IAM policies
- CloudWatch Logs Insights
- CloudWatch metric filters and alarms

## Sources Consulted
- OpenTelemetry Collector Contrib AWS CloudWatch Logs exporter README and source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awscloudwatchlogsexporter
- OpenTelemetry Collector Contrib AWS EMF exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awsemfexporter
- OpenTelemetry Collector Contrib routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/routingconnector
- OpenTelemetry Collector Contrib filter, transform, filelog, log_dedup, and metricstransform processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor
- AWS CloudWatch Logs PutLogEvents API: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutLogEvents.html
- AWS CloudWatch Logs interface VPC endpoints: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/cloudwatch-logs-and-interface-VPC.html
- AWS CLI create-vpc-endpoint command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- AWS CloudWatch Logs Insights query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html

## Issues Found
- The CloudWatch Logs exporter examples used unsupported fields: `encoding`, nested `emf`, `retention_in_days`, and `max_events_per_batch`. Replaced them with supported `raw_log` and `log_retention` settings, and removed unsupported batch/exporter settings.
- Several examples used unsupported placeholder syntax such as `{service.name}`, `{host.name}`, `{ecs.cluster}`, and arbitrary resource attribute placeholders. Replaced them with supported exporter placeholders such as `{ServiceName}`, `{InstanceId}`, `{ClusterName}`, and `{TaskId}`.
- The multiple-log-group example used the old routing processor configuration shape. Updated it to use the current routing connector pattern with routed output pipelines.
- The audit filter and production filter examples used outdated filter processor syntax. Updated them to current `log_conditions` syntax and OTTL log paths.
- The transform examples used invalid OTTL expressions such as `Time()` without arguments and unqualified `trace_id.string` / `span_id.string` paths. Updated them to valid log-context paths.
- The EMF section incorrectly configured EMF under `awscloudwatchlogs` and placed metric processing in a logs pipeline. Updated it to use the `awsemf` exporter in a metrics pipeline.
- The ECS/EKS example copied AWS resource attributes into non-placeholder names and used those names in exporter templates. Updated it to use CloudWatch Logs exporter-supported AWS placeholders.
- The production example used the deprecated `dedup` processor name and unsupported exporter fields. Updated it to `log_dedup`, `log_retention`, and supported placeholders.
- The VPC endpoint command mixed route-table options with an interface endpoint use case. Updated it to create an Interface endpoint with subnets, security group, and private DNS enabled.
- The troubleshooting section said `InvalidSequenceTokenException` is caused by multiple collectors writing to the same stream. Updated it because current CloudWatch Logs `PutLogEvents` ignores sequence tokens and no longer returns that error for invalid tokens.
- The Logs Insights examples queried fields like `log.body` and `service.name`, which do not match the JSON wrapper emitted by the CloudWatch Logs exporter. Updated them to use `body`, `severity_text`, `attributes`, and `resource` fields.
- IAM examples omitted permissions needed by later retention and tagging examples. Added `logs:PutRetentionPolicy` and `logs:TagResource`.

## Review Notes
No local `otelcol` or `otelcol-contrib` binary was available in PATH, so full Collector config validation could not be run locally. The review was completed against current OpenTelemetry Collector Contrib source/docs and AWS documentation. The AWS CloudWatch Logs exporter remains alpha for logs, so future Collector releases may change its configuration surface.
