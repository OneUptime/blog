# Validation Summary: How to Configure GitHub OAuth with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- GitHub OAuth Apps
- GitHub Enterprise Server
- Portainer HTTP API
- `curl`

## Sources Consulted
- Portainer OAuth authentication docs: https://docs.portainer.io/sts/admin/settings/authentication/oauth
- Portainer authentication overview: https://docs.portainer.io/admin/settings/authentication
- Portainer API docs index: https://docs.portainer.io/api/docs
- Portainer source for `OAuthSettings` and authentication method constants: https://github.com/portainer/portainer/blob/2.39.1/api/portainer.go
- Portainer source for `PUT /api/settings` payload and update behavior: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/settings/settings_update.go
- Portainer source for `POST /api/auth` request and `jwt` response: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/auth/authenticate.go
- GitHub docs for creating OAuth apps: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app
- GitHub docs for OAuth authorization flow and redirect URL rules: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- GitHub docs for OAuth scopes: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps
- GitHub REST API docs for the authenticated user endpoint: https://docs.github.com/en/rest/users/users
- GitHub REST API docs for authenticated user email addresses: https://docs.github.com/en/rest/users/emails
- GitHub Enterprise Server REST API docs for the authenticated user endpoint: https://docs.github.com/en/enterprise-server%403.16/rest/users/users

## Issues Found
- The GitHub app creation steps implied using account or organization settings directly. GitHub's documented OAuth app creation flow starts from **Settings > Developer settings > OAuth apps**. I corrected the navigation text to match the official flow.
- The organization-restriction section referred to “GitHub's OAuth organization scopes,” which is not a real GitHub feature. GitHub scopes such as `read:org` grant read access to organization membership data but do not by themselves restrict Portainer logins to org members. I replaced that guidance with the accurate approach: request `read:org`, disable `OAuthAutoCreateUsers`, and manually create only users whose membership you have verified.
- The same section said to “approve” users after disabling auto-create. Portainer's OAuth documentation states that when automatic user provisioning is off, users must be created manually in Portainer. I changed the wording accordingly.

## Review Notes
- The Portainer API examples are valid against the current Portainer 2.39.1 request schema: `AuthenticationMethod: 3` selects OAuth, `POST /api/auth` accepts `username` and `password` and returns `jwt`, and the `OAuthSettings` field names used in the post match the upstream struct.
- The GitHub and GitHub Enterprise Server endpoint values used in the post are correct for OAuth authorization, token exchange, and fetching the authenticated user record.
- The examples assume the public Portainer URL is `https://portainer.example.com/`. If the public URL includes a non-default port such as `:9443`, that exact public URL should be used consistently for both GitHub's callback URL and Portainer's `RedirectURI`.
