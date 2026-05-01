# Validation Summary: How to Create ECS Clusters with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Amazon ECS
- AWS Fargate and Fargate Spot capacity providers
- AWS Cloud Map private DNS namespaces
- AWS IAM
- Amazon CloudWatch Logs
- AWS KMS
- AWS CLI

## Sources Consulted
- OpenTofu CLI docs: https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs: https://opentofu.org/docs/cli/commands/apply/
- AWS provider docs for `aws_ecs_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster
- AWS provider docs for `aws_ecs_cluster_capacity_providers`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster_capacity_providers
- AWS provider docs for `aws_service_discovery_private_dns_namespace`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/service_discovery_private_dns_namespace
- AWS provider docs for `aws_iam_role`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- AWS provider docs for `aws_iam_role_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy
- AWS provider docs for `aws_iam_role_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- Amazon ECS clusters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/clusters.html
- Amazon ECS clusters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-capacity-providers.html
- Monitor Amazon ECS containers with ECS Exec: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html
- Amazon ECS task execution IAM role: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- AWS CLI `describe-clusters`: https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-clusters.html
- Amazon ECS Container Insights metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-metrics-ECS.html
- Setting up Container Insights on Amazon ECS: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-ECS-cluster.html

## Issues Found
- The introduction described Fargate and EC2 instances as capacity providers. I changed this to Fargate capacity providers and EC2-backed Auto Scaling group capacity providers, which matches Amazon ECS capacity provider terminology.
- The `containerInsights` comment only mentioned `enabled` and `disabled`. I updated it to include `enhanced`, which is also a valid current value for the ECS cluster setting.
- The capacity provider strategy comments were slightly imprecise. I updated them to reflect that `base` is satisfied before `weight` is applied, and that the commented `FARGATE_SPOT` example affects the remaining tasks rather than all tasks.
- The inline policy comment referred only to Secrets Manager even though the example also grants `ssm:GetParameters` and `kms:Decrypt`. I corrected the comment to match the policy contents.
- The conclusion said `execute_command_configuration` enables ECS Exec and requires a KMS key and log group before enabling services. I corrected this to note that the block sets cluster-level ECS Exec defaults, ECS Exec still must be enabled on the service or task, the referenced log group must already exist when using `logging = "OVERRIDE"`, and a customer-managed KMS key is optional unless you want your own encryption key for the session channel or CloudWatch log group.

## Review Notes
- The post now aligns with current ECS cluster and provider syntax. `containerInsights = "enhanced"` is supported and recommended by AWS, but `enabled` remains valid.
- Creating the Cloud Map private DNS namespace is technically correct, but ECS services still need their own service discovery or Service Connect configuration to actively use that namespace.
