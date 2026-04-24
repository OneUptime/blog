# Validation Summary: How to Change the Theme (Light/Dark/High-Contrast) in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- `curl`
- `jq`
- Browser `prefers-color-scheme` media query

## Sources Consulted
- Portainer account settings documentation: https://docs.portainer.io/user/account-settings
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer source for theme option labels: https://github.com/portainer/portainer/blob/develop/app/react/portainer/account/AccountView/theme-options.tsx
- Portainer source for theme persistence and system-theme handling: https://github.com/portainer/portainer/blob/develop/app/portainer/services/authentication.js
- Portainer source for system-theme detection: https://github.com/portainer/portainer/blob/develop/app/portainer/services/themeManager.js
- Portainer source for the user theme update client call: https://github.com/portainer/portainer/blob/develop/app/portainer/services/api/userService.js
- Portainer source for the `/users/{id}` update payload and handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_update.go

## Issues Found
- The post said Portainer supported three themes and described Light as the default. Current Portainer exposes four options, including System Theme (`auto`), and users without a saved preference fall back to system-theme behavior. I corrected the opening description, the theme picker steps, and the theme options table.
- The navigation steps referred to an **Appearance** section, but Portainer's current account page uses **My account** and a **User theme** section. I updated the labels to match the current UI.
- The section titled "Setting a Default Theme for New Users (Admin)" was incorrect. Portainer's user creation API does not expose a theme field, and the demonstrated endpoint updates one existing user rather than setting a default for future users. I renamed the section and corrected the explanation.
- The API example used the wrong request body: `ThemeSettings` is part of the user object, but the update payload for `PUT /api/users/{id}` uses `Theme` with a nested `color` field. I fixed the JSON payload and kept the allowed `color` values aligned with the official API spec.
- The example used legacy-style HTTP on port `9000` without noting that current Portainer API docs center on HTTPS `9443`. I updated the sample to use `https://localhost:9443` and `curl -k`, which is a more realistic default for a local Portainer instance using its self-signed certificate.
- The High Contrast section made unsupported claims about WCAG AA compliance, font-weight behavior, and avoiding red/green reliance. I replaced those with narrower claims supported by Portainer's docs and source: stronger contrast and easier distinction between interface elements.
- The persistence section needed a nuance once System Theme was included: the saved setting is server-side and persists across devices, but the rendered light/dark result still depends on each device's OS preference when System Theme is selected. I clarified that wording.

## Review Notes
- The updated post is technically accurate against Portainer's current docs and official source as of 2026-04-24.
- Portainer supports both JWT bearer authentication and personal access tokens for API access. This post uses the JWT flow from `/api/auth`, which matches Portainer's API usage examples.
- If a Portainer instance is configured to use legacy HTTP on port `9000`, the API example URL would need to be adjusted accordingly.
