# Validation Summary: How to Use the concat Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform collection functions
- Terraform dynamic blocks
- Terraform resource iteration with `for_each`
- AWS Terraform provider resources and data sources

## Sources Consulted
- HashiCorp Terraform `concat` function documentation: https://developer.hashicorp.com/terraform/language/functions/concat
- HashiCorp Terraform `flatten` function documentation: https://developer.hashicorp.com/terraform/language/functions/flatten
- HashiCorp Terraform `distinct` function documentation: https://developer.hashicorp.com/terraform/language/functions/distinct
- HashiCorp Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- HashiCorp Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- HashiCorp AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- HashiCorp AWS provider `aws_vpc_security_group_ingress_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- HashiCorp AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp AWS provider `aws_iam_policy_document` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document

## Issues Found
- The post stated that all input lists must contain elements of the same type, or types Terraform can unify. The official `concat` documentation shows mixed element types are accepted. Updated the explanation and summary takeaway to say the concatenated result must match the type expected by the consuming expression or argument.
- The security group examples used inline ingress rules and `aws_security_group_rule`. Updated them to use `aws_vpc_security_group_ingress_rule`, matching the current AWS provider guidance for VPC security group rules.
- The conditional port example originally used `count` over a list. While valid, the updated current AWS provider resource needs one ingress rule per CIDR/port combination, so it now uses a map expression for `for_each`; this also avoids the Terraform limitation that resource `for_each` accepts maps or sets of strings, not sets of numbers.
- The dynamic `ebs_block_device` example described the always-present volume as a root volume and used `/dev/sda1`. The AWS provider documents `ebs_block_device` as managing non-root EBS block devices. Updated the example to describe a default data volume using `/dev/sdf`.

## Review Notes
The post is technically sound after the corrections. Terraform was not installed in the local environment, so validation was performed against official HashiCorp Terraform and AWS provider documentation rather than by executing `terraform validate`.
