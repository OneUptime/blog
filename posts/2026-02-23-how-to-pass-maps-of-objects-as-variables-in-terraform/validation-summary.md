# Validation Summary: How to Pass Maps of Objects as Variables in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform variables and type constraints
- Terraform `for_each`
- Terraform validation blocks and functions
- AWS Terraform provider resources for RDS, ECS, CloudWatch Logs, load balancer target groups, and security groups

## Sources Consulted
- Terraform type constraints and optional object attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform `for_each` meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform `for` expressions: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform `alltrue` function: https://developer.hashicorp.com/terraform/language/functions/alltrue
- Terraform `merge` function: https://developer.hashicorp.com/terraform/language/functions/merge
- AWS provider `aws_db_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_lb_target_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- AWS provider `aws_ecs_task_definition` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- AWS provider `aws_ecs_service` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Amazon ECS Fargate task CPU and memory values: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html

## Issues Found
- The Fargate CPU validation allowed only `256`, `512`, `1024`, `2048`, and `4096`. Current Amazon ECS Fargate task sizes also include `8192` and `16384` for Linux platform version 1.4.0 or later, so the validation list and error message were updated.
- The DNS-compatible service name regex allowed names ending in a hyphen and did not enforce the 63-character DNS label limit. The validation now requires names to end with a letter or number and be 63 characters or fewer.
- The "Transforming Maps in Locals" example calculated `svc.cpu` and `svc.memory`, but the declared object type omitted `cpu` and `memory`. Those attributes were added to the variable type so the example is internally consistent.
- The `service_arns` output used `svc.id`. The current AWS provider documents `arn` as the ECS service ARN attribute, so the output now uses `svc.arn`.

## Review Notes
The examples are partial module snippets and assume surrounding variables and resources such as `var.project`, `local.common_tags`, `aws_ecs_cluster.main`, and IAM roles are defined elsewhere. The RDS example uses `password`, which is valid, but the AWS provider documentation notes that password arguments are stored in Terraform state unless write-only or managed password alternatives are used.
