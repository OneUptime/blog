# Validation Summary: How to Use Apigee OAuth 2.0 Policies to Secure API Endpoints

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Apigee
- Google Cloud
- OAuth 2.0
- Apigee OAuthV2 policies
- XML proxy and policy configuration
- curl

## Sources Consulted
- Google Cloud Apigee OAuthV2 policy reference: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/oauthv2-policy
- Google Cloud Apigee client credentials grant type guide: https://docs.cloud.google.com/apigee/docs/api-platform/security/oauth/oauth-20-client-credentials-grant-type
- Google Cloud Apigee Get OAuth 2.0 tokens guide: https://docs.cloud.google.com/apigee/docs/api-platform/security/oauth/access-tokens
- Google Cloud Apigee Verifying access tokens guide: https://docs.cloud.google.com/apigee/docs/api-platform/security/oauth/using-access-tokens
- Google Cloud Apigee Sending an access token guide: https://docs.cloud.google.com/apigee/docs/api-platform/security/oauth/sending-access-token
- Google Cloud Apigee Working with OAuth2 scopes guide: https://docs.cloud.google.com/apigee/docs/api-platform/security/oauth/working-scopes
- Google Cloud Apigee token revocation guide: https://docs.cloud.google.com/apigee/docs/api-platform/security/oauth/validating-and-invalidating-access-tokens
- Google Cloud Apigee fault handling guide: https://docs.cloud.google.com/apigee/docs/api-platform/fundamentals/fault-handling

## Issues Found
- Client Credentials was described and shown as returning a refresh token. Apigee documentation states that refresh tokens are not supported for the `client_credentials` grant type, so the generated response example was changed to include only the access token and the refresh policy text now clarifies that it applies to grant types such as Authorization Code.
- The Client Credentials policy comment implied that `<GenerateResponse>` generates a refresh token. It was corrected to say that it generates the token response.
- The token response showed RFC-style `token_type: Bearer`, but the policies did not opt into Apigee's RFC-compliant request/response behavior. Added `<RFCCompliantRequestResponse>true</RFCCompliantRequestResponse>` to token generation and refresh policies.
- The `VerifyAccessToken` policy explicitly set `<AccessToken>request.header.Authorization</AccessToken>`, which would make Apigee treat the full header value as the token unless an access token prefix is configured. Removed the explicit element so Apigee uses its documented default behavior of reading `Authorization: Bearer <token>` and stripping the bearer prefix.
- The `InvalidateToken` policy used `<Token>` directly under `<OAuthV2>`. Apigee documents this configuration as `<Tokens><Token ...>...</Token></Tokens>`, so the snippet was corrected.
- The Authorization Code flow wording implied that the OAuthV2 policy itself performs user authentication and consent. It was adjusted to say the flow is designed to work with user authentication and consent.
- The manual scope check used a substring regex that could match scopes such as `notadmin`. The condition was tightened to match `admin` as a complete whitespace-delimited scope.
- The OAuth fault rule now includes both the commonly documented `invalid_access_token` fault name and the current OAuthV2 error-reference `InvalidAccessToken` name, plus `access_token_expired`.

## Review Notes
Apigee's built-in `<Scope>` element on `VerifyAccessToken` is the preferred way to enforce required scopes when the requirement is static for a flow. The post's metadata-variable example is now technically safer, but a future improvement could show a dedicated scope-aware `VerifyAccessToken` policy for admin routes.
