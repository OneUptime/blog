# Validation Summary: How to Set a Custom Logo in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- Portainer CLI
- Docker
- Nginx
- cURL

## Sources Consulted
- Portainer Docs, General settings: https://docs.portainer.io/admin/settings/general
- Portainer Docs, CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer Docs, Accessing the Portainer API: https://docs.portainer.io/api/access
- Portainer source, settings update handler (`LogoURL`, `PUT /settings`, `ApiKeyAuth`/`jwt`): https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer source, login view (`ng-src="{{ ctrl.logo }}"`): https://github.com/portainer/portainer/blob/develop/app/portainer/views/auth/auth.html
- Portainer source, sidebar header (`<img src={logo}>`): https://github.com/portainer/portainer/blob/develop/app/react/sidebar/Header.tsx

## Issues Found
- The post incorrectly stated that custom logo support in the UI was Business Edition-only and that CE users needed a fork or browser extension. I corrected the overview, method title, and conclusion to match current Portainer docs, which document custom logo configuration in Settings and the `--logo` CLI flag.
- The UI navigation text referenced `Settings → Appearance` and a `Custom branding` section. I updated this to `Settings` and `Application settings` with the `Use custom logo` toggle, matching current Portainer documentation.
- The prerequisites listed an unsupported `800x150px` recommendation. I corrected the sizing guidance to `155x55px` recommended, which matches Portainer’s documented custom logo guidance.
- The API example used `Authorization: Bearer` with an `admin token`. I changed this to `X-API-Key` with an access token, which is the documented header for Portainer API access tokens, while keeping the `LogoURL` payload.
- The accessibility check expected `HTTP/2 200`, which was too specific. I changed it to `HTTP 200 OK`.
- The troubleshooting section incorrectly said the logo must allow cross-origin access and suggested checking CORS headers. Portainer renders the logo as an image in the UI, so I replaced that advice with browser accessibility and HTTPS mixed-content checks.

## Review Notes
- The Nginx examples are technically workable for hosting a logo URL, but they assume the surrounding Portainer reverse-proxy configuration already exists and is valid.
- Portainer also documents the `--logo` startup flag for setting the logo directly at startup; the post now references that path in the overview and conclusion, but it still primarily focuses on URL-hosting approaches.
