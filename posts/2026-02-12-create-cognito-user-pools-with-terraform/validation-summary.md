# Validation Summary: How to Create Cognito User Pools with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Cognito User Pools
- Terraform AWS Provider
- Amazon SES
- OAuth 2.0 and OpenID Connect
- Cognito hosted UI / managed login
- Cognito identity providers
- AWS Lambda triggers

## Sources Consulted
- Terraform AWS Provider `aws_cognito_user_pool`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool
- Terraform AWS Provider `aws_cognito_user_pool_client`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_client
- Terraform AWS Provider `aws_cognito_user_pool_domain`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_domain
- Terraform AWS Provider `aws_cognito_identity_provider`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_identity_provider
- Terraform AWS Provider `aws_cognito_resource_server`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_resource_server
- Amazon Cognito user attributes documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html
- Amazon Cognito user pool domain documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-assign-domain.html
- Amazon Cognito prefix domain documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-assign-domain-prefix.html
- Amazon Cognito resource server and custom scopes documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html
- Amazon Cognito OAuth grants documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/federation-endpoints-oauth-grants.html
- Amazon Cognito email settings documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html
- Amazon Cognito verification message documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-settings-message-customizations.html

## Issues Found
- Custom attributes were described as only non-removable. Updated the text to say they can't be removed or changed after creation, matching Amazon Cognito's documented behavior.
- The backend app client used literal custom scopes without tying them to the Terraform resource server. Updated `allowed_oauth_scopes` to use `aws_cognito_resource_server.api.scope_identifiers`, which also creates the Terraform dependency on the resource server scopes.
- The backend client credentials example included `ALLOW_REFRESH_TOKEN_AUTH`, but Cognito client credentials grants return access tokens only. Removed that auth flow from the example and added a brief comment.
- The hosted UI was described as being at the bare Cognito domain. Updated the text to distinguish the domain from the `/login` URL with the required OAuth query parameters.
- The Lambda trigger comments described `pre_authentication` as customizing authentication challenges. Updated the comment to describe pre-authentication accurately, and clarified that each trigger Lambda needs its own invoke permission.

## Review Notes
- The Terraform snippets use current AWS provider resource and argument names. Terraform CLI was not installed in the local environment, so syntax was reviewed against the official provider documentation rather than by running `terraform validate`.
- The custom domain example correctly uses an ACM certificate ARN, but production configurations also need DNS alias records to the Cognito CloudFront distribution.
