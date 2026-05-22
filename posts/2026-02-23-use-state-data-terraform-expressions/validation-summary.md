# Validation Summary: How to Use State Data in Terraform Expressions

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Terraform configuration language
- Terraform state and resource references
- Terraform `count`, `for_each`, splat, conditional, dynamic, and `for` expressions
- Terraform module outputs and remote state
- Terraform `terraform_data` resource
- HashiCorp AWS provider resources and data sources

## Sources Consulted
- Terraform language expressions documentation: https://developer.hashicorp.com/terraform/language/expressions
- Terraform named value and resource reference documentation: https://developer.hashicorp.com/terraform/language/expressions/references
- Terraform resource block reference: https://developer.hashicorp.com/terraform/language/resources/syntax
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform remote state data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform data source documentation: https://developer.hashicorp.com/terraform/language/data-sources
- Terraform output values documentation: https://developer.hashicorp.com/terraform/language/values/outputs
- Terraform `terraform_data` resource reference: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_subnet` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_ami` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- AWS provider `aws_db_subnet_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_subnet_group

## Issues Found
- The `count` example described subnet IDs as "instance IDs" in one comment. Updated the comment to say "subnet IDs" so it matches the `aws_subnet.private[*].id` expression.
- The `for` expression example iterated over `aws_instance.web` as though it were a collection, while earlier examples showed `aws_instance.web` as a single resource. Added a comment clarifying that the example assumes `aws_instance.web` uses `count`.
- The flattening example used `flatten` on a list of subnet IDs, which was not actually nested data. Replaced it with a direct `for` expression that correctly collects subnet IDs from counted resources.
- The `terraform_data` example used `length(aws_instance.web)`, which is invalid for the single `aws_instance.web` resource shown earlier in the post. Changed it to store `instance_id = aws_instance.web.id`.

## Review Notes
- The inline `ingress` block in the `aws_security_group` dynamic block example is still valid Terraform, but the current AWS provider documentation recommends standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for new security group rule management.
- Terraform CLI was not installed in this environment, so syntax was reviewed against official documentation rather than by running `terraform validate`.
