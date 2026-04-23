# Validation Summary: How to Reference count.index in Resource Configuration in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform language / HCL
- AWS provider for Terraform / OpenTofu
- Amazon EC2
- Amazon Route 53
- AWS security groups

## Sources Consulted
- OpenTofu `count` meta-argument: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu data sources: https://opentofu.org/docs/language/data-sources/
- OpenTofu `range` function: https://opentofu.org/docs/language/functions/range/
- AWS provider `aws_ami` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/ami.html.markdown
- AWS provider `aws_instance` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- AWS provider `aws_subnet` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/subnet.html.markdown
- AWS provider `aws_route53_zone` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/route53_zone.html.markdown
- AWS provider `aws_route53_record` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_record.html.markdown
- AWS provider `aws_security_group_rule` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group_rule.html.markdown
- AWS provider `aws_vpc_security_group_ingress_rule` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_security_group_ingress_rule.html.markdown

## Issues Found
- The subnet-distribution example referenced `data.aws_subnet.selected[...]` without defining any corresponding data source instances. I added a counted `aws_subnet` data source so the `availability_zone` lookup is valid as written.
- The port-offset example used `aws_security_group_rule`, which the current AWS provider docs explicitly advise avoiding in favor of `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule`. I replaced it with `aws_vpc_security_group_ingress_rule` and updated the argument names to `cidr_ipv4` and `ip_protocol`.
- The conclusion said to "Always" add 1 to `count.index` for human-readable names. That was too absolute, so I changed it to say to add 1 when a 1-based label is desired.

## Review Notes
- After correction, the post is technically accurate and suitable for publication.
- The ordered-list examples using `count.index` are valid, but OpenTofu's official `count` documentation notes that `for_each` is often safer when instance identity should follow stable keys instead of list positions.
- The snippets assume supporting AWS provider configuration and related inputs or data sources such as `data.aws_ami.*` and `var.subnet_id` exist elsewhere in the configuration.
