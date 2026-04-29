# Validation Summary: How to Set Up Keycloak as an OAuth Provider for Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Keycloak
- OAuth 2.0
- OpenID Connect (OIDC)
- Portainer HTTP API
- `curl`
- `python3`

## Sources Consulted
- Portainer Docs: Authenticate via OAuth - https://docs.portainer.io/admin/settings/authentication/oauth
- Portainer Docs: API documentation - https://docs.portainer.io/api/docs
- Portainer Community Edition OpenAPI 2.39.1 - https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer Business Edition OpenAPI 2.39.1 - https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer source: `settings_public.go` - https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_public.go
- Portainer source: `oauth-settings.controller.js` - https://github.com/portainer/portainer/blob/develop/app/portainer/oauth/components/oauth-settings/oauth-settings.controller.js
- Portainer CE vs Portainer BE: What's the Difference? - https://www.portainer.io/blog/portainer-community-edition-ce-vs-portainer-business-edition-be-whats-the-difference
- Keycloak Getting Started: Docker - https://www.keycloak.org/getting-started/getting-started-docker
- Keycloak Server Administration Guide - https://www.keycloak.org/docs/latest/server_admin/
- Keycloak OIDC GroupMembershipMapper Javadocs - https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/protocol/oidc/mappers/GroupMembershipMapper.html
- Local `curl --help all` output for the flags used in the examples

## Issues Found
- The post's Keycloak groups section implied that adding the Keycloak mapper alone was sufficient for Portainer team auto-assignment. I corrected this to state that the Portainer-side **Automatic team membership** feature must also be enabled, the claim name should be set to `groups`, and this mapping flow is part of the Portainer Business Edition feature set.

## Review Notes
- The example assumes Portainer is exposed at `https://portainer.example.com/`. If Portainer is published on a non-default port or under a subpath, the Keycloak valid redirect URI, web origin, and Portainer `RedirectURI` must all use that exact external URL.
- The base OAuth/OIDC configuration is valid for current Portainer releases, but the automatic group-to-team mapping described near the end is a Business Edition capability rather than a generic behavior across all editions.
- Keycloak's dedicated client scope workflow is still current, and the `Group Membership` mapper remains the correct mapper for exposing group claims for OIDC clients.
