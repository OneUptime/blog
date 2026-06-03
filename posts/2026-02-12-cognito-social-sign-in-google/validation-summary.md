# Validation Summary: How to Set Up Cognito Social Sign-In with Google

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Cognito user pools
- Cognito hosted UI and OAuth 2.0 authorization code flow
- Google OAuth 2.0 and OpenID Connect
- Terraform AWS provider
- AWS CLI Cognito Identity Provider commands
- AWS Amplify JavaScript Auth
- React
- Cognito Lambda triggers

## Sources Consulted
- Amazon Cognito: Using social identity providers with a user pool: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html
- Amazon Cognito: Authorization endpoint: https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html
- Amazon Cognito API Reference: CreateIdentityProvider: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_CreateIdentityProvider.html
- Amazon Cognito: Mapping IdP attributes to profiles and tokens: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-specifying-attribute-mapping.html
- Amazon Cognito: Linking federated users to an existing user profile: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation-consolidate-users.html
- Amazon Cognito API Reference: AdminLinkProviderForUser: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminLinkProviderForUser.html
- Terraform AWS provider: aws_cognito_identity_provider: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_identity_provider.html
- Terraform AWS provider: aws_cognito_user_pool_client: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_client
- Terraform AWS provider: aws_cognito_user_pool_domain: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_domain
- AWS Amplify JavaScript: Add social provider sign-in: https://docs.amplify.aws/gen1/nextjs/build-a-backend/auth/add-social-provider/
- AWS Amplify JavaScript: Sign-in with external identity provider: https://docs.amplify.aws/javascript/frontend/auth/sign-in/
- Google Identity: OpenID Connect claims and scopes: https://developers.google.com/identity/openid-connect/openid-connect

## Issues Found
- The OAuth sequence diagram said Cognito redirects to the app with Cognito tokens. For the authorization code flow used throughout the post, Cognito redirects with an authorization code, then the app exchanges that code for tokens. Updated the diagram to show the code exchange.
- The account-linking section implied that setting `autoConfirmUser` and `autoVerifyEmail` in a Pre Sign-Up trigger links Google users to existing password users. That trigger response only auto-confirms/verifies the federated signup. Updated the text and comment to clarify that full linking requires `AdminLinkProviderForUser`.

## Review Notes
- The AWS CLI executable was not installed in the local environment, so CLI syntax was checked against the official Amazon Cognito API documentation rather than local `aws --help` output.
- The Terraform and Amplify examples match current documented resource fields and Amplify Auth APIs. In production, avoid hard-coding Google client secrets in Terraform source and store them in a secrets manager or protected variable.
