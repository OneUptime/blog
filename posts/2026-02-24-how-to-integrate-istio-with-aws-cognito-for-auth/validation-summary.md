# Validation Summary: How to Integrate Istio with AWS Cognito for Auth

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Istio ServiceEntry
- Amazon Cognito user pools
- Amazon Cognito app clients and OAuth 2.0 flows
- Amazon Cognito resource servers and custom scopes
- Amazon Cognito Pre Token Generation Lambda triggers
- JSON Web Tokens
- AWS CLI

## Sources Consulted
- AWS CLI `create-user-pool-client` command reference: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-user-pool-client.html
- AWS CLI `create-resource-server` command reference: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-resource-server.html
- AWS CLI `add-custom-attributes` command reference: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/add-custom-attributes.html
- AWS CLI `initiate-auth` command reference: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/initiate-auth.html
- Amazon Cognito access token documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html
- Amazon Cognito JWT verification documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
- Amazon Cognito user pool token documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html
- Amazon Cognito Pre Token Generation Lambda trigger documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/

## Issues Found
- The original Cognito app-client command configured `code` and `client_credentials` on the same app client. AWS documents that `client_credentials` must be the only allowed OAuth flow for an app client that uses that grant. I changed the tutorial to create a user sign-in client with `code` and a separate machine-to-machine client with `client_credentials`.
- The original user sign-in client generated a client secret, but the `initiate-auth` example did not include the required `SECRET_HASH` parameter for secret-bearing clients. I changed the user sign-in client to omit `--generate-secret`, which matches the later password-grant example.
- The machine-to-machine token example requested custom resource-server scopes, but the original app-client command did not allow those scopes. I added the custom scopes to the separate machine-to-machine app client.
- The post suggested using ID tokens to validate audience for API access-token checks. Cognito access tokens use `client_id` rather than `aud`, so I changed the guidance to match `client_id` in authorization policy conditions when checking the app client for access tokens.
- The ServiceEntry snippet used `networking.istio.io/v1beta1`. Istio's current reference uses `networking.istio.io/v1`, so I updated the API version.
- The Pre Token Generation Lambda example used the legacy `claimsOverrideDetails` response shape while claiming to add claims to access tokens. I updated it to use `claimsAndScopeOverrideDetails.accessTokenGeneration` and noted that a version 2.0 or later event is required for access-token customization.
- The JWT inspection commands used plain `base64 -d`, which is not reliable for JWT base64url payloads and missing padding. I replaced them with Python snippets that use URL-safe base64 decoding and padding.

## Review Notes
- The Istio RequestAuthentication and AuthorizationPolicy examples are syntactically consistent with current Istio security APIs.
- Cognito access tokens expire after one hour by default and can be configured in the documented range of 5 minutes to 24 hours.
- The group-claim guidance is accurate: Cognito includes `cognito:groups` in access and ID tokens when the user has group membership.
