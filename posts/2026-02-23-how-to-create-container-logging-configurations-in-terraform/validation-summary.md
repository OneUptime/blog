# Validation Summary: How to Create Container Logging Configurations in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS ECS
- Amazon CloudWatch Logs
- AWS KMS
- Amazon ECS FireLens
- Fluent Bit
- Kubernetes
- Amazon Data Firehose

## Sources Consulted
- AWS ECS task definition parameters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- AWS ECS FireLens task definition examples: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/firelens-taskdef.html
- Amazon CloudWatch FireLens setup: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-ECS-logs.html
- AWS CloudWatch Logs subscription filters: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html
- AWS CloudWatch Logs log classes: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CloudWatch_Logs_Log_Classes.html
- AWS CloudWatch Logs for Fluent Bit plugin documentation: https://github.com/aws/amazon-cloudwatch-logs-for-fluent-bit
- Fluent Bit Kubernetes documentation: https://docs.fluentbit.io/manual/2.2/installation/kubernetes
- Fluent Bit CloudWatch output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/cloudwatch
- Terraform AWS provider documentation for CloudWatch log groups and subscription filters: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform Kubernetes provider documentation and v3 upgrade guide: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs

## Issues Found
- The ECS `awslogs` example configured both `awslogs-multiline-pattern` and `awslogs-datetime-format`. AWS ECS documentation states these options cannot both be configured, so the datetime option was removed.
- The post claimed the guide covered Azure Container Apps, but the post only contains AWS ECS and Kubernetes examples. The introduction was corrected to match the actual content.
- The description referred to Fluentd even though the implementation examples use Fluent Bit. The description was corrected to Fluent Bit.
- The Kubernetes DaemonSet used `kubernetes_daemon_set`, which is not the current Terraform Kubernetes provider resource name. It was updated to `kubernetes_daemon_set_v1`.
- The Kubernetes example used a hard-coded `logging` namespace without creating it. A Terraform-managed `kubernetes_namespace` resource was added and referenced from namespaced resources.
- The Fluent Bit Kubernetes example used the Docker parser and mounted `/var/lib/docker/containers`, which is Docker-runtime-specific and outdated for current Kubernetes/containerd clusters. The parser was changed to CRI, the CRI parser definition was added, and the Docker-specific hostPath mount was removed.

## Review Notes
The examples still assume surrounding Terraform resources exist, such as provider configuration, IAM roles, ECR repositories, KMS caller identity data, Elasticsearch, and the Firehose delivery stream. That is acceptable for a focused blog snippet, but a future expanded version could call out these prerequisites explicitly.
