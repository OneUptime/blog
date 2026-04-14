# Validation Summary: How to Send Dapr Metrics to AWS CloudWatch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar metrics, Configuration CRD, annotations)
- AWS CloudWatch (dashboards, alarms, CloudWatch Agent)
- AWS CloudWatch Agent with Prometheus scraping (EMF processor)
- Amazon EKS (Kubernetes pod annotations, service discovery)
- Amazon Managed Service for Prometheus (AMP)
- Amazon Managed Grafana (AMG)
- AWS IAM (roles and policies for CloudWatch Agent)
- AWS SNS (alarm actions)

## Sources Consulted
- Dapr Configuration spec reference: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr metrics overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr MetricSpec source code: https://github.com/dapr/dapr/blob/master/pkg/config/configuration.go
- Dapr metrics reference: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- AWS CloudWatchAgentServerPolicy managed policy: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/CloudWatchAgentServerPolicy.html
- AWS CloudWatch Prometheus scraping setup: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights-Prometheus-Setup-configure.html
- AWS CloudWatch Container Insights Prometheus metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights-Prometheus-metrics.html
- AWS AMP describe-workspace CLI reference: https://docs.aws.amazon.com/cli/latest/reference/amp/describe-workspace.html

## Issues Found
1. **`spec.metric` should be `spec.metrics` (plural)**: The Dapr Configuration CRD uses `metrics` (plural) as the field name, not `metric` (singular). Confirmed via official Dapr documentation and source code. Fixed `metric:` to `metrics:`.

2. **`port: 9090` is not a valid field in the Dapr Configuration CRD**: The `MetricSpec` in Dapr does not have a `port` field. The metrics port is configurable only via the `dapr.io/metrics-port` pod annotation or the `--metrics-port` CLI flag. The blog post already correctly shows the annotation approach, so the invalid `port` field was removed from the Configuration resource.

3. **SNS ARN placeholder account ID was 9 digits instead of 12**: AWS account IDs are always 12 digits. The placeholder `123456789` was changed to `123456789012` in the `--alarm-actions` and `--ok-actions` parameters to match the correct format.

## Review Notes
- All AWS-specific configurations were verified as correct: IAM policy ARN, CloudWatch Agent Prometheus config structure, EMF processor field names, `ContainerInsights/Prometheus` namespace, and AMP CLI commands.
- Both Dapr metric names (`dapr_http_server_request_count` and `dapr_resiliency_activations_total`) are confirmed as real Dapr metrics.
- The Prometheus relabel configuration correctly maps Dapr annotations to scrape targets using Kubernetes service discovery labels.
- The `aws amp describe-workspace --query "workspace.prometheusEndpoint"` JMESPath query is correct; the returned endpoint is the base URL to which `/remote_write` should be appended.
