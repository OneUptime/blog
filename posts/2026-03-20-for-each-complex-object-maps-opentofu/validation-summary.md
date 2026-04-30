# Validation Summary: How to Use for_each with Complex Object Maps in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- Terraform-style `for_each` usage in OpenTofu
- AWS Provider for Terraform/OpenTofu
- Amazon ECS
- Application Auto Scaling
- Amazon RDS

## Sources Consulted
- OpenTofu `for_each` meta-argument documentation: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu type constraints documentation: https://opentofu.org/docs/language/expressions/type-constraints/
- OpenTofu dynamic blocks documentation: https://opentofu.org/docs/v1.9/language/expressions/dynamic-blocks/
- AWS provider `aws_ecs_service` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- AWS provider `aws_appautoscaling_target` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_target
- AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_db_parameter_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group
- AWS provider `aws_rds_engine_version` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/rds_engine_version

## Issues Found
- The ECS service example used `network_configuration.assign_public_ip` without setting a Fargate launch type, even though the provider documents `assign_public_ip` as Fargate-only. I added `launch_type = "FARGATE"` to make the example consistent with the shown networking pattern.
- The ECS service example omitted `task_definition`, which the provider requires unless the service uses the `EXTERNAL` deployment controller. I added `task_definition = aws_ecs_task_definition.services[each.key].arn`.
- The `aws_appautoscaling_target` example built `resource_id` only from variables and `each.key`, so it did not depend on the corresponding `aws_ecs_service` instance being created first. I changed it to reference `aws_ecs_service.services[each.key].name`, which also matches the documented ECS autoscaling `resource_id` format.
- The RDS parameter group example derived `family` by concatenating `engine` and the major version. That is not valid generically across RDS engines; the provider documents engine-specific families such as `mysql8.0` and exposes `parameter_group_family` in `aws_rds_engine_version`. I replaced the derived expression with an explicit `parameter_group_family` field in the object map.
- The DB instance example created per-database parameter groups but did not attach them to the instances, so the configured parameters would not affect the databases. I added `parameter_group_name = aws_db_parameter_group.databases[each.key].name`.

## Review Notes
- The OpenTofu language explanations around `for_each`, `each.value`, object maps, filtered `for_each` expressions, locals, outputs, and `dynamic` blocks were accurate after the fixes above.
- The `aws_db_instance` documentation notes that `username` and `password` are stored in state in plaintext. The example is technically valid, but this is worth keeping in mind for production usage.
- The snippets were reviewed against official language and provider documentation. No automated `tofu apply` run was performed because the examples are partial Markdown snippets and rely on surrounding resources and variables not shown in the post.
