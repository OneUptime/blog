# Validation Summary: How to Configure Google OAuth with Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Google OAuth 2.0
- OpenID Connect (OIDC)
- Google Cloud OAuth consent screen / app audience
- cURL

## Sources Consulted
- Portainer OAuth authentication docs: https://docs.portainer.io/sts/admin/settings/authentication/oauth
- Portainer API docs (`/settings`, auth payloads, OAuth settings schema): https://api-docs.portainer.io/?edition=ce&version=2.39.1
- Portainer official source code for OAuth settings and login URL generation: https://github.com/portainer/portainer
- Google OpenID Connect docs: https://developers.google.com/identity/openid-connect/openid-connect
- Google OAuth 2.0 for web server applications: https://developers.google.com/identity/protocols/oauth2/web-server
- Google OIDC discovery document: https://accounts.google.com/.well-known/openid-configuration
- Google Cloud help on app audience and internal/external apps: https://support.google.com/cloud/answer/15549945?hl=en
- Google Cloud help on OAuth consent screen / verification details: https://support.google.com/cloud/answer/13461325?hl=en
- Google Cloud OAuth FAQ on internal-only apps: https://support.google.com/cloud/answer/13463817?hl=en

## Issues Found
- The Portainer UI section implied that all OAuth endpoint fields are entered directly under the Google provider. In current Portainer, Google is a preset provider and those fields are only exposed after clicking **Override default configuration**. The post was updated to say that explicitly.
- The API example used `username` / `password` and `oauthsettings`, while Portainer’s documented request schema uses `Username` / `Password` and `OAuthSettings`. The example was updated to match the official API schema.
- The API example omitted `AuthStyle`, while Portainer’s Google preset uses `In Params`. The example was updated with `"AuthStyle": 1` to match Portainer’s documented/authenticated Google configuration style.
- The post recommended adding `hd=yourcompany.com` to the authorization URL and stated that this ensures only that domain can sign in. Google’s docs say `hd` is not sufficient access control on its own and must be validated via the returned `hd` claim. Portainer does not provide a setting to enforce that claim, and current Portainer builds the OAuth login URL by appending its own query string. The post was corrected to use Google Cloud’s **Internal** audience for Workspace-only access instead.
- The “specific users” guidance pointed readers to Google test users, which is not the right access-control mechanism for this Portainer setup. The post was updated to use Portainer’s enforced behavior instead: disable automatic user provisioning and pre-create only the allowed users whose usernames match the configured `User Identifier`.
- The conclusion repeated the incorrect `hd` claim. It was updated to reflect the technically correct restriction mechanism: an **Internal** app audience.

## Review Notes
- Portainer 2.39.1 still ships built-in Google provider defaults that point at older Google OAuth endpoints in the official source. The edited post keeps Google’s current OIDC endpoints, but now correctly tells readers to use **Override default configuration** if they want to replace Portainer’s built-in defaults.
- The redirect URI guidance in the post remains valid for Portainer’s current behavior: use the Portainer instance URL exactly as registered in Google Cloud Console, including any required port and trailing slash.
