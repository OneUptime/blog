# Validation Summary: How to Set Up Authentik as an OAuth Provider for Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Authentik
- Portainer
- OAuth 2.0
- OpenID Connect (OIDC)
- cURL

## Sources Consulted
- Authentik OAuth2/OpenID Provider documentation: https://docs.goauthentik.io/add-secure-apps/providers/oauth2/
- Authentik create OAuth2 provider documentation: https://docs.goauthentik.io/add-secure-apps/providers/oauth2/create-oauth2-provider/
- Authentik application management and bindings documentation: https://docs.goauthentik.io/add-secure-apps/applications/manage_apps/
- Portainer OAuth authentication settings documentation: https://docs.portainer.io/sts/admin/settings/authentication/oauth
- Portainer OAuth settings struct in the official source: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer settings update handler in the official source: https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer OAuth flow implementation in the official source: https://github.com/portainer/portainer/blob/develop/api/oauth/oauth.go
- Portainer OAuth settings UI text in the official source: https://github.com/portainer/portainer/blob/develop/app/portainer/oauth/components/oauth-settings/oauth-settings.html

## Issues Found
- The post used slug-specific Authentik URLs for the authorization, token, and userinfo endpoints in the Portainer configuration example and endpoint table. I corrected them to the global Authentik OIDC endpoints under `/application/o/authorize/`, `/application/o/token/`, and `/application/o/userinfo/`, which is what Authentik documents and exposes through discovery.
- The group-restriction section described an older group-membership-policy workflow. I updated it to use current Authentik application bindings under `Policy/Group/User Bindings`, which is the documented way to grant application access to a group such as `portainer-users`.

## Review Notes
The post’s provider-first setup flow is still technically valid, but current Authentik documentation recommends creating the application and provider together from **Applications > Applications**.
