# Validation Summary: How to Use for_each Keys in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider resources used as examples
- Infrastructure as Code

## Sources Consulted
- OpenTofu `for_each` meta-argument docs: https://opentofu.org/docs/language/meta-arguments/for_each/
- OpenTofu `for` expressions docs: https://opentofu.org/docs/language/expressions/for/
- OpenTofu `toset` function docs: https://opentofu.org/docs/language/functions/toset/
- OpenTofu `values` function docs: https://opentofu.org/docs/language/functions/values/
- AWS provider `aws_ecs_service` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ecs_service.html.markdown
- AWS provider `aws_s3_bucket` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket.html.markdown
- AWS provider `aws_subnet` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/subnet.html.markdown
- AWS provider `aws_iam_user` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_user.html.markdown

## Issues Found
- The `aws_ecs_service` example omitted `task_definition`, which the current AWS provider requires unless using the `EXTERNAL` deployment controller. I added `task_definition = aws_ecs_task_definition.services[each.key].arn` so the example matches the provider's required arguments.
- The `toset()` note incorrectly said a map preserves ordering or supports duplicates. OpenTofu sets discard ordering and duplicates, while `for_each` instance identity should come from stable, unique map keys. I corrected the note to describe that accurately.
- The "Removing an Instance" example used list syntax for `services`, even though `for_each` works from a map or a set of strings and the earlier `services` example is a map. I changed the example to show removing a map key.

## Review Notes
- The post's core explanation of `each.key`, `each.value`, state addresses, and set behavior matches the current OpenTofu documentation.
- `values()` returns map values in lexicographical key order. The post uses it correctly, and the example does not depend on a conflicting ordering assumption.
