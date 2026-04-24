# Validation Summary: How to Set Up Keycloak as an OAuth Provider for Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Keycloak
- Portainer
- OpenID Connect (OIDC)
- OAuth 2.0
- Bash / `curl`

## Sources Consulted
- Portainer OAuth authentication documentation: https://docs.portainer.io/admin/settings/authentication/oauth
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer Business Edition 2.39.1 OpenAPI schema: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Keycloak Server Administration Guide: https://www.keycloak.org/docs/latest/server_admin/index.html
- Keycloak Authorization Services Guide: https://www.keycloak.org/docs/latest/authorization_services/index.html

## Issues Found
- The description said the post covered role mapping, but the guide actually configures OIDC group claims and Portainer team mapping. I corrected the metadata to say claim mapping.
- The Portainer API example used `oauthsettings`, but the published Portainer settings schema uses `OAuthSettings`. I corrected the field name and added the documented Business Edition team-membership fields needed for automatic team assignment from the `groups` claim.
- The Keycloak logout URL used `redirect_uri`, which does not match Keycloak's current RP-initiated logout guidance. I updated it to `post_logout_redirect_uri` and added `client_id`, which Keycloak requires when `post_logout_redirect_uri` is supplied without `id_token_hint`.
- The section on restricting access incorrectly suggested using Keycloak Authorization Services on the Portainer client. I replaced it with the technically correct Portainer-side restriction method: disable automatic user provisioning and pre-create only the allowed users in Portainer.

## Review Notes
- Automatic team membership from OAuth claims is a Portainer Business Edition feature. Basic OIDC login does not require Business Edition, but the team-mapping part of this guide does.
- The Keycloak 21+ prerequisite remains compatible with the current Keycloak documentation reviewed on 2026-04-24.
