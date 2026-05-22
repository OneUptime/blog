# Validation Summary: How to Pass Structured Data Through Variables in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform input variables
- Terraform type constraints
- Terraform `for_each`, `count`, locals, and for expressions
- AWS Terraform provider resources for RDS, EC2 security group rules, ECS, and ElastiCache

## Sources Consulted
- Terraform type constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform variable block reference: https://developer.hashicorp.com/terraform/language/block/variable
- Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- AWS provider `aws_security_group_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- AWS provider `aws_ecs_task_definition` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- AWS provider `aws_ecs_service` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_elasticache_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_cluster

## Issues Found
- The post said the caller passes an object variable "as a block." Terraform callers assign input variables as argument values, including in `.tfvars` files and module blocks. Changed this to "as an object value."
- The ECS Fargate service example used a task definition with `network_mode = "awsvpc"` but omitted the required `network_configuration` block on `aws_ecs_service`. Added a `network_configuration` block with subnet and security group references.

## Review Notes
The `aws_security_group_rule` examples are syntactically valid, but the current AWS provider documentation recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` for new configurations because `aws_security_group_rule` has known limitations with multiple CIDR blocks and rule identity.
