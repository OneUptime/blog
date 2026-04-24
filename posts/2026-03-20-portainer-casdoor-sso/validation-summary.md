# Validation Summary: How to Configure Casdoor SSO with Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Portainer
- Casdoor
- OpenID Connect (OIDC)
- OAuth 2.0
- Docker
- LDAP / Active Directory
- cURL

## Sources Consulted
- Portainer OAuth authentication docs: https://docs.portainer.io/sts/admin/settings/authentication/oauth
- Portainer API docs: https://docs.portainer.io/api/docs
- Portainer settings update handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer OAuth settings model: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer authentication handler (`/api/auth` response shape): https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Casdoor application configuration docs: https://casdoor.ai/docs/application/config/
- Casdoor public API docs: https://casdoor.ai/docs/basic/public-api/
- Casdoor upstream README (official Docker quick-start): https://github.com/casdoor/casdoor/blob/master/README.md
- Casdoor OIDC discovery source: https://github.com/casdoor/casdoor/blob/master/object/wellknown_oidc_discovery.go
- Casdoor userinfo and user model source: https://github.com/casdoor/casdoor/blob/master/object/user.go
- Casdoor account controller (`/api/userinfo`): https://github.com/casdoor/casdoor/blob/master/controllers/account.go
- Casdoor user controller (`/api/add-user`): https://github.com/casdoor/casdoor/blob/master/controllers/user.go
- Casdoor application UI source (providers and sign-in methods): https://github.com/casdoor/casdoor/blob/master/web/src/ApplicationEditPage.js
- Casdoor organization UI source (LDAP settings): https://github.com/casdoor/casdoor/blob/master/web/src/OrganizationEditPage.js

## Issues Found
- The original Casdoor Docker Compose example did not match the official quick-start path and used an incorrect config mount pattern for a simple getting-started deployment. I replaced it with Casdoor's official `casbin/casdoor-all-in-one` Docker quick-start command and corrected the initial login credentials to `built-in/admin` / `123`.
- The post configured the Casdoor application and example users inside the `built-in` organization. In current Casdoor, adding normal users to `built-in` is blocked by default unless privilege consent is enabled, and `built-in` is reserved for Casdoor administration. I changed the examples to use a regular organization (`your-org`) and removed the misleading user-creation API example.
- The Portainer API payload used `oauthsettings`, but Portainer's settings update API expects `OAuthSettings`. I corrected the JSON key so the example matches the current API model.
- The post said Casdoor uses `name` as the username identifier in the userinfo response. Current Casdoor returns the username as `preferred_username` and uses `name` for display name when the `profile` scope is present. I updated `UserIdentifier` to `preferred_username` and corrected the note.
- The LDAP section pointed readers to Casdoor providers, but current Casdoor exposes LDAP configuration under organization LDAP settings and application sign-in methods. I updated the steps to match the current Casdoor UI model.

## Review Notes
- The guide is now technically consistent with current Portainer and Casdoor behavior, but the `RedirectURI` still must match the exact Portainer base URL in the reader's deployment, including any port or subpath.
- Casdoor's discovery document is authoritative for the authorization, token, and userinfo endpoints. This matters if a deployment uses separate frontend and backend origins.
- Portainer's custom OAuth configuration also supports optional fields such as `LogoutURI` and `AuthStyle`, but they are not required for the basic Casdoor integration shown here.
