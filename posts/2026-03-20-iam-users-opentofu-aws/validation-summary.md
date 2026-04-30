# Validation Summary: IAM Users with OpenTofu on AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS IAM
- AWS Secrets Manager
- OpenTofu
- HCL
- Terraform AWS Provider

## Sources Consulted
- AWS IAM Users: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users.html
- AWS IAM security best practices: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- AWS access key guidance: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html#securing_access-keys
- OpenTofu output values and `sensitive`: https://opentofu.org/docs/language/values/outputs/
- OpenTofu sensitive data in state: https://opentofu.org/docs/language/state/sensitive-data/
- HashiCorp AWS provider `aws_iam_access_key`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_access_key.html.markdown
- HashiCorp AWS provider `aws_iam_user_login_profile`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_user_login_profile.html.markdown
- HashiCorp AWS provider `aws_iam_user_group_membership`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_user_group_membership.html.markdown
- HashiCorp AWS provider `aws_iam_group_policy_attachment`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_group_policy_attachment.html.markdown
- HashiCorp AWS provider `aws_iam_user_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_user_policy.html.markdown
- HashiCorp AWS provider `aws_secretsmanager_secret`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/secretsmanager_secret.html.markdown
- HashiCorp AWS provider `aws_secretsmanager_secret_version`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/secretsmanager_secret_version.html.markdown

## Issues Found
- The Secrets Manager example referenced `aws_secretsmanager_secret.user_creds.id` without defining the `aws_secretsmanager_secret` resource. I added the missing secret resource so the snippet is self-contained and valid.
- The “Storing Secrets Safely” section implied that moving the generated access key into Secrets Manager makes the workflow safe by itself. I corrected the text to note that when OpenTofu creates and passes the secret value, the value is still stored in OpenTofu state.
- The final best-practice bullet said that marking outputs as `sensitive` prevents logging. I corrected this to match OpenTofu behavior: `sensitive` hides values from normal CLI output, but does not remove them from state.

## Review Notes
The post is now technically correct, but readers should still understand that `aws_iam_access_key.secret` and plaintext login-profile passwords are state-sensitive values. For stronger handling in newer OpenTofu workflows, write-only attributes and other ephemeral features can reduce state exposure, but that is outside the scope of this post.
