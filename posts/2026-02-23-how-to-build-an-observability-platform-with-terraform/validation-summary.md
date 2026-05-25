# Validation Summary: How to Build an Observability Platform with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- Amazon Managed Service for Prometheus
- Prometheus Alertmanager and PromQL
- CloudWatch Logs
- AWS Lambda
- Amazon OpenSearch Service
- AWS X-Ray
- Amazon Managed Grafana
- Grafana Terraform provider
- Amazon SNS

## Sources Consulted
- Amazon Managed Service for Prometheus alert manager configuration: https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-alertmanager-config.html
- Terraform AWS provider `aws_grafana_workspace` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/grafana_workspace
- Terraform Grafana provider `grafana_data_source` documentation: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/data_source
- Terraform AWS provider `aws_cloudwatch_log_subscription_filter` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_subscription_filter
- Amazon CloudWatch Logs subscription filter documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html
- Terraform AWS provider `aws_lambda_permission` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform AWS provider `aws_xray_sampling_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/xray_sampling_rule
- Terraform AWS provider `aws_opensearch_domain` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus node exporter guide: https://prometheus.io/docs/guides/node-exporter/

## Issues Found
- The Grafana data source snippet used `aws_grafana_workspace_configuration`, which is not a Terraform AWS provider resource for provisioning Grafana data sources. Replaced it with the Grafana provider and `grafana_data_source`, using `json_data_encoded` for the Prometheus SigV4 settings.
- The CloudWatch Logs subscription filter sent logs to a Lambda function without granting CloudWatch Logs permission to invoke the function. Added an `aws_lambda_permission` resource and made the subscription filter depend on it.
- The memory alert used incorrect node_exporter metric names: `node_memory_AvailableBytes` and `node_memory_MemoryTotal_bytes`. Replaced them with `node_memory_MemAvailable_bytes` and `node_memory_MemTotal_bytes`.
- The latency alert used `histogram_quantile` directly over per-bucket rates without aggregation. Updated it to aggregate classic histogram buckets with `sum by (le)`.
- The OpenSearch comment described `advanced_options` as index lifecycle management, but the option shown only controls explicit index behavior. Updated the comment to avoid implying that lifecycle retention is configured there.
- The platform architecture listed direct PagerDuty and Slack integration. Adjusted the wording to clarify that the Terraform example creates SNS topics for downstream PagerDuty and Slack integration.

## Review Notes
The snippets remain illustrative and still assume surrounding Terraform definitions such as IAM roles, security groups, KMS keys, variables, Lambda package contents, Grafana provider requirements, and OpenSearch indexing policies. Local Terraform formatting/validation could not be run because neither `terraform` nor `tofu` is installed in the review environment.
