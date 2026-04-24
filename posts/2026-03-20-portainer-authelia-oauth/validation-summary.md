# Validation Summary: How to Set Up Authelia as an OAuth Provider for Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Authelia
- Portainer
- OAuth 2.0
- OpenID Connect (OIDC)
- YAML configuration
- Docker CLI
- cURL

## Sources Consulted
- Authelia OpenID Connect provider configuration: https://www.authelia.com/configuration/identity-providers/openid-connect/provider/
- Authelia OpenID Connect client configuration: https://www.authelia.com/configuration/identity-providers/openid-connect/clients/
- Authelia Portainer integration guide: https://www.authelia.com/integration/openid-connect/clients/portainer/
- Authelia access control configuration: https://www.authelia.com/configuration/security/access-control/
- Authelia CLI reference for PBKDF2 hash generation: https://www.authelia.com/reference/cli/authelia/authelia_crypto_hash_generate_pbkdf2/
- Authelia CLI reference for RSA keypair generation: https://www.authelia.com/reference/cli/authelia/authelia_crypto_pair_rsa_generate/
- Portainer OAuth authentication documentation: https://docs.portainer.io/sts/admin/settings/authentication/oauth
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer source: OAuth settings model: https://github.com/portainer/portainer/blob/develop/app/react/portainer/settings/types.ts
- Portainer source: settings update handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer source: OAuth flow implementation: https://github.com/portainer/portainer/blob/develop/api/oauth/oauth.go

## Issues Found
- The Authelia OIDC provider example used outdated configuration keys. I replaced `issuer_private_key` with the current required `jwks` block, and changed client fields from `id`, `description`, and `secret` to `client_id`, `client_name`, and `client_secret` to match current Authelia configuration.
- The Authelia client example configured `access_token_signed_response_alg` and `userinfo_signed_response_alg` as `RS256`. I changed both to `none` to match Authelia's Portainer integration guidance and Portainer's expectation of a normal JSON userinfo response.
- The client authentication method was set to `client_secret_basic`, but the documented working Portainer setup for Authelia uses `client_secret_post`. I updated the Authelia config accordingly and added `Auth Style: In Params` in the Portainer UI configuration.
- The Portainer API example omitted the auth-style setting and used a non-canonical `oauthsettings` object name. I updated it to `OAuthSettings` and added `"AuthStyle": 1`, which maps to Portainer's `In Params` auth style.
- The `access_control` section was technically misleading for this setup and the YAML shape for `subject` was incorrect. Authelia's `access_control` rules do not apply to OpenID Connect 1.0 clients, so I replaced that snippet with a note pointing readers to the OIDC client's `authorization_policy`.

## Review Notes
- Authelia's Portainer integration page is explicitly marked community-supported and version-specific, with tested versions older than current Portainer docs. I cross-checked the relevant settings against current Portainer documentation and current Portainer source, and the corrected fields still match the present implementation.
- The redirect URI must match exactly between the Portainer configuration and the Authelia client registration.
