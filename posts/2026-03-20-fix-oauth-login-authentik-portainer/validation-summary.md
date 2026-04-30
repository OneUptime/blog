# Validation Summary: How to Fix OAuth Login Issues with Authentik in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Authentik
- OAuth 2.0
- OpenID Connect (OIDC)
- Docker CLI
- `curl`

## Sources Consulted
- Portainer documentation, "Authenticate via OAuth": https://docs.portainer.io/sts/admin/settings/authentication/oauth
- Authentik documentation, "OAuth 2.0 provider": https://docs.goauthentik.io/add-secure-apps/providers/oauth2/
- Authentik documentation, "Integrate with Portainer": https://docs.goauthentik.io/integrations/services/portainer/
- Authentik documentation, "Manage applications": https://docs.goauthentik.io/add-secure-apps/applications/manage_apps/
- Authentik documentation, "authentik bindings": https://docs.goauthentik.io/add-secure-apps/bindings-overview/
- OpenID Connect Core 1.0: https://openid.net/specs/openid-connect-core-1_0.html

## Issues Found
- The Portainer configuration example used `https://authentik.example.com/application/o/portainer/authorize/` as the authorization endpoint. Authentik's documented authorization endpoint is the global `/application/o/authorize/` path, so I corrected both the configuration snippet and the manual `curl` test.
- The claim-mapping section implied the problem was mainly which Portainer user identifier to choose. In Authentik, claims such as `email` and `preferred_username` depend on the selected scope mappings, so I updated the guidance to point readers to the correct `email` and `profile` scope mappings and to clarify that the chosen identifier must actually exist in the userinfo response.
- The Authentik access-control navigation used `Policy Bindings`, which does not match the current application UI wording. I corrected it to `Policy/Group/User Bindings` and clarified that when nothing is bound, Authentik allows access by default.

## Review Notes
- Authentik's dedicated Portainer integration page is older and notes that it was based on authentik 2021.7.3 and Portainer 2.6.x-CE, but the endpoint layout and redirect URL behavior it shows still match the current generic Authentik OAuth provider and Portainer OAuth configuration documentation.
