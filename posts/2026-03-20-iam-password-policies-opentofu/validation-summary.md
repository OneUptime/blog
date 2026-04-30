# Validation Summary: How to Configure IAM Password Policies with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Identity and Access Management (IAM)
- AWS Config
- AWS CLI
- HCL

## Sources Consulted
- AWS IAM User Guide: Set an account password policy for IAM users — https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_account-policy.html
- AWS IAM API Reference: UpdateAccountPasswordPolicy — https://docs.aws.amazon.com/IAM/latest/APIReference/API_UpdateAccountPasswordPolicy.html
- AWS CLI Command Reference: `get-account-password-policy` — https://docs.aws.amazon.com/cli/latest/reference/iam/get-account-password-policy.html
- AWS IAM User Guide: AWS: Allows MFA-authenticated IAM users to manage their own MFA device on the Security credentials page — https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_aws_my-sec-creds-self-manage-mfa-only.html
- AWS IAM User Guide: AWS: Allows MFA-authenticated IAM users to manage their own credentials on the Security credentials page — https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_aws_my-sec-creds-self-manage.html
- AWS IAM User Guide: Secure API access with MFA — https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_configure-api-require.html
- AWS Config Developer Guide: `iam-password-policy` managed rule — https://docs.aws.amazon.com/config/latest/developerguide/iam-password-policy.html
- AWS provider docs: `aws_iam_account_password_policy` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_account_password_policy.html.markdown
- AWS provider docs: `aws_config_config_rule` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/config_config_rule.html.markdown
- AWS provider docs: `aws_iam_group_policy_attachment` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_group_policy_attachment.html.markdown

## Issues Found
- The `aws_iam_account_password_policy` example included `minimum_password_age`, but that argument is not supported by the AWS provider or AWS IAM account password policy API. It was removed.
- The password policy comment said the minimum password length range was `8-128`. AWS documents `6-128` for custom IAM password policies, so the comment was corrected.
- The `hard_expiry` explanation was inaccurate. It was updated to reflect the real behavior: it controls whether expired passwords require an administrator reset.
- The MFA policy example used a narrower `CreateVirtualMFADevice` resource ARN pattern and bundled MFA-device and user resources together. It was updated to follow AWS’s documented MFA self-management pattern more closely by separating virtual MFA device creation from user-level MFA management.
- The MFA deny allowlist included `iam:DeleteVirtualMFADevice`, which AWS warns against for users who are not MFA-authenticated. It was removed.
- The IAM group policy attachment example referenced undefined `aws_iam_group.*` resources, so the snippet would not work as shown. It was changed to a self-contained example using explicit group names with a replacement note.
- The post did not mention that the deny-based Force MFA pattern blocks first-time and expired-password resets during console sign-in unless specific actions are exempted. A short caveat was added.
- The AWS Config example omitted an operational prerequisite from the surrounding explanation. A note was added that AWS Config must already have a configuration recorder and delivery channel enabled.

## Review Notes
- The `IAM_PASSWORD_POLICY` AWS Config managed rule evaluates a global IAM account setting. AWS documents regional nuances for global IAM resource recording, so future revisions could mention deploying this rule in an appropriate supported Region to avoid unnecessary duplicate evaluations.
