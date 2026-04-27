# Validation Summary: How to Override Data Sources in OpenTofu Tests

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- OpenTofu (testing framework, `tftest.hcl` files)
- HCL (HashiCorp Configuration Language)
- AWS provider data sources (`aws_ami`, `aws_caller_identity`, `aws_secretsmanager_secret_version`, `aws_vpc`, `aws_subnets`, `aws_security_group`)
- AWS resources (`aws_instance`, `aws_db_instance`, `aws_s3_bucket_policy`, `aws_eks_cluster`)
- `mock_provider` and `override_data` testing blocks

## Sources Consulted
- [OpenTofu — Command: test](https://opentofu.org/docs/cli/commands/test/) — `override_data` block syntax, file-level vs run-level scope, interaction with `mock_provider`.
- [OpenTofu — `contains` function](https://opentofu.org/docs/language/functions/contains/) — Confirmed `contains` operates on lists/sets, not strings.
- [Terraform Registry — `aws_eks_cluster`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster) — Confirmed `vpc_config[0].vpc_id` is a valid computed attribute.
- AWS provider documentation for `aws_ami`, `aws_caller_identity`, `aws_secretsmanager_secret_version`, `aws_vpc`, `aws_subnets`, `aws_security_group` data source attributes.

## Issues Found
1. **Incorrect use of `contains()` for substring matching** in the "File-Level Data Source Overrides" example.
   - **What was wrong:** The assertion used `contains(aws_s3_bucket_policy.this.policy, "123456789012")`. The `contains()` function in OpenTofu/Terraform tests whether a *list or set* contains a given element — it does not perform substring matching on strings. Since `aws_s3_bucket_policy.this.policy` is a JSON string, this expression would error at evaluation time.
   - **What was changed:** Replaced `contains(...)` with `strcontains(...)`, which is the correct OpenTofu function for substring matching against a string.
   - **Why:** `strcontains` is the dedicated function for "string contains substring" semantics; using it makes the example syntactically and semantically correct.

## Review Notes
- The `override_data` syntax (`target` + `values`), the use of `mock_provider "aws" {}`, and the file-level vs run-level placement of `override_data` are all consistent with the official OpenTofu test command documentation.
- The data source attributes used in `values` blocks (e.g., `id`, `name`, `owner_id`, `architecture` for `aws_ami`; `account_id`, `arn`, `user_id` for `aws_caller_identity`; `secret_string`, `version_id` for `aws_secretsmanager_secret_version`; `ids` for `aws_subnets`; `cidr_block` for `aws_vpc`) are real attributes of the corresponding AWS provider data sources.
- The post correctly notes that with a `mock_provider`, OpenTofu auto-generates computed attributes, and `override_data` is needed only when assertions require specific values.
- No version-specific caveats: `override_data` and `mock_provider` are stable features available in OpenTofu 1.7+ (and continued in current releases). The post does not mention a specific version, which is fine since the syntax is stable.
