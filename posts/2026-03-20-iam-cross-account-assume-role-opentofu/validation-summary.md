# Validation Summary: How to Set Up Cross-Account IAM Assume Role with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS IAM
- AWS STS
- AWS CLI
- AWS S3
- HCL

## Sources Consulted
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu `timestamp` function docs: https://opentofu.org/docs/language/functions/timestamp/
- OpenTofu `formatdate` function docs: https://opentofu.org/docs/language/functions/formatdate/
- AWS IAM `Principal` element docs: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
- AWS IAM cross-account trust relationship docs: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_update-role-trust-policy.html
- AWS IAM cross-account access using roles: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies-cross-account-resource-access.html
- AWS external ID guidance: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html
- AWS CLI `sts assume-role` reference: https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role.html
- AWS provider assume-role configuration reference: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The provider example used `timestamp()` inside `session_name`. OpenTofu provider arguments must use values known before apply, while `timestamp()` is only resolved during apply. I changed `session_name` to a static value so the provider configuration is valid.
- The trust policy comment said the `sts:ExternalId` condition “only allow[s] a specific role/user in the source account.” That is not what `ExternalId` does when the trusted principal is the entire source account. I corrected the comment to describe the actual purpose of `ExternalId`.
- The Step 2 attachment comment said the policy could be attached to a “role or admin group,” but `aws_iam_role_policy_attachment` only attaches to roles. I corrected the comment to match the resource being used.
- The CLI example referenced an undefined `SOURCE_ACCOUNT` shell variable. I replaced it with explicit placeholder account ID variables so the example is internally consistent.
- The CLI parsing commands used `echo $CREDENTIALS` unquoted. I changed them to `printf '%s' "$CREDENTIALS"` to avoid shell word-splitting issues.
- The prerequisites omitted `AWS CLI` and `jq`, both of which are required for the CLI example. I added them.
- The conclusion said automated pipelines can use sessions “up to 12 hours” without noting the role-chaining limit. I clarified that 12 hours depends on the role’s maximum session duration and that role chaining is limited to 1 hour.

## Review Notes
- The post is technically sound after the fixes above.
- The examples for creating the target-account role, granting source-account permissions, and then using the assumed-role provider are presented as per-account snippets. In practice, these are usually applied as separate configurations or with multiple provider setups during bootstrap.
- Trusting `arn:aws:iam::<account-id>:root` is valid and commonly documented by AWS, but it trusts the source account broadly. If a future revision wants to restrict access to a single source role, the trust policy should name that specific role ARN instead.
