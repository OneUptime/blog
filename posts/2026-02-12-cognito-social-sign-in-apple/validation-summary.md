# Validation Summary: How to Set Up Cognito Social Sign-In with Apple

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Cognito user pools
- Sign in with Apple
- AWS CLI
- Terraform AWS provider
- AWS Amplify Auth
- Apple AuthenticationServices
- AWS Secrets Manager
- AWS Lambda
- Amazon SES
- OAuth 2.0 and OpenID Connect
- JSON Web Tokens

## Sources Consulted
- Amazon Cognito Developer Guide: Using social identity providers with a user pool: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html
- AWS CLI Command Reference: `cognito-idp create-identity-provider`: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-identity-provider.html
- Boto3 Cognito `update_identity_provider` API reference: https://docs.aws.amazon.com/boto3/latest/reference/services/cognito-idp/client/update_identity_provider.html
- Terraform AWS provider `aws_cognito_identity_provider`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_identity_provider
- Apple Developer: Create a Sign in with Apple private key: https://developer.apple.com/help/account/capabilities/create-a-sign-in-with-apple-private-key
- Apple Developer: Creating a client secret: https://developer.apple.com/documentation/accountorganizationaldatasharing/creating-a-client-secret
- Apple Developer: Configure private email relay service: https://developer.apple.com/help/account/capabilities/configure-private-email-relay-service
- Apple App Review Guidelines, Login Services: https://developer.apple.com/app-store/review/guidelines/
- AWS Amplify JavaScript Auth sign-in documentation: https://docs.amplify.aws/javascript/frontend/auth/sign-in/
- AWS Amplify JavaScript API reference for `signInWithRedirect`: https://aws-amplify.github.io/amplify-js/api/functions/aws_amplify.auth.signInWithRedirect.html
- Amazon Cognito identity pools Sign in with Apple documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/apple.html

## Issues Found
- The post said Cognito setup requires generating and regularly rotating an Apple client-secret JWT. This is inaccurate for Cognito user-pool social providers. AWS accepts `client_id`, `team_id`, `key_id`, `private_key`, and `authorize_scopes` for `SignInWithApple`; Cognito generates the client secret during the token exchange. I changed the post to distinguish direct Apple OAuth from Cognito user-pool configuration.
- The JWT generation example labeled 180 days as the maximum allowed expiration. Apple documents a six-month limit; 180 days is a safe value under that limit, not the exact maximum. I updated the code comment.
- The secret-rotation Lambda attempted to update Cognito with `client_secret`, which is not the documented `SignInWithApple` provider detail for create or update requests. I replaced it with a private-key update example that sends the required Apple provider details.
- The native iOS section implied that an `AuthenticationServices` Apple identity token can be passed directly into the same Cognito user-pool social-provider flow. Cognito user-pool social sign-in uses hosted UI or Amplify web UI redirects; a direct Apple token is applicable to a separate native federation pattern such as Cognito identity pools or a backend exchange. I corrected the wording.

## Review Notes
- The Terraform example stores the Apple private key in Terraform configuration/state if used as shown. The post already mentions using a secret, but a production implementation should avoid committing the `.p8` file and should account for Terraform state sensitivity.
- The Pre Sign-Up trigger example is reasonable for capturing mapped attributes, but Apple and Cognito both document cases where requested Apple scopes might not be returned after the first sign-in or after failed flows.
