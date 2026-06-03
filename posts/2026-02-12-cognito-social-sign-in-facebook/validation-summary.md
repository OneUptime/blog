# Validation Summary: How to Set Up Cognito Social Sign-In with Facebook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Cognito User Pools
- Cognito hosted UI and OAuth 2.0 authorization code flow
- Facebook Login / Meta Graph API
- Terraform AWS provider
- AWS CLI
- AWS Amplify JavaScript Auth
- React
- AWS Lambda triggers

## Sources Consulted
- Amazon Cognito: Using social identity providers with a user pool: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html
- Amazon Cognito: Mapping IdP attributes to profiles and tokens: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-specifying-attribute-mapping.html
- AWS CloudFormation resource reference for AWS::Cognito::UserPoolIdentityProvider: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolidentityprovider.html
- AWS CLI v2 create-identity-provider command reference: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-identity-provider.html
- Amazon Cognito authorization endpoint reference: https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html
- AWS Amplify JavaScript Auth sign-in documentation: https://docs.amplify.aws/javascript/frontend/auth/sign-in/
- AWS Amplify social provider sign-in documentation: https://docs.amplify.aws/gen1/nextjs/build-a-backend/auth/add-social-provider/
- Meta Graph API versions page: https://developers.facebook.com/docs/graph-api/changelog/versions
- Meta permissions reference: https://developers.facebook.com/docs/permissions/
- Meta test users documentation: https://developers.facebook.com/docs/development/build-and-test/test-users/

## Issues Found
- The Terraform example used Facebook Graph API `v18.0`, which is stale for a post validated on 2026-06-03. Updated the Facebook provider `api_version` to `v25.0`, matching Meta's current Graph API version page.
- The Terraform example included Facebook endpoint fields such as `attributes_url`, `authorize_url`, `token_url`, and `token_request_method`. AWS documents these as generated provider details in describe responses; the create/update request for Facebook only needs `client_id`, `client_secret`, `authorize_scopes`, and `api_version`. Removed the endpoint fields from the Terraform create example.
- The Facebook scopes were formatted as `public_profile,email`. AWS Cognito documentation shows Facebook scopes separated with a comma and space. Updated examples to `public_profile, email`.
- The attribute mappings mapped Facebook `id` to Cognito `username`. Amazon Cognito derives federated usernames from provider-specific identifiers automatically and recommends mapping exact external identifiers to another attribute such as `preferred_username` or a custom attribute. Updated the examples to use `preferred_username = "id"` and kept the custom Facebook ID example.
- The `public_profile` description listed age range, gender, and locale. Meta's current permissions reference describes the basic profile data more narrowly. Updated it to ID, name, first name, last name, and profile picture, and removed unsupported `gender` and `locale` mappings from the basic attribute mapping example.

## Review Notes
The manual OAuth example assumes a public Cognito app client without a client secret. If a client secret is enabled, the token exchange must authenticate the client according to Cognito token endpoint requirements.
