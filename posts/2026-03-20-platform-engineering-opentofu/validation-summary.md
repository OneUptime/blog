# Validation Summary: How to Build a Platform Engineering Foundation with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform
- Amazon ECS
- AWS Systems Manager Parameter Store
- Amazon CloudWatch
- Git-based module sources

## Sources Consulted
- OpenTofu module sources documentation - https://opentofu.org/docs/v1.9/language/modules/sources/
- OpenTofu custom conditions documentation - https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu `can` function documentation - https://opentofu.org/docs/language/functions/can/
- OpenTofu `split` function documentation - https://opentofu.org/docs/v1.8/language/functions/split/
- OpenTofu local values documentation - https://opentofu.org/docs/language/values/locals/
- AWS provider `aws_ecs_service` resource documentation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- AWS provider `aws_ecs_cluster` data source documentation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ecs_cluster
- AWS provider `aws_ssm_parameter` data source documentation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter
- AWS provider `aws_ssm_parameter` resource documentation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- AWS provider `aws_cloudwatch_metric_alarm` resource documentation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Amazon ECS CloudWatch metrics documentation - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/available-metrics.html
- AWS Systems Manager Parameter Store documentation - https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html

## Issues Found
- The ECS service snippet passed `data.aws_ssm_parameter.private_subnets.value` directly to `network_configuration.subnets`. The AWS provider documents `subnets` as a list, while the `aws_ssm_parameter` data source returns a string even for `StringList` parameters. I changed it to `split(",", data.aws_ssm_parameter.private_subnets.value)`.
- The CloudWatch alarm snippet used `data.aws_ecs_cluster.platform.name` for the `ClusterName` dimension. The AWS provider `aws_ecs_cluster` data source does not expose a `name` attribute. I changed the dimension to use the cluster name from SSM: `data.aws_ssm_parameter.cluster_name.value`.
- The module example referenced shared SSM parameters for cluster name, subnet IDs, and alert topic without showing the corresponding data sources, and the service catalog example omitted the `/platform/environment` parameter that the module reads for tagging. I added those matching examples so the post's snippets are internally consistent.

## Review Notes
- The post pins `hashicorp/aws` to `~> 5.30`, which is older than the current AWS provider release, but the arguments used in the corrected examples remain valid and non-deprecated in current provider documentation.
- The Git module source syntax with `//platform-service?ref=v1.5.0` is correct per OpenTofu's module source documentation.
- The snippets were reviewed against current official documentation, but not executed in this workspace because they depend on AWS provider access and are illustrative excerpts rather than a runnable standalone module.
