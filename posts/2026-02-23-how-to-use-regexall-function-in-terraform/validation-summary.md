# Validation Summary: How to Use the regexall Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform built-in functions: `regexall`, `regex`, `length`, `tonumber`
- Terraform variable validation
- Terraform AWS provider security group rules
- RE2 regular expressions

## Sources Consulted
- HashiCorp Terraform `regexall` function documentation: https://developer.hashicorp.com/terraform/language/functions/regexall
- HashiCorp Terraform `regex` function documentation and regex syntax reference: https://developer.hashicorp.com/terraform/language/functions/regex
- HashiCorp Terraform built-in functions documentation: https://developer.hashicorp.com/terraform/language/functions
- HashiCorp AWS provider `aws_security_group_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule

## Issues Found
- The post said `regexall` always returns a list and never throws an error. HashiCorp documents `regexall` as returning an empty list for no matches, but invalid regular expression patterns can still fail. Updated the wording to clarify that the no-match case is safe when the pattern is valid.
- The post said empty lists are falsy in many contexts. Terraform does not coerce lists to booleans in conditions, so the correct existence check is `length(regexall(...)) > 0`. Updated the explanation while keeping the examples intact.
- The CIDR section described a loose regular expression as validating CIDR blocks. The expression only extracts CIDR-looking strings and does not validate IPv4 octet ranges or prefix ranges. Updated the heading and wording to describe extraction instead of validation.
- The version example used the name `is_valid_semver` for a check that only counts dots. Updated the name to `has_semver_dot_count` and clarified the comment.
- The ports example said the regex extracted numbers after specific keywords or colons, but the pattern matches any 2-5 digit sequence. Updated the comment to match the actual pattern.
- The `regex` comparison said to use `regex` when you need exactly one match. Terraform `regex` returns the first match and does not enforce that there is only one match. Updated the wording to "only need the first match."

## Review Notes
- The AWS provider still documents `aws_security_group_rule`, and the shown arguments are valid. However, current provider documentation recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` for new production configurations, especially with one CIDR block per rule.
- Terraform was not installed in the local workspace, so examples were reviewed statically against official documentation rather than executed with `terraform console`.
