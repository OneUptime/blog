# Validation Summary: How to Generate a Support Bundle in Portainer Business Edition

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer HTTP API
- Bash
- `curl`
- Docker CLI
- `tar`

## Sources Consulted
- Portainer admin settings documentation: https://docs.portainer.io/admin/settings/general
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer Business Edition OpenAPI spec 2.39.1: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer Business Edition OpenAPI spec 2.41.0 support paths: https://api-docs.portainer.io/versions/ee/2.41.0/support.yaml
- Portainer support page: https://www.portainer.io/get-support-for-portainer
- Portainer support FAQ for Business Edition customers: https://docs.portainer.io/faqs/getting-support/how-to-get-support-for-business-edition-customers-with-a-subscription

## Issues Found
- The UI path was too vague and the download format was partly wrong. I updated `Settings -> Support/Diagnostics` and `.zip or .tar.gz` to the documented `Settings -> Portainer support` flow with a `.tar.gz` download.
- The Help menu method was not documented in current Portainer documentation. I removed that unsupported claim.
- The API example used an incorrect endpoint and method. I replaced `GET /api/system/supportbundle` with the documented `POST /api/support/download`.
- The API example now uses a Portainer API access token in the `X-API-Key` header, which matches Portainer's current API access guidance.
- The manual collection script queried `/api/status`, which is deprecated in the published API spec. I updated it to `/api/system/status`.
- The support URL `support.portainer.io` did not match Portainer's current support entrypoint. I updated it to Portainer's published Get Support page.
- The "What's in a Support Bundle" section listed specific contents that are not explicitly enumerated in the current official docs. I rewrote that section to match the documented description and sensitive-data handling.

## Review Notes
- Verified against Portainer's published documentation and API specs available on 2026-04-30.
- The support bundle feature is documented as a Portainer Business Edition feature.
- The manual log collection example assumes a Docker-based Portainer deployment and a container named `portainer`; users with custom container names or other deployment patterns would need to adjust the commands.
