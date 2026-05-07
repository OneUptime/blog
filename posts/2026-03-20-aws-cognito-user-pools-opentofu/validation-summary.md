# Validation Summary: How to Create AWS Cognito User Pools with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- HCL
- AWS Cognito User Pools
- Amazon SES
- AWS Certificate Manager (ACM)
- AWS provider for Terraform/OpenTofu

## Sources Consulted
- AWS provider `aws_cognito_user_pool` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool
- AWS provider `aws_cognito_user_pool_domain` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_domain
- AWS Cognito `VerificationMessageTemplateType` API reference: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_VerificationMessageTemplateType.html
- AWS Cognito user attributes guide: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html
- AWS Cognito custom domain guide: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-add-custom-domain.html
- AWS Cognito `CreateUserPoolDomain` API reference: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_CreateUserPoolDomain.html
- AWS Cognito email settings guide: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/cli/commands/apply/
- AWS provider Cognito user pool implementation in the official provider repository: https://github.com/hashicorp/terraform-provider-aws/blob/main/internal/service/cognitoidp/user_pool.go

## Issues Found
- The `verification_message_template` example set `email_subject` and `email_message` without also using Cognito email sending mode `DEVELOPER`. AWS only allows those template fields when `EmailSendingAccount` is `DEVELOPER`, so I removed those fields from the base user-pool example and kept the valid `default_email_option`.
- The custom-attributes section said to prefix attribute names with `custom:` in the schema block. In Terraform/OpenTofu configuration, the provider uses the bare attribute name there and Cognito exposes it later as `custom:<name>`, so I corrected the comment.
- The `subscription_tier` schema attribute was a `String` without a `string_attribute_constraints` block. The AWS provider documentation notes that string schema attributes should include the constraints block to avoid perpetual recreation, so I added `string_attribute_constraints {}`.
- The custom-domain example referenced `var.acm_certificate_arn`, but the variables section did not declare it. I added the missing variable and clarified that the ACM certificate for Cognito custom domains must be in `us-east-1`.

## Review Notes
- The OpenTofu deployment commands are valid as a saved-plan workflow: `tofu plan -out=tfplan` followed by `tofu apply tfplan`.
- A Cognito custom domain also needs DNS aliasing to the CloudFront distribution that Cognito returns, and a user pool app client, before the hosted UI or managed login flow is usable.
