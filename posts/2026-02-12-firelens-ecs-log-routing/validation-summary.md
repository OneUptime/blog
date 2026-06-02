# Validation Summary: How to Use FireLens for ECS Log Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- FireLens
- Fluent Bit
- Amazon CloudWatch Logs
- Amazon S3
- Datadog
- Elasticsearch / Amazon OpenSearch Service
- Terraform
- Python

## Sources Consulted
- Amazon ECS Developer Guide: FireLens for Amazon ECS: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_firelens.html
- Amazon ECS API Reference: FirelensConfiguration: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_FirelensConfiguration.html
- Amazon ECS API Reference: LogConfiguration: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LogConfiguration.html
- AWS Containers Blog: Under the hood: FireLens for Amazon ECS Tasks: https://aws.amazon.com/blogs/containers/under-the-hood-firelens-for-amazon-ecs-tasks/
- Amazon CloudWatch documentation: Set up FireLens to send logs to CloudWatch Logs: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-ECS-logs.html
- Fluent Bit documentation: Amazon CloudWatch output: https://docs.fluentbit.io/manual/pipeline/outputs/cloudwatch
- Fluent Bit documentation: Amazon S3 output: https://docs.fluentbit.io/manual/pipeline/outputs/s3
- Fluent Bit documentation: rewrite_tag filter: https://docs.fluentbit.io/manual/pipeline/filters/rewrite-tag
- Fluent Bit documentation: grep filter: https://docs.fluentbit.io/manual/pipeline/filters/grep
- Fluent Bit documentation: Elasticsearch output: https://docs.fluentbit.io/manual/data-pipeline/outputs/elasticsearch
- Datadog documentation: Send Fluent Bit Logs to Datadog: https://docs.datadoghq.com/logs/guide/fluentbit/

## Issues Found
- The post described CloudWatch Logs as the default ECS logging destination. ECS container log configuration defaults to the Docker daemon's logging driver unless a log configuration is specified, so this was changed to describe `awslogs` as a common ECS logging destination.
- The post said FireLens injects the Fluent Bit sidecar. In ECS task definitions, the log router container is explicitly defined by the user and marked with `firelensConfiguration`, so the wording was corrected.
- The Fargate examples used `config-file-type = "s3"`. AWS documents that Fargate tasks only support FireLens custom config files with `config-file-type = "file"`, so the JSON and Terraform examples were changed to use a file path.
- After switching to file-based custom config, the examples still referenced the public AWS for Fluent Bit image, which would not include the custom config file. The examples now use a custom log router image variable or placeholder image.
- The custom Fluent Bit CloudWatch output used `Regex`, which is not a CloudWatch output plugin option. It was replaced with a `rewrite_tag` filter and an `error.*` output match for error-only routing.
- The S3 output's `s3_key_format` did not include a unique component. Fluent Bit recommends including `$UUID` in S3 key formats to prevent overwrite and shutdown upload edge cases, so `$UUID` was added.
- The IAM section included S3 config-file permissions as part of the Fargate example. Since the corrected Fargate flow uses a file in the image, the S3 config-file permission example was replaced with a note that it applies to EC2-hosted ECS tasks using S3 config files.
- The troubleshooting note for config loading assumed an S3 config file. It now covers file-based Fargate configs and S3-based EC2 configs separately.

## Review Notes
- The Datadog, Elasticsearch, parser, grep, CloudWatch, and Python snippets are syntactically plausible and align with the referenced plugin documentation. In production, Datadog API keys should be injected securely rather than hard-coded into configuration.
