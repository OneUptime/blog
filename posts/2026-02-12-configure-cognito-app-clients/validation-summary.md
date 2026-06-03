# Validation Summary: How to Configure Cognito App Clients

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon Cognito User Pools
- Cognito app clients
- OAuth 2.0 and OpenID Connect
- Terraform AWS provider
- JavaScript Fetch API

## Sources Consulted
- Amazon Cognito Developer Guide: Application-specific settings with app clients: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html
- Amazon Cognito API reference via botocore: create_user_pool_client: https://docs.aws.amazon.com/botocore/latest/reference/services/cognito-idp/client/create_user_pool_client.html
- Amazon Cognito Developer Guide: Scopes, M2M, and resource servers: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html
- Amazon Cognito Developer Guide: The token issuer endpoint: https://docs.aws.amazon.com/cognito/latest/developerguide/token-endpoint.html
- Amazon Cognito Developer Guide: Managing user existence error responses: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-managing-errors.html
- Terraform AWS provider documentation: aws_cognito_user_pool_client: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_client

## Issues Found
- The machine-to-machine Terraform example set `supported_identity_providers = []`. Cognito's app-client identity-provider setting is for managed login providers, and M2M client credentials clients don't need user sign-in providers. I removed the empty list to avoid sending an unnecessary and potentially invalid empty provider configuration.
- The post said Cognito returns user-existence errors "by default." AWS documents that API-created app clients default to `LEGACY`, while the console selects prevent-user-existence errors by default. Because the post uses Terraform/API-style configuration, I changed the wording to specify API or Terraform-created clients without this setting.

## Review Notes
The Terraform resource arguments, token-validity units and ranges, OAuth flow names, Cognito auth-flow constants, client credentials token request, callback/logout URL examples, and `prevent_user_existence_errors = "ENABLED"` setting were checked against official documentation and are technically valid.
