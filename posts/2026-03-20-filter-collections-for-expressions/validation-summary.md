# Validation Summary: How to Filter Collections with for Expressions in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- AWS provider for Terraform/OpenTofu
- Route 53
- VPC subnet data sources

## Sources Consulted
- OpenTofu `for` expressions: https://opentofu.org/docs/language/expressions/for/
- OpenTofu expressions overview: https://opentofu.org/docs/language/expressions/
- OpenTofu `lookup` function: https://opentofu.org/docs/language/functions/lookup/
- OpenTofu `startswith` function: https://opentofu.org/docs/language/functions/startswith/
- OpenTofu `endswith` function: https://opentofu.org/docs/language/functions/endswith/
- OpenTofu `contains` function: https://opentofu.org/docs/language/functions/contains/
- OpenTofu `tofu console` command: https://opentofu.org/docs/cli/commands/console/
- AWS provider `aws_subnets` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets
- AWS provider `aws_subnet` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnet
- AWS provider `aws_route53_record` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS provider `aws_security_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The `aws_route53_record.services` example used `each.value.ip`, but the earlier `var.instances` objects did not define an `ip` attribute. I added example IP addresses to each instance object so the later Route 53 `A` record example is valid and self-consistent.
- The subnet filtering example used `subnet.tags["Tier"] == "private"`, which can fail if a returned subnet does not have a `Tier` tag. I changed it to `lookup(subnet.tags, "Tier", "") == "private"` so the filter safely excludes untagged subnets.

## Review Notes
- The post's OpenTofu `for` expression syntax and filtering explanations align with the current OpenTofu language docs.
- The `aws_security_group` dynamic `ingress` example is valid, but the current AWS provider documentation recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` for new security-group rules instead of inline `ingress` and `egress` blocks.
- `tofu console` is documented primarily as an interactive tool and warns that it is not designed for scripts. The piped example in the post is still plausible for quick testing, but that caveat is worth keeping in mind.
