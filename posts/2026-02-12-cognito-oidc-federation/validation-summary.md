# Validation Summary: How to Set Up Cognito OIDC Federation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Cognito user pools
- OpenID Connect (OIDC)
- OAuth 2.0 authorization code flow
- Terraform AWS provider
- AWS CLI
- AWS Amplify Auth for JavaScript
- Auth0
- Keycloak
- JWT validation

## Sources Consulted
- Amazon Cognito Developer Guide: Using OIDC identity providers with a user pool: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-oidc-idp.html
- Amazon Cognito API Reference: CreateIdentityProvider: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_CreateIdentityProvider.html
- AWS CLI Command Reference: cognito-idp create-identity-provider: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-identity-provider.html
- Amazon Cognito Developer Guide: The redirect and authorization endpoint: https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html
- Amazon Cognito Developer Guide: Verifying JSON web tokens: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
- AWS Amplify JavaScript documentation: Sign in with an external identity provider: https://docs.amplify.aws/javascript/frontend/auth/sign-in/
- AWS JWT Verify README: https://github.com/awslabs/aws-jwt-verify
- Terraform Registry: aws_cognito_identity_provider: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_identity_provider.html
- Auth0 documentation: Application Settings: https://auth0.com/docs/get-started/applications/application-settings

## Issues Found
- The post described Cognito as compatible with any standards-compliant OIDC provider. Updated this to say the provider must meet Cognito's OIDC requirements, because Cognito specifically requires support for `client_secret_post` at the token endpoint and has endpoint/signing constraints.
- The prerequisites described the issuer URL as the discovery endpoint. Updated it to describe the issuer base URL, with the discovery document located under `/.well-known/openid-configuration`.
- The OIDC Terraform and CLI examples included `token_request_method = "POST"` / `"token_request_method": "POST"`. Removed these from OIDC examples because Cognito's documented OIDC provider details do not use this as the control for OIDC client authentication; Cognito requires `client_secret_post`.
- The debugging guidance said some IdPs require POST while others accept GET for token exchange. Replaced it with Cognito-specific guidance to check `client_secret_post` support and token endpoint configuration.
- The token validation example used `jwt-decode` and only checked issuer and expiration. Replaced it with `aws-jwt-verify` and `CognitoJwtVerifier`, which verifies the signature, token use, issuer/JWKS, expiration, and app-client audience.

## Review Notes
- The Auth0 issuer trailing slash note is retained because Auth0 discovery documents commonly publish an issuer value with a trailing slash, and issuer values must match exactly.
- The direct hosted UI URL would be stronger with `state` and PKCE parameters in a production app, but the current minimal example is valid for showing IdP redirection.
