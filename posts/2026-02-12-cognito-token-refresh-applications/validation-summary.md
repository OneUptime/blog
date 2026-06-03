# Validation Summary: How to Handle Cognito Token Refresh in Applications

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Cognito User Pools
- AWS SDK for JavaScript v3
- AWS CLI
- JavaScript
- Axios
- React
- Express
- JWT

## Sources Consulted
- Amazon Cognito Developer Guide: Refresh tokens: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-refresh-token.html
- Amazon Cognito API Reference: GetTokensFromRefreshToken: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_GetTokensFromRefreshToken.html
- Amazon Cognito API Reference: TokenValidityUnitsType: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_TokenValidityUnitsType.html
- AWS CLI Command Reference: update-user-pool-client: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/update-user-pool-client.html
- Amazon Cognito Developer Guide: Ending user sessions with token revocation: https://docs.aws.amazon.com/cognito/latest/developerguide/token-revocation.html
- AWS SDK for JavaScript v3 API Reference: InitiateAuthCommand: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/cognito-identity-provider/command/InitiateAuthCommand/
- AWS SDK for JavaScript v3 API Reference: RevokeTokenCommand: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/cognito-idp-2016-04-18/RevokeToken

## Issues Found
- The post described `InitiateAuth` with `REFRESH_TOKEN_AUTH` as the general simplest refresh method. AWS documents that this flow is only available when refresh token rotation is inactive. Updated the text to scope the method to app clients without refresh token rotation.
- The post stated that refresh calls don't return a new refresh token without distinguishing rotation behavior. AWS documents that `GetTokensFromRefreshToken` and the OAuth token endpoint can return new refresh tokens when rotation is enabled. Updated the note to clarify the difference.
- The `TokenManager.setTokens()` example only accepted Cognito's initial `AuthenticationResult` field names (`IdToken`, `AccessToken`, `RefreshToken`, `ExpiresIn`). The React hook reads persisted lower-camel-case token fields from `localStorage`, which would have restored undefined tokens. Updated `setTokens()` to accept both shapes and preserve an existing `expiresAt`.
- The refresh token rotation command enabled token revocation but didn't enable refresh token rotation. Added the current `--refresh-token-rotation Feature=ENABLED,RetryGracePeriodSeconds=10` CLI option.
- The rotation section implied the existing `REFRESH_TOKEN_AUTH` code would work with rotation. AWS documents that rotation requires `GetTokensFromRefreshToken` or the OAuth token endpoint, so a short SDK v3 `GetTokensFromRefreshTokenCommand` example was added.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI validation was performed against the official AWS CLI command reference rather than local `--help` output.
- The example assumes a public app client without a client secret. For app clients with a secret, Cognito refresh and revoke calls require the appropriate secret value or secret hash depending on the API.
