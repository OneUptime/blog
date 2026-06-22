# Validation Summary: Loki vs CloudWatch Logs: Self-Hosted vs Managed Logging

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Grafana Loki
- LogQL
- Grafana Alloy
- OpenTelemetry Collector
- AWS CloudWatch Logs
- CloudWatch Logs Insights
- Amazon S3
- Amazon Data Firehose
- AWS Lambda
- Kubernetes/EKS

## Sources Consulted
- Grafana Loki LogQL documentation: https://grafana.com/docs/loki/latest/query/
- Grafana Loki LogQL reference: https://grafana.com/docs/loki/latest/query/query_reference/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki components documentation: https://grafana.com/docs/loki/latest/get-started/components/
- Grafana Loki storage documentation: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Promtail agent documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- AWS CloudWatch pricing: https://aws.amazon.com/cloudwatch/pricing/
- AWS CloudWatch Logs documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html
- AWS CloudWatch Logs Insights query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- AWS CloudWatch Logs Insights filter command: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Filter.html
- AWS CloudWatch Logs Insights parse command: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Parse.html
- AWS CloudWatch Logs Insights stats command: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Stats.html
- AWS CloudWatch Logs subscription filters: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html
- Amazon CloudWatch SLA: https://aws.amazon.com/cloudwatch/sla/
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/

## Issues Found
- Promtail was presented as a current Loki collection option. Promtail is EOL as of March 2, 2026, so references were updated to Grafana Alloy or the OpenTelemetry Collector.
- CloudWatch Logs pricing was labeled as 2024 and large-volume estimates assumed flat ingestion pricing. Updated the pricing note and scale table to account for current public tiered ingestion pricing after the first 10 TB/month.
- A CloudWatch Logs Insights query used `display errors / total * 100 as error_rate`; AWS documents aliases for `fields`, `parse`, `sort`, and `stats`, so this was changed to `fields errors / total * 100 as error_rate`.
- The Loki HA configuration placed `replication_factor` under `ingester.lifecycler.ring`, which is not the current configuration shape. Updated it to use `common.ring.replication_factor` with a `memberlist` ring example.
- The decision matrix weighted score did not match the displayed weights and scores. Updated the totals from `7.5 | 6.4` to `7.7 | 6.5`.
- References to "Kinesis Firehose" were updated to the current AWS service name, Amazon Data Firehose.

## Review Notes
The post's cost examples remain estimates and should be treated as directional because actual costs vary by region, log class, compression, indexing/query patterns, request volume, data transfer, and AWS pricing changes.
