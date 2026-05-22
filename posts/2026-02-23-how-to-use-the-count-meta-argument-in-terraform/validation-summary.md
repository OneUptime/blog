# Validation Summary: How to Use the count Meta-Argument in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform `count` meta-argument
- Terraform modules
- AWS Terraform provider resources and data sources

## Sources Consulted
- HashiCorp Terraform `count` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- HashiCorp Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- HashiCorp Terraform references to values: https://developer.hashicorp.com/terraform/language/expressions/references
- HashiCorp Terraform splat expressions reference: https://developer.hashicorp.com/terraform/language/expressions/splat
- HashiCorp Terraform `one` function reference: https://developer.hashicorp.com/terraform/language/functions/one
- HashiCorp Terraform meta-arguments overview: https://developer.hashicorp.com/terraform/language/meta-arguments
- HashiCorp AWS provider `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp AWS provider `aws_ebs_volume` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume
- HashiCorp AWS provider `aws_eip` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- HashiCorp AWS provider `aws_cloudwatch_metric_alarm` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- HashiCorp AWS provider `aws_wafv2_web_acl` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl

## Issues Found
- The subnet distribution example referenced `data.aws_subnet.selected[count.index % length(var.subnet_ids)].availability_zone` but did not define the `data "aws_subnet" "selected"` data source. Added a counted `aws_subnet` data source keyed by `var.subnet_ids` so the `AZ` tag reference is valid.
- The phrase "Resources with computed count from another resource" could imply that `count` can depend on values known only after apply, which Terraform does not allow. Changed it to "Resources with count derived from another counted resource collection" to match Terraform's requirement that `count` be known before remote resource operations.

## Review Notes
Several examples intentionally omit surrounding provider configuration and variable declarations, which is normal for tutorial snippets. Terraform was not installed in the local environment, so validation was performed against official Terraform language and HashiCorp AWS provider documentation rather than by running `terraform validate`.
