# Validation Summary: How to Set Up Cognito with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Cognito User Pools
- AWS Cognito User Pool Clients
- AWS Cognito User Pool Domains
- AWS Cognito User Groups
- AWS Cognito Identity Pools
- AWS Lambda triggers
- Terraform AWS provider
- Terraform CLI

## Sources Consulted
- Terraform AWS provider documentation for `aws_cognito_user_pool`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool
- Terraform AWS provider documentation for `aws_cognito_user_pool_client`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_client
- Terraform AWS provider documentation for `aws_cognito_user_pool_domain`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_domain
- Terraform AWS provider documentation for `aws_cognito_user_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_group
- Terraform AWS provider documentation for `aws_cognito_identity_pool`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_identity_pool
- Terraform AWS provider documentation for `aws_cognito_identity_pool_roles_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_identity_pool_roles_attachment
- AWS Cognito user pool feature plans: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-sign-in-feature-plans.html
- AWS Cognito custom domain documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-add-custom-domain.html
- AWS Cognito CreateUserPoolDomain API reference: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_CreateUserPoolDomain.html
- AWS CloudFormation Cognito LambdaConfig documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cognito-userpool-lambdaconfig.html
- AWS CloudFormation Cognito PreTokenGenerationConfig documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cognito-userpool-pretokengenerationconfig.html
- Terraform CLI command documentation: https://developer.hashicorp.com/terraform/cli/commands

## Issues Found
- The user pool enabled `advanced_security_mode = "AUDIT"` without setting the user pool feature plan. AWS Cognito requires the Plus feature plan for `AUDIT` or `ENFORCED` advanced security mode, so `user_pool_tier = "PLUS"` was added to the user pool example.
- The custom domain comment said only that an ACM certificate was required. AWS Cognito custom domains require the ACM certificate to be in `us-east-1` and require a DNS alias record to the Cognito-managed CloudFront target, so the comment was corrected.
- The Lambda trigger example used the legacy `pre_token_generation` field and repeated the `aws_cognito_user_pool.main` resource. The snippet was corrected to show adding `lambda_config` to the existing user pool and to use `pre_token_generation_config` with `lambda_arn` and `lambda_version`.

## Review Notes
- The examples still assume supporting IAM roles, Lambda deployment packages, AWS provider configuration, and DNS/certificate resources exist elsewhere.
- The Cognito prefix domain must be region-unique and comply with Cognito domain naming rules; the default example values are valid, but real application names should be checked before apply.
