# Validation Summary: How to Create a Cognito User Pool

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Cognito User Pools
- AWS CLI
- Terraform
- Amazon SES
- AWS Certificate Manager

## Sources Consulted
- AWS CLI Command Reference: create-user-pool: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-user-pool.html
- Amazon Cognito Developer Guide: Working with user attributes: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html
- Amazon Cognito Developer Guide: Email settings for user pools: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html
- Amazon Cognito Developer Guide: Quotas in Amazon Cognito: https://docs.aws.amazon.com/cognito/latest/developerguide/quotas.html
- Amazon Cognito Developer Guide: Working with user devices in your user pool: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-device-tracking.html
- HashiCorp Terraform AWS Provider: aws_cognito_user_pool: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool
- HashiCorp Terraform AWS Provider: aws_cognito_user_pool_domain: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_domain

## Issues Found
- The post stated that Amazon SES has "No daily limit" and is "Required for production." Amazon SES is quota-based, while Cognito's default email feature has a 50-email-per-day quota per AWS account. Updated the wording to say SES is recommended for production and provides higher sending quotas.
- The custom domain Terraform example did not mention that Cognito custom domains require an issued ACM certificate in us-east-1. Added a comment to the snippet to prevent an invalid regional certificate configuration.

## Review Notes
AWS CLI was not installed in the local environment, so CLI syntax was verified against the official AWS CLI command reference rather than local `--help` output. Terraform was also not installed locally, so Terraform resource fields were verified against the HashiCorp AWS provider documentation.
