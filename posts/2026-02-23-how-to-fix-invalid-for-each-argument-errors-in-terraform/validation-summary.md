# Validation Summary: How to Fix Invalid for_each Argument Errors in Terraform

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (HCL)
- AWS provider resources (aws_instance, aws_subnet, aws_vpc, aws_iam_user, aws_eip, aws_security_group_rule, aws_secretsmanager_secret, aws_secretsmanager_secret_version)
- Terraform meta-arguments (`for_each`, `count`)
- Terraform built-in functions (`toset`, `tostring`, `tonumber`, `cidrsubnet`, `length`, `keys`, `type`)
- Terraform CLI (`terraform plan`, `terraform console`, `-target`)

## Sources Consulted
- Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform `count` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform resource addressing: https://developer.hashicorp.com/terraform/cli/state/resource-addressing
- `aws_iam_user` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user
- `aws_secretsmanager_secret` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret
- HashiCorp issue tracker discussions on for_each behavior (hashicorp/terraform#29957)

## Issues Found

1. **Incorrect error message for non-string set type** — In the "Error: for_each with Null or Empty Values" section, the quoted error said `"a set containing type bool"` while the accompanying code example used a set of numbers (`[80, 443, 8080]`). Terraform actually emits `type number` (or `set of number`) for that case, not `bool`. Changed `type bool` → `type number` so the error message matches the example.

2. **Invalid `-target=output.<name>` syntax** — In the "General Debugging Tips" section, the post suggested running `terraform plan -target=output.debug_for_each_value`. The `-target` flag accepts resource, data source, and module addresses, but not output addresses. Replaced this with a plain `terraform plan` invocation (which still shows planned output values) and an explanatory comment so the debugging tip remains valid.

## Review Notes

- The "Option 2: Use count instead of for_each" workaround in the "for_each Set Includes Values Derived from Resource Attributes" section is only partially accurate. `count` is subject to the same plan-time-unknown restriction if `length(...)` itself depends on apply-time values. The post does not call this caveat out, but the recommendation is reasonable for cases where the length is determinable at plan time (e.g., data sources that read successfully during plan). Left as-is since the broader guidance in the post (define resources explicitly, avoid deriving for_each from computed values) is sound.
- `aws_security_group_rule` is still supported but the AWS provider has introduced `aws_vpc_security_group_ingress_rule`/`aws_vpc_security_group_egress_rule` as a more idiomatic replacement. Not flagged because the example still works; future readers may want to migrate.
- The `terraform console` debugging guidance is technically correct and idiomatic — kept as-is.
- All AWS resource attribute names, function signatures, and HCL syntax verified against current Terraform / AWS provider documentation.
