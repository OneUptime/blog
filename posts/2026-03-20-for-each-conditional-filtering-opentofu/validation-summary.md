# Validation Summary: How to Use for_each with Conditional Filtering in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider resources (`aws_iam_user`, `aws_iam_user_login_profile`, `aws_lb_target_group`, `aws_route53_record`, `aws_acm_certificate`)

## Sources Consulted
- OpenTofu `for_each` meta-argument docs: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu `for` expressions docs: https://opentofu.org/docs/language/expressions/for/
- OpenTofu `lookup` function docs: https://opentofu.org/docs/language/functions/lookup/
- OpenTofu `length` function docs: https://opentofu.org/docs/language/functions/length/
- Terraform Registry AWS provider docs for `aws_iam_user_login_profile`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user_login_profile
- Terraform Registry AWS provider docs for `aws_lb_target_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Terraform Registry AWS provider docs for `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform Registry AWS provider docs for `aws_acm_certificate`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate

## Issues Found
- The description said the post covered filtering map and list inputs directly for `for_each`. OpenTofu requires `for_each` values to be a map or a set of strings, and lists must be transformed first, so I corrected the wording to refer to collection inputs more generally.
- The introduction said `for_each` works with a map or set. I tightened this to "map or set of strings" to match the OpenTofu documentation precisely.
- The "Filtering by Value Presence" section said the example handled non-null or non-empty values, but the actual code only checks for an empty string sentinel. I corrected the wording to "non-empty."
- The final filtering section was titled as using `contains` and `length`, but the code uses `lookup` and `length`. I corrected the heading to match the actual implementation.

## Review Notes
- The HCL filtering patterns shown in the post are valid OpenTofu syntax and align with the documented `for ... if ...` expression form used to build filtered maps for `for_each`.
- The AWS resource snippets are technically valid as shown, though they are partial examples and omit surrounding provider, variable, and data source declarations that would be needed in a full working configuration.
- The `aws_iam_user_login_profile` example is valid without `pgp_key`, but the provider documentation notes different password handling behavior depending on whether `pgp_key` is supplied. A future revision could mention that secret-handling caveat explicitly.
