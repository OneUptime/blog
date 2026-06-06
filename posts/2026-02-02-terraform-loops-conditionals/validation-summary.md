# Validation Summary: How to Implement Terraform Loops and Conditionals

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Terraform (HashiCorp Configuration Language / HCL)
- AWS Provider for Terraform (aws_instance, aws_subnet, aws_vpc, aws_security_group, aws_cloudwatch_metric_alarm, aws_rds_cluster, aws_rds_cluster_instance, aws_ecs_service, aws_appautoscaling_target, aws_appautoscaling_policy, aws_iam_policy_document, aws_ebs_volume, aws_lb_target_group)
- Terraform meta-arguments: `count`, `for_each`, `dynamic`
- Terraform built-in functions: `toset`, `coalesce`, `merge`, `flatten`, `try`, `one`, `contains`, `cidrsubnet`, `index`, `upper`
- For expressions (list/map comprehension)

## Sources Consulted
- Terraform language documentation — `count` meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform language documentation — `for_each` meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform language documentation — `for` expressions: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform language documentation — Conditional expressions: https://developer.hashicorp.com/terraform/language/expressions/conditionals
- Terraform language documentation — Dynamic blocks: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform built-in function docs — `coalesce`, `try`, `one`, `merge`, `flatten`, `toset`, `cidrsubnet`
- AWS Provider Terraform Registry — `aws_rds_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- AWS Provider Terraform Registry — `aws_rds_cluster_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance
- AWS Provider Terraform Registry — `aws_ecs_service`, `aws_appautoscaling_target`, `aws_appautoscaling_policy`, `aws_iam_policy_document`, `aws_security_group`

## Issues Found
1. **`aws_rds_cluster` resource had a non-existent `instance_count` argument.** The original example placed `instance_count = (var.environment == "production" ? 3 : ...)` directly inside the `aws_rds_cluster` resource block. The AWS provider's `aws_rds_cluster` resource does not have an `instance_count` argument — Aurora cluster instances must be created using one or more separate `aws_rds_cluster_instance` resources. Fixed by removing the invalid argument from the cluster block and adding an `aws_rds_cluster_instance "database"` resource that uses `count` with the same conditional expression to size the cluster per environment. This preserves the author's intent (demonstrating conditional sizing per environment) while making the code apply cleanly.

## Review Notes
- The post uses the legacy hardcoded AMI ID `ami-0c55b159cbfafe1f0` throughout the examples. This AMI ID is widely used as a placeholder in Terraform tutorials and is acceptable for didactic examples, but readers should be aware that real configurations should look up AMIs dynamically (e.g., via the `aws_ami` data source) since AMI IDs are region-specific and change over time.
- `aurora-postgresql` engine version `14.6` is valid but increasingly dated; readers building on this should consult the current Aurora PostgreSQL availability for their region.
- `var.db_password` is referenced in the RDS example without a corresponding `variable` declaration in the snippet. This is typical for excerpted code and is not technically incorrect, but is worth noting.
- The `coalesce()` description ("returns the first non-null, non-empty value") is accurate for string inputs — Terraform's `coalesce` returns the first argument that is neither null nor an empty string.
- `master_username` and `master_password` are still valid arguments for `aws_rds_cluster`; the newer `manage_master_user_password` / Secrets Manager pattern is preferred for production but the example code remains valid.
- The `tags["Environment"]` lookup pattern used in the ECS network configuration relies on those tags being set; this works because the example explicitly sets them, and is a known Terraform pattern.
- The `merge([...]...)` spread-operator pattern for combining a list of maps into a single map is idiomatic and correct.
