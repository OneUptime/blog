# Validation Summary: How to Export Outputs from Modules in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL configuration language)
- Terraform module outputs (`output` blocks)
- Terraform meta-arguments (`for_each`, `count`)
- Splat expressions (`[*]`)
- Sensitive values handling
- AWS provider resources: `aws_vpc`, `aws_subnet`, `aws_eip`, `aws_instance`, `aws_db_instance`, `aws_db_subnet_group`, `aws_eks_cluster`, `aws_ecs_cluster`, `aws_ecs_service`, `aws_lb`, `aws_lb_target_group`, `aws_security_group`, `aws_route53_record`
- `random_password` resource

## Sources Consulted
- Terraform output values documentation: https://developer.hashicorp.com/terraform/language/values/outputs
- Terraform modules documentation: https://developer.hashicorp.com/terraform/language/modules
- Terraform splat expressions: https://developer.hashicorp.com/terraform/language/expressions/splat
- AWS provider `aws_vpc`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- AWS provider `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_eks_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- AWS provider `aws_lb`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- HashiCorp guidance on sensitive output values

## Issues Found
No technical issues found.

All technical claims, code examples, and syntax verified as correct:
- The `module.<MODULE_NAME>.<OUTPUT_NAME>` access syntax is accurate.
- `for_each` modules produce a map of instances, accessible via `module.NAME[key].OUTPUT` and iterable in `for` expressions — example is correct.
- `count` modules produce a list of instances, accessible via splat `module.NAME[*].OUTPUT` — example is correct.
- AWS attribute references (`aws_vpc.main.arn`, `aws_db_instance.main.endpoint`/`address`/`port`, `aws_eks_cluster.main.identity[0].oidc[0].issuer`, `aws_lb.app.dns_name`/`zone_id`) all match the AWS provider schema.
- The note that root outputs consuming a sensitive value must themselves be marked `sensitive = true` is correct — Terraform errors otherwise.

## Review Notes
- The dependency-graph reasoning in the "Passing Outputs Between Modules" section ("compute and database... can be created in parallel since they depend on different outputs") is technically true (they don't depend on each other) but the phrasing is slightly imprecise — parallelism comes from absence of mutual dependency, not from referencing different outputs of the same module. Not an error, just a clarity nit.
- Minor indentation inconsistency inside the structured `subnets` output (`cidrs` aligned differently than `ids`/`azs`) — purely cosmetic.
- The post uses `aws_security_group.app.id` / `aws_security_group.lb.id` and `aws_lb_target_group.app.arn` / `aws_ecs_task_definition.app.arn` in the "Complete Module Example" without showing those resource definitions; this is acceptable since the section's focus is outputs, not a runnable end-to-end module.
