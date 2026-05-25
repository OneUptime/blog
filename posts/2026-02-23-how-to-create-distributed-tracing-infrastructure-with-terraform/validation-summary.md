# Validation Summary: How to Create Distributed Tracing Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS provider for Terraform
- AWS X-Ray sampling rules and groups
- AWS Distro for OpenTelemetry Collector
- Amazon ECS on Fargate
- AWS Cloud Map service discovery
- AWS IAM
- Amazon CloudWatch alarms and usage metrics

## Sources Consulted
- Terraform AWS provider documentation for `aws_xray_sampling_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/xray_sampling_rule
- Terraform AWS provider documentation for `aws_xray_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/xray_group
- AWS X-Ray documentation for sampling rules: https://docs.aws.amazon.com/xray/latest/devguide/xray-console-sampling.html
- AWS X-Ray documentation for groups: https://docs.aws.amazon.com/xray/latest/devguide/xray-console-groups.html
- AWS X-Ray concepts and trace sampling behavior: https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html
- AWS X-Ray SDK and daemon support timeline: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-daemon-timeline.html
- AWS X-Ray migration guidance for OpenTelemetry: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-migration.html
- Amazon ECS task execution IAM role documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- AWS ADOT Collector on ECS configuration guidance: https://aws.amazon.com/blogs/containers/metrics-and-traces-collection-from-amazon-ecs-using-aws-distro-for-opentelemetry-with-dynamic-service-discovery/
- Amazon CloudWatch AWS API usage metrics documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AWS-API-Usage-Metrics.html
- Amazon CloudWatch usage metrics documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Usage-Metrics.html

## Issues Found
- The original sampling example attempted to trace 100% of 5xx errors by matching `http.status_code` in an X-Ray sampling rule. X-Ray sampling decisions are made before the response status is known, and X-Ray SDKs ignore sampling rules that specify attributes. I replaced that rule with a high-priority request-time rule for critical checkout requests.
- The Terraform snippets referenced required variables that were not declared. I added declarations for `vpc_id`, `vpc_cidr_block`, `private_subnet_ids`, and `alert_sns_topic_arn`.
- The ECS task definition referenced `aws_iam_role.ecs_execution` and `aws_iam_role.otel_collector`, but those roles were not defined. I added the ECS execution role, attached `AmazonECSTaskExecutionRolePolicy`, and added the collector task role with X-Ray write permissions.
- The collector deployment referenced `otel-config.yaml` but did not show a valid collector configuration. I added a minimal ADOT Collector configuration that receives OTLP over gRPC/HTTP and exports traces to AWS X-Ray.
- The collector exposed legacy OTLP HTTP port `55681`. I removed it and kept the current OTLP default ports `4317` and `4318`.
- The ECS service referenced `aws_security_group.otel_collector`, but no security group was defined. I added a collector security group with OTLP ingress rules and egress.
- The CloudWatch alarm used `ThrottledCount` in the `AWS/X-Ray` namespace. AWS API throttling usage metrics are documented under `AWS/Usage` with `ThrottleCount` and API dimensions, so I changed the alarm to use `AWS/Usage`, `ThrottleCount`, and the `X-Ray` / `PutTraceSegments` dimensions.

## Review Notes
Terraform was not installed in the workspace, so I could not run `terraform fmt` or `terraform validate` locally. The HCL was reviewed manually against the Terraform AWS provider schemas and AWS service documentation. The post correctly favors OpenTelemetry/ADOT for trace collection; this is important because AWS X-Ray SDKs and the X-Ray daemon entered maintenance mode on February 25, 2026.
