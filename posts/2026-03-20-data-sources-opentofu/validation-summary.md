# Validation Summary: How to Use Data Sources in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (HCL configuration language)
- Terraform AWS provider data sources (`aws_ami`, `aws_vpc`, `aws_caller_identity`, `aws_region`, `aws_secretsmanager_secret_version`, `aws_subnets`)
- AWS resources used as examples (`aws_instance`, `aws_subnet`, `aws_iam_role`, `aws_db_instance`, `aws_lb`)
- Infrastructure as Code concepts (data sources vs resources, `depends_on`)

## Sources Consulted
- OpenTofu Data Sources documentation: https://opentofu.org/docs/language/data-sources/
- Terraform AWS provider — `aws_ami`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform AWS provider — `aws_vpc`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpc
- Terraform AWS provider — `aws_caller_identity`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity
- Terraform AWS provider — `aws_region`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region
- Terraform AWS provider — `aws_secretsmanager_secret_version`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret_version
- Terraform AWS provider — `aws_subnets`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets

## Issues Found
No technical issues found.

All HCL syntax, data source argument names (`most_recent`, `owners`, `filter`, `secret_id`, `tags`), and exported attributes (`id`, `account_id`, `secret_string`, `ids`) match the official AWS provider documentation. The reference syntax `data.<type>.<name>.<attr>` is correct, and the explanation of when data sources are evaluated (during `tofu plan`, with `depends_on` deferring the read to apply) is accurate.

## Review Notes
- The intro comment `# data.<provider_type>.<local_name>` describes the *reference* syntax rather than the declaration syntax (`data "<type>" "<name>"`); both forms appear immediately below it, so a reader has enough context, but the comment is slightly informal.
- The "When Data Sources Run" section is correct but condensed. In practice, data sources whose configuration depends on values not yet known (e.g., resource attributes that haven't been created) are deferred from plan to apply automatically — `depends_on` is one trigger, but unknown-value dependencies have the same effect. This isn't an inaccuracy, just an edge case worth being aware of.
- The `aws_secretsmanager_secret_version` example assumes the secret is stored as a JSON object with a `password` key. This is a common convention but worth noting it isn't universal.
