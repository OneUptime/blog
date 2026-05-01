# Validation Summary: How to Design a Multi-Account Module for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider for OpenTofu/Terraform
- AWS IAM
- AWS STS
- Amazon S3
- Amazon EBS
- Amazon GuardDuty

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu provider configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu module `providers` meta-argument: https://opentofu.org/docs/v1.11/language/meta-arguments/module-providers/
- OpenTofu providers within modules: https://opentofu.org/docs/language/modules/develop/providers/
- HCL native syntax specification: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
- AWS provider configuration reference (`assume_role`): https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/index.html.markdown
- AWS provider docs for `aws_iam_account_password_policy`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_account_password_policy.html.markdown
- AWS provider docs for `aws_ebs_encryption_by_default`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ebs_encryption_by_default.html.markdown
- AWS provider docs for `aws_s3_account_public_access_block`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_account_public_access_block.html.markdown
- AWS provider docs for `aws_guardduty_detector`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/guardduty_detector.html.markdown
- AWS provider docs for `aws_guardduty_organization_admin_account`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/guardduty_organization_admin_account.html.markdown
- AWS provider docs for `aws_guardduty_organization_configuration`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/guardduty_organization_configuration.html.markdown
- AWS provider docs for `aws_guardduty_member`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/guardduty_member.html.markdown
- AWS provider docs for `aws_iam_role`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_role.html.markdown
- AWS provider docs for `aws_iam_role_policy_attachment`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_role_policy_attachment.html.markdown
- AWS STS `AssumeRole` API reference: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html
- AWS IAM account password policy docs: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_account-policy.html
- Amazon GuardDuty Organizations docs: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_organizations.html

## Issues Found
- The root `accounts` object did not include `environment`, even though the module call used `each.value.environment`. I added the field and the missing dynamic `provider "aws"` block so `aws.accounts[each.key]` is a valid provider instance reference.
- The provider guidance said module/provider support was "still being enhanced," which does not reflect the current OpenTofu model. I replaced it with the documented pattern: keep provider configurations in the root module and pass them into child modules with the `providers` meta-argument.
- The child module example did not declare `required_providers`. I added a `terraform` block with the AWS provider requirement because each OpenTofu module must declare its provider requirements.
- Two single-line `variable` blocks used multiple arguments separated by semicolons. HCL one-line blocks permit at most a single argument, so I expanded those definitions into valid multiline blocks.
- The "strict" IAM password policy omitted lowercase requirements, which made the effective password policy weaker than intended. I added `require_lowercase` and mapped it to `require_lowercase_characters`.
- The GuardDuty example used `guardduty_master_account` as a toggle even though `aws_guardduty_detector` only creates a detector in the current account and region. I changed that input to `guardduty_enabled` and corrected the surrounding wording so it no longer implies GuardDuty organization administration or member association.
- The conclusion described default EBS encryption and GuardDuty as if they were account-wide controls. Both are region-scoped in the AWS provider, so I updated the wording to say they are applied consistently in the configured region.

## Review Notes
- `security_hub_enabled` and `cloudtrail_bucket` remain placeholders in the example module and are not yet wired to resources. This is not technically incorrect, but readers wanting a fuller account-baseline example would need additional resources.
- Full GuardDuty organization onboarding still requires separate resources such as `aws_guardduty_organization_admin_account`, `aws_guardduty_organization_configuration`, and/or `aws_guardduty_member`; the post now avoids implying that `aws_guardduty_detector` alone handles that.
- A live `tofu validate` run was not possible in this environment because the `tofu` CLI is not installed, so validation was performed against the official language and provider documentation.
