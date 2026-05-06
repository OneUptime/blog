# Validation Summary: How to Handle Resources with Complex Import IDs in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS provider for Terraform/OpenTofu
- AWS IAM
- Amazon DynamoDB
- Amazon Route 53
- Amazon ECS
- AWS CLI

## Sources Consulted
- OpenTofu `tofu import` command docs: https://opentofu.org/docs/v1.7/cli/commands/import/
- OpenTofu import overview for v1.6: https://opentofu.org/docs/v1.6/cli/import/
- OpenTofu import block language docs for v1.6: https://opentofu.org/docs/v1.6/language/import/
- OpenTofu import block language docs for v1.11: https://opentofu.org/docs/v1.11/language/import/
- AWS provider docs source for `aws_iam_role_policy_attachment`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_role_policy_attachment.html.markdown
- AWS provider docs source for `aws_iam_user_group_membership`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_user_group_membership.html.markdown
- AWS provider docs source for `aws_iam_role_policy`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_role_policy.html.markdown
- AWS provider docs source for `aws_dynamodb_table`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/dynamodb_table.html.markdown
- AWS provider docs source for `aws_dynamodb_table_item`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/dynamodb_table_item.html.markdown
- AWS provider docs source for `aws_route53_record`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/route53_record.html.markdown
- AWS provider docs source for `aws_route53_vpc_association_authorization`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/route53_vpc_association_authorization.html.markdown
- AWS provider docs source for `aws_security_group_rule`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/security_group_rule.html.markdown
- AWS provider docs source for `aws_ecs_service`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ecs_service.html.markdown
- AWS provider docs source for `aws_ecs_task_definition`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ecs_task_definition.html.markdown
- AWS CLI reference for `list-attached-role-policies`: https://docs.aws.amazon.com/cli/latest/reference/iam/list-attached-role-policies.html

## Issues Found
- The `aws_iam_user_group_membership` import format was oversimplified. I updated it to show that the import ID can include multiple group names after the user name, separated by `/`, which matches the provider docs.
- The inline IAM policy label referred to an "IAM Policy Document", but the resource shown is `aws_iam_role_policy`. I corrected the label to match the actual resource.
- The post claimed `aws_dynamodb_table_item` could be imported with a composite ID. That is incorrect; this resource is not importable. I removed the invalid import command and replaced it with a note reflecting provider behavior.
- The `aws_route53_record` import example used slash-delimited segments. The provider expects underscore-delimited IDs for classic imports, with an optional trailing set identifier. I corrected the format and example.
- The Route 53 authorization example was labeled as a zone association, but the resource shown is `aws_route53_vpc_association_authorization`. I corrected the label to match the resource type.
- The `aws_security_group_rule` example incorrectly used an `sgrule-...` style identifier. This resource imports with a composite ID built from the security group ID, rule direction, protocol, ports, and sources/destinations. I corrected both the format description and example.
- The import block section heading said `OpenTofu 1.5+`. OpenTofu import blocks are documented in OpenTofu 1.6, while loopable `for_each` support on import blocks is documented in OpenTofu 1.7+. I corrected the heading to avoid a version error.
- The `tofu plan` verification comment implied a successful import always results in a no-op plan. I clarified that this is only true when the configuration matches the live resource.
- The summary implied everything in scope was importable. I updated it to reflect that some resources cannot be imported at all.

## Review Notes
- Current AWS provider docs also document `identity`-based imports for some resources in Terraform v1.12+, but the post is focused on the classic `id`-based import patterns that OpenTofu users commonly rely on.
- OpenTofu supports import blocks in 1.6+, but `for_each` on `import` blocks is a 1.7+ capability. The post now reflects that distinction.
