# Validation Summary: IP Address Allocation with cidrsubnets in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- CIDR subnetting
- AWS VPC
- AWS subnets

## Sources Consulted
- OpenTofu `cidrsubnet` function docs: https://opentofu.org/docs/language/functions/cidrsubnet/
- OpenTofu `cidrsubnets` function docs: https://opentofu.org/docs/language/functions/cidrsubnets/
- OpenTofu `cidrnetmask` function docs: https://opentofu.org/docs/language/functions/cidrnetmask/
- OpenTofu `can` function docs: https://opentofu.org/docs/language/functions/can/
- OpenTofu `try` function docs: https://opentofu.org/docs/language/functions/try/
- OpenTofu input variables docs: https://opentofu.org/docs/language/values/variables/
- AWS subnet sizing docs: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html
- AWS VPC CIDR block docs: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- HashiCorp Terraform language reference example for `aws_vpc`/`aws_subnet` syntax: https://developer.hashicorp.com/terraform/language

## Issues Found
- The `vpc_cidr` validation used `cidrhost`, but OpenTofu documents `cidrhost` as working with both IPv4 and IPv6 prefixes. I changed that check to `can(cidrnetmask(var.vpc_cidr))`, because `cidrnetmask` is defined for IPv4 CIDR prefixes only and matches the snippet's error message.
- The prefix-length validation allowed `/24`, but OpenTofu documents `cidrsubnets` as adding `newbits` to the existing prefix length. In this post's example, `cidrsubnets(var.vpc_cidr, 8, ...)` only creates `/24` subnets when the VPC CIDR is `/16`; a `/24` VPC would instead yield `/32` results, which are not valid AWS subnets. I changed the validation to require `/16` for this example and clarified the message.
- I wrapped the prefix-length check in `try(..., false)` so malformed input fails validation cleanly instead of raising an expression error while indexing or converting the prefix length.

## Review Notes
- The `cidrsubnet` and `cidrsubnets` examples otherwise match the behavior documented by OpenTofu.
- The example `availability_zone` names are acceptable for illustration, but AWS maps AZ letter suffixes per account, so production modules often derive AZs dynamically rather than hard-coding `us-east-1a`, `us-east-1b`, and `us-east-1c`.
- A local `tofu console` verification pass was not possible in this environment because the `tofu` CLI is not installed.
