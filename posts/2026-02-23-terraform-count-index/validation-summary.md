# Validation Summary: How to Use count.index in Terraform Resource Creation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform `count` meta-argument
- Terraform `for_each` meta-argument
- Terraform splat expressions
- AWS Terraform provider resources

## Sources Consulted
- Terraform `count` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform splat expressions reference: https://developer.hashicorp.com/terraform/language/expressions/splat
- Terraform `cidrsubnet` function reference: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform `length` function reference: https://developer.hashicorp.com/terraform/language/functions/length
- AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_subnet` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- AWS provider `aws_eip` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- AWS provider `aws_cloudwatch_metric_alarm` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS provider `aws_security_group_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- AWS provider `aws_vpc_security_group_ingress_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule

## Issues Found
- The security group rule example used `aws_security_group_rule`. The AWS provider documentation now recommends avoiding that resource for new configurations and using `aws_vpc_security_group_ingress_rule` or `aws_vpc_security_group_egress_rule` instead. Updated the ingress example to use `aws_vpc_security_group_ingress_rule` with `cidr_ipv4` and `ip_protocol`, preserving the original `count.index` behavior.

## Review Notes
- Terraform was not installed in the local environment, so examples were reviewed against official HashiCorp Terraform and AWS provider documentation rather than running `terraform validate`.
- The post uses placeholder AMI IDs and partial resource snippets that assume surrounding resources such as `aws_vpc.main`, `aws_security_group.app`, and `aws_subnet.public` exist.
