# Validation Summary: How to Set Up Authelia as an OAuth Provider for Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Authelia
- Portainer
- OpenID Connect (OIDC)
- OAuth 2.0
- YAML configuration
- Bash and `curl`

## Sources Consulted
- Authelia Portainer integration guide: https://www.authelia.com/integration/openid-connect/clients/portainer/
- Authelia OpenID Connect provider configuration: https://www.authelia.com/configuration/identity-providers/openid-connect/provider/
- Authelia OpenID Connect client configuration: https://www.authelia.com/configuration/identity-providers/openid-connect/clients/
- Authelia PBKDF2 CLI reference: https://www.authelia.com/reference/cli/authelia/authelia_crypto_hash_generate_pbkdf2/
- Authelia access control configuration: https://www.authelia.com/configuration/security/access-control/
- Portainer OAuth authentication documentation: https://docs.portainer.io/sts/admin/settings/authentication/oauth
- Portainer API documentation index: https://api-docs.portainer.io/?edition=ee&version=2.39.2
- Portainer API `settings` schema: https://api-docs.portainer.io/versions/ee/2.39.2/settings.yaml
- Portainer API `auth` schema: https://api-docs.portainer.io/versions/ee/2.39.2/auth.yaml

## Issues Found
- The Authelia configuration snippet used outdated OIDC provider and client fields (`issuer_private_key`, `id`, `description`, `secret`, and `userinfo_signing_algorithm`). I updated it to the current Authelia schema using `jwks`, `client_id`, `client_name`, `client_secret`, `response_types`, `grant_types`, `access_token_signed_response_alg`, and `userinfo_signed_response_alg`.
- The client secret hash comment incorrectly described the value as a bcrypt hash even though the example and command use PBKDF2. I corrected the comment to PBKDF2.
- The prerequisite incorrectly limited the setup to Portainer Business Edition. Official documentation shows the OAuth flow is available for Portainer CE and EE/BE, so I changed the prerequisite accordingly.
- The Portainer API payload omitted the OAuth auth-style setting needed to match Authelia's `client_secret_post` configuration. I added `AuthStyle: 1`, which maps to Portainer's documented `In Params` mode.
- The redirect URI values used trailing slashes, while the official Authelia Portainer integration guide uses `https://portainer.example.com` and OIDC redirect URIs must match exactly. I aligned both the Authelia `redirect_uris` entry and the Portainer `RedirectURI` value to the documented form.
- The access control section implied that Authelia `access_control` rules are part of the OIDC setup. Authelia's official access-control documentation explicitly notes that section does not apply to OIDC itself, so I clarified that the rule example is only relevant when Portainer is also protected behind Authelia's access-control integration.

## Review Notes
- Authelia's Portainer integration page is marked as community supported and tested against Authelia `v4.38.0` and Portainer `v2.21.4`, but the corrected settings still align with Portainer's current STS OAuth documentation and Portainer's published API schema as of 2026-05-07.
- The post keeps `preferred_username` as the Portainer user identifier because that is what Authelia's official Portainer integration guide documents, even though OpenID Connect stable identity semantics are stronger with `iss` + `sub`.
