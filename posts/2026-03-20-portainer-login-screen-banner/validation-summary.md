# Validation Summary: How to Add a Login Screen Banner in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer HTTP API
- Bash
- `curl`
- `jq`

## Sources Consulted
- Portainer documentation: General settings, including the Login screen banner section: https://docs.portainer.io/admin/settings/general
- Portainer documentation: Accessing the Portainer API and access-token authentication: https://docs.portainer.io/2.21/api/access
- Portainer documentation: API usage examples, including `/api/auth` and Bearer JWT usage: https://docs.portainer.io/sts/api/examples
- Portainer Business Edition OpenAPI spec 2.39.1: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer Business Edition OpenAPI spec 2.40.0: https://api-docs.portainer.io/versions/ee/2.40.0.yaml

## Issues Found
- The UI path was incorrect. The post said `Settings -> Appearance`, but current Portainer documentation places the feature under `Settings -> General` in the `Login screen banner` section. Updated the navigation steps and control names to match the official docs.
- The post claimed the banner supports basic text formatting. Portainer documents this field as plain text. Updated the explanation to say the message is plain text.
- The API examples used undocumented or incorrect JSON field names. The official schema uses `CustomLoginBanner`, not `customLoginBanner`, and `ShowKomposeBuildOption` is not part of the documented settings update payload. Updated all API snippets to use the documented field.
- The API examples used a generic token variable with an `Authorization: Bearer` header. For the non-automation examples, updated the snippets to use an access token with the documented `X-API-Key` header. The automation example already uses `/api/auth`, so it was updated to make the JWT usage explicit and keep `Authorization: Bearer`.
- The maintenance example said March 22, 2026 was a Saturday. It is a Sunday. Updated the sample banner text accordingly.
- The `jq` example queried `.customLoginBanner`, but the documented response field is `.CustomLoginBanner`. Updated the command.

## Review Notes
- Verified against current Portainer documentation and the published BE OpenAPI schemas for 2.39.1 and 2.40.0. The login banner feature remains Business Edition only.
- The automation script uses GNU `date -d`, which is standard on Linux systems but not portable to BSD/macOS without syntax changes.
