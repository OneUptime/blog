# Validation Summary: How to Set Up Authentik as an OAuth Provider for Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Authentik
- Portainer
- OAuth 2.0
- OpenID Connect (OIDC)
- REST APIs
- `curl`

## Sources Consulted
- Authentik OAuth 2.0 provider documentation: https://docs.goauthentik.io/add-secure-apps/providers/oauth2/
- Authentik create provider documentation: https://docs.goauthentik.io/add-secure-apps/providers/oauth2/create-oauth2-provider
- Authentik application access bindings documentation: https://docs.goauthentik.io/add-secure-apps/applications/manage_apps/
- Authentik API authentication reference: https://api.goauthentik.io/authentication/
- Authentik group creation API reference: https://docs.goauthentik.io/docs/developer-docs/api/reference/core-groups-create
- Authentik Portainer integration guide: https://docs.goauthentik.io/integrations/services/portainer/
- Portainer OAuth authentication documentation: https://docs.portainer.io/admin/settings/authentication/oauth
- Portainer API documentation entry point: https://docs.portainer.io/api/docs
- Portainer official source for `OAuthSettings`: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer official source for settings update validation: https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go

## Issues Found
- The post showed Authentik authorization, token, and userinfo endpoints as slug-specific paths under `/application/o/portainer/...`. Authentik documents and implements these as global endpoints under `/application/o/authorize/`, `/application/o/token/`, and `/application/o/userinfo/`. I corrected the endpoint examples in both the discovery section and the Portainer configuration payload.
- The Authentik provider configuration showed the redirect URI without the current matching mode detail. Current Authentik documentation uses a `Strict` redirect URI entry, so I corrected the provider example to reflect that.
- The Authentik provider field was labeled as `Include Claims in Token`, but the current provider setting is `Include claims in id_token`. I corrected the field label to match current Authentik terminology.
- The Portainer API example used an `oauthsettings` object name. Portainer’s documented and source-defined payload uses `OAuthSettings`, so I updated the example to the documented casing and schema.
- The Authentik access-control section described using a group membership policy flow. Current Authentik documentation supports binding a group directly to the application through the `Policy/Group/User Bindings` tab, so I updated the instructions to the current group-binding flow.
- The Authentik group API example used `Authorization: Token ...`, but Authentik’s API documentation specifies bearer authentication. I corrected the example to `Authorization: Bearer ...`.
- The final group example implied Authentik group attributes would map directly to Portainer teams. That is misleading. I replaced it with an access-group example and added a clarification that Portainer team mapping requires additional claim mapping in Authentik and Portainer Business Edition.

## Review Notes
- No remaining technical issues found after these corrections.
- The post configures Portainer through the API; the same values can also be entered through `Settings` -> `Authentication` in the Portainer UI.
- The post now correctly uses `email` as the Portainer user identifier, which Authentik’s official Portainer integration guide documents as a valid alternative to `preferred_username`.
- Portainer also supports a logout URL in its custom OAuth settings. The post remains technically valid without it, but adding it in the future would improve upstream logout behavior.
