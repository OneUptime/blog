# Validation Summary: How to Create Reusable Terraform Modules for ECS Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- Amazon ECS
- AWS Fargate
- IAM
- CloudWatch Logs
- Application Load Balancing
- Application Auto Scaling
- AWS Systems Manager Parameter Store
- AWS Secrets Manager

## Sources Consulted
- Terraform Registry: `aws_ecs_service` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform Registry: `aws_ecs_task_definition` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Terraform Registry: `aws_appautoscaling_target` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_target
- Terraform Registry: `aws_appautoscaling_policy` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_policy
- Terraform Registry: `aws_ecs_cluster` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster
- HashiCorp Terraform lifecycle meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AWS ECS Fargate task definition differences: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html
- AWS ECS task definition parameters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- AWS ECS task execution IAM role documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- AWS ECS Systems Manager Parameter Store secrets documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-ssm-paramstore.html
- AWS CloudFormation Application Auto Scaling scalable target documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-applicationautoscaling-scalabletarget.html
- OneUptime load balancer module post: https://oneuptime.com/blog/post/2026-02-23-reusable-terraform-modules-for-load-balancers/view
- OneUptime security group module post: https://oneuptime.com/blog/post/2026-02-23-reusable-terraform-modules-for-security-groups/view

## Issues Found
- The module accepted `secrets` but only attached `AmazonECSTaskExecutionRolePolicy` to the execution role. AWS ECS retrieves SSM Parameter Store and Secrets Manager values through the task execution role, and the AWS managed execution policy does not grant arbitrary `ssm:GetParameters`, `secretsmanager:GetSecretValue`, or customer KMS permissions. Added `additional_execution_role_policies` and an execution-role policy attachment, and updated the usage example to pass a secrets policy ARN.
- The Application Auto Scaling target built `resource_id` by splitting `cluster_id`. Application Auto Scaling expects `service/clusterName/serviceName`, while Terraform's ECS cluster ID is commonly the cluster ARN. Added an explicit `cluster_name` variable and used it in the autoscaling target.
- The lifecycle comment said `desired_count` was ignored when autoscaling is enabled, but the Terraform lifecycle block always ignores it. Updated the comment to describe the actual behavior.

## Review Notes
The Terraform CLI is not installed in this environment, so `terraform validate` could not be run. The HCL snippets were reviewed manually against official Terraform AWS provider and AWS ECS documentation.
