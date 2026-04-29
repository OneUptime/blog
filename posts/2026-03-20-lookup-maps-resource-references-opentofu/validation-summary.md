# Validation Summary: How to Create Lookup Maps for Resource References in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu local values, map/object access, `lookup()`, `for` expressions, and `for_each`
- AWS provider data sources and resources used in examples (`aws_subnets`, `aws_db_subnet_group`, `aws_instance`, `aws_security_group`, `aws_launch_template`)

## Sources Consulted
- OpenTofu local values documentation: https://opentofu.org/docs/language/values/locals/
- OpenTofu `lookup` function documentation: https://opentofu.org/docs/language/functions/lookup/
- OpenTofu types and values documentation: https://opentofu.org/docs/language/expressions/types/
- OpenTofu `for` expressions documentation: https://opentofu.org/docs/language/expressions/for/
- OpenTofu data sources documentation: https://opentofu.org/docs/v1.8/language/data-sources/
- OpenTofu `for_each` meta-argument documentation: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- Terraform AWS provider `aws_subnets` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets
- Terraform AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider `aws_launch_template` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Amazon RDS documentation on DB subnet groups in a VPC: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html

## Issues Found
- The `aws_subnets` example filtered only on the `Tier` tag, which can return subnets from multiple VPCs. I added a `vpc-id` filter and a `vpc_id` variable so the lookup map reliably feeds `aws_db_subnet_group` with subnets from the intended VPC, matching the provider examples and RDS subnet-group guidance.
- The launch template example referenced `data.aws_ami.app.id`, but that data source was not defined anywhere in the post. I replaced it with an explicit `app_ami_id` variable so the snippet is valid as written.
- The feature flag example modeled flags as `map(string)` with `"true"` and `"false"` string values. I corrected it to `map(bool)` and boolean defaults because OpenTofu has native boolean values and `lookup()` should return booleans for feature-flag style configuration.

## Review Notes
- The rest of the OpenTofu language usage is technically correct against current docs: `locals`, square-bracket map access, `lookup()` with a default, object-producing `for` expressions, and `for_each` on data resources are all valid.
- The snippets remain illustrative partial configurations, so they still assume surrounding provider configuration and environment-specific values such as real AMI IDs.
