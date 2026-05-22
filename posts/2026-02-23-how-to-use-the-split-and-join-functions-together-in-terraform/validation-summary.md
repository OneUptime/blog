# Validation Summary: How to Use the split and join Functions Together in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform built-in functions
- AWS ARNs
- Terraform AWS provider security group rules

## Sources Consulted
- Terraform `split` function documentation: https://developer.hashicorp.com/terraform/language/functions/split
- Terraform `join` function documentation: https://developer.hashicorp.com/terraform/language/functions/join
- Terraform `title` function documentation: https://developer.hashicorp.com/terraform/language/functions/title
- Terraform `upper` function documentation: https://developer.hashicorp.com/terraform/language/functions/upper
- Terraform `reverse` function documentation: https://developer.hashicorp.com/terraform/language/functions/reverse
- Terraform `slice` function documentation: https://developer.hashicorp.com/terraform/language/functions/slice
- Terraform `concat` function documentation: https://developer.hashicorp.com/terraform/language/functions/concat
- Terraform `distinct` function documentation: https://developer.hashicorp.com/terraform/language/functions/distinct
- Terraform `trimspace` function documentation: https://developer.hashicorp.com/terraform/language/functions/trimspace
- Terraform `for` expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform AWS provider `aws_vpc_security_group_ingress_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- AWS ARN documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html

## Issues Found
- The ARN example started with an S3 bucket/object ARN and then demonstrated changing the account ID. AWS ARN formats can omit the account ID, and the S3 bucket ARN shown has empty region and account segments, so inserting an account ID would not be a valid example for that resource type. Changed the example to a Lambda ARN, where the region and account ID segments are part of the ARN.
- The security group rule example used `aws_security_group_rule` with `cidr_blocks`. The AWS provider documentation recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` as the current best practice, with one CIDR source per rule. Updated the snippet to use `aws_vpc_security_group_ingress_rule`, `cidr_ipv4`, and `ip_protocol`.
- The text said many Terraform resources accept either a list or a comma-separated string. Terraform provider schemas define specific argument types, so that phrasing was too broad. Reworded it to describe configurations that involve converting between list and comma-separated string values.

## Review Notes
Terraform was not installed in the local environment, so examples were reviewed against official documentation and by static HCL syntax inspection rather than by running `terraform validate`.
