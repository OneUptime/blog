# Validation Summary: How to Hide Internal Authentication When Using OAuth in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- OAuth 2.0
- SSO
- Portainer HTTP API
- `curl`

## Sources Consulted
- Portainer docs: OAuth authentication setup: https://docs.portainer.io/admin/settings/authentication/oauth.md
- Portainer docs: Internal vs external authentication behavior: https://docs.portainer.io/faqs/installing/can-i-use-internal-authentication-and-external-authentication-at-the-same-time.md
- Portainer docs: Break-glass internal authentication URL: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/how-can-i-switch-back-to-internal-authentication.md
- Portainer docs: Authentication overview: https://docs.portainer.io/admin/settings/authentication.md
- Portainer docs: API docs landing page: https://docs.portainer.io/api/docs.md
- Portainer docs: API usage examples: https://docs.portainer.io/api/examples.md
- Portainer CE OpenAPI spec 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer CE 2.39.1 source: auth handler: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/auth/authenticate.go
- Portainer CE 2.39.1 source: settings update handler: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/settings/settings_update.go
- Portainer CE 2.39.1 source: OAuth settings struct: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/portainer.go

## Issues Found
- The post used `?skipSSO=true` as the emergency internal-login path. This is not the documented Portainer break-glass URL. It was corrected to `https://portainer.example.com/#!/internal-auth`.
- The post implied hidden internal authentication remained available to an internal admin account in general. Portainer documents that only the initial admin user can log in with internal auth when external authentication is enabled. The wording was corrected throughout.
- The post claimed the setting could be enabled via a documented API payload using `HideInternalAuth`, and used `oauthsettings` in the example. Portainer's public API documentation documents `PUT /api/settings` and `OAuthSettings`, but does not document a `HideInternalAuth` field. The unsupported API example was replaced with an accurate note.
- The post recommended creating a backup internal admin account and included an API example for doing so. That advice conflicts with Portainer's documented behavior because non-initial internal users cannot use internal authentication when OAuth is enabled. The example was replaced with a test of the initial admin emergency login instead.
- The SSO section overstated the behavior by saying users are redirected immediately to the IdP and the Portainer login page is never shown. Portainer documents `Use SSO` as reusing the existing IdP session so the provider does not force credentials again. That section was corrected to reflect the documented behavior.
- The reversion section used an undocumented API payload to disable `HideInternalAuth`. It was replaced with the documented UI recovery flow using `#!/internal-auth` and the initial admin account.

## Review Notes
Portainer's public documentation does not currently document an API field for toggling **Hide internal authentication prompt**. The post was therefore corrected to describe UI-based configuration and recovery only. Validated against Portainer documentation and the CE 2.39.1 public API/source state available on 2026-04-24.
