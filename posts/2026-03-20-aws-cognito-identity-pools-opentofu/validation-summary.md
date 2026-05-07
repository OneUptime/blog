# Validation Summary: How to Create AWS Cognito Identity Pools with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Cognito Identity Pools
- AWS Cognito User Pools
- AWS IAM
- Amazon S3

## Sources Consulted
- HashiCorp AWS provider docs for `aws_cognito_identity_pool`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cognito_identity_pool.html.markdown
- HashiCorp AWS provider docs for `aws_cognito_identity_pool_roles_attachment`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cognito_identity_pool_roles_attachment.html.markdown
- HashiCorp AWS provider docs for `aws_cognito_user_pool`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cognito_user_pool.html.markdown
- HashiCorp AWS provider docs for `aws_cognito_user_pool_client`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cognito_user_pool_client.html.markdown
- Amazon Cognito Developer Guide, Identity pools overview: https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html
- Amazon Cognito Developer Guide, IAM roles: https://docs.aws.amazon.com/cognito/latest/developerguide/iam-roles.html
- AWS IAM example policy for Cognito-backed S3 access: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_s3_cognito-bucket.html
- OpenTofu Strings and Templates: https://opentofu.org/docs/language/expressions/strings/
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu `count` meta-argument: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu CLI docs for `init`: https://opentofu.org/docs/v1.8/cli/commands/init/
- OpenTofu CLI docs for `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs for `apply`: https://opentofu.org/docs/v1.9/cli/commands/apply/

## Issues Found
- The main identity pool example disabled unauthenticated identities even though the post described guest access and attached an unauthenticated role. I changed `allow_unauthenticated_identities` to `true` so the example matches the tutorial and AWS guest-access behavior.
- The authenticated role policy used `\${...}` inside an OpenTofu string. OpenTofu requires `$${` to emit a literal `${...}` sequence, so I corrected the S3 ARN to preserve the AWS policy variable `${cognito-identity.amazonaws.com:sub}`.
- The `google_client_id` variable declaration placed `type` and `default` on one line in a way that was not valid HCL/OpenTofu syntax. I rewrote it as a standard multi-line variable block.
- The social-provider example would otherwise try to create an identity pool with an empty Google client ID because the variable defaults to `""`. I added `count = var.google_client_id == "" ? 0 : 1` so the example only creates the social identity pool when a real client ID is supplied.

## Review Notes
- `aws_cognito_user_pool.main.endpoint` is the correct value shape for `cognito_identity_providers.provider_name` in the AWS provider docs.
- The `${cognito-identity.amazonaws.com:sub}` policy variable refers to the identity ID from the identity pool, not the `sub` claim from a Cognito user pool token.
- The deployment commands `tofu init`, `tofu plan -out=tfplan`, and `tofu apply tfplan` are current and valid per the OpenTofu CLI docs.
