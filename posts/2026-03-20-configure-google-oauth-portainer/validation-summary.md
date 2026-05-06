# Validation Summary: How to Configure Google OAuth with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition authentication
- Google OAuth 2.0 and OpenID Connect
- Google Auth Platform in Google Cloud Console
- Portainer HTTP API (`/api/auth` and `/api/settings`)
- `curl`

## Sources Consulted
- Portainer documentation: Authenticate via OAuth - https://docs.portainer.io/sts/admin/settings/authentication/oauth
- Portainer API documentation (BE 2.39.1) - https://api-docs.portainer.io/?edition=ee&version=2.39.1
- Google OpenID Connect documentation - https://developers.google.com/identity/openid-connect/openid-connect
- Google OpenID Connect discovery document - https://accounts.google.com/.well-known/openid-configuration
- Google Auth Platform Console Help: Manage OAuth Clients - https://support.google.com/cloud/answer/15549257
- Google Auth Platform Console Help: Manage App Audience - https://support.google.com/cloud/answer/15549945
- Portainer source: OAuth provider presets - https://github.com/portainer/portainer/blob/develop/app/portainer/oauth/components/oauth-settings/providers.js
- Portainer source: settings update handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go

## Issues Found
- The Google Cloud setup path in the post was outdated. It referenced the older `APIs & Services > OAuth consent screen` and `Credentials` flow, so I updated it to the current Google Auth Platform `Overview`, `Audience`, `Branding`, and `Clients` flow.
- The post told readers to copy the client secret without noting Google's current behavior. I updated the step to say the secret must be copied immediately because Google only shows the full value at creation time.
- The API example and endpoint table used the older `https://www.googleapis.com/oauth2/v3/userinfo` resource endpoint. I updated both to the current discovery-document `userinfo_endpoint`, `https://openidconnect.googleapis.com/v1/userinfo`.
- The Google Workspace restriction section implied that adding `hd` or checking userinfo was sufficient to enforce domain access. I corrected this to match Google's documentation: `hd` is only an account-chooser hint, and real enforcement requires validating the returned ID token's `hd` claim.
- The Workspace restriction section also implied Portainer had a direct domain restriction control in this generic OAuth flow. I changed that to note that Portainer does not expose a dedicated domain allowlist here, so enforcement should be handled in Google Workspace or by disabling automatic provisioning and managing users in Portainer.
- The Portainer UI section said Google endpoints "may" be pre-filled and described the redirect URL loosely. I updated it to reflect current Portainer behavior and to require the same redirect URI configured in Google.

## Review Notes
- Portainer's current Google preset in the official source still uses older Google endpoint aliases and `email` as the user identifier. Google documents `sub` as the stable unique identifier, but the validated post keeps `email` to match current Portainer behavior and uses Google's current OpenID Connect endpoints in the manual API example.
- No product version was specified in the post. This review was checked against current Google Auth Platform documentation and current Portainer documentation and source behavior as of 2026-05-06.
