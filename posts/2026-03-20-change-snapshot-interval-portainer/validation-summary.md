# Validation Summary: How to Change the Snapshot Interval in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Portainer HTTP API

## Sources Consulted
- Portainer documentation, General settings: https://docs.portainer.io/admin/settings/general
- Portainer documentation, CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer documentation, API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer documentation, Accessing the Portainer API: https://docs.portainer.io/api/access
- Portainer documentation, Edge Agent Async on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge-async
- Portainer source, settings update handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer source, CLI flag validation: https://github.com/portainer/portainer/blob/develop/api/cli/cli.go
- Portainer source, settings UI form: https://github.com/portainer/portainer/blob/develop/app/react/portainer/settings/SettingsView/ApplicationSettingsPanel/ApplicationSettingsPanel.tsx
- Portainer source, snapshot service: https://github.com/portainer/portainer/blob/develop/api/internal/snapshot/snapshot.go
- Portainer source, Docker snapshot contents: https://github.com/portainer/portainer/blob/develop/pkg/snapshot/docker.go

## Issues Found
- The UI instructions said the snapshot interval is entered in raw seconds. Current Portainer uses a duration string in the settings UI, so this was corrected to examples like `5m`, `1m`, and `30s`.
- The CLI example used `--snapshot-interval 60`, but Portainer validates this flag with Go duration syntax. This was corrected to `--snapshot-interval 60s`.
- The API example used the correct `SnapshotInterval` field name, but the rest of the post described the setting as seconds-only. The example was normalized to a duration-string value (`2m`) to match the official API schema and CLI behavior.
- The snapshot description included unsupported wording about "stack status" and implied all UI views rely on snapshots instead of direct API calls. This was tightened to match Portainer documentation and source code, which describe snapshots as home-page and other basic environment data.
- The post claimed Portainer BE can disable snapshots per environment from Advanced settings. I could not verify this in current official docs or source for standard environments. The section was corrected to state that the main snapshot interval is a global setting, while Edge async environments have their own per-environment snapshot interval.

## Review Notes
- Portainer currently supports both JWT-based API authentication via `/api/auth` and access-token authentication via `X-API-Key`. The post's JWT example is valid, so it was retained.
- Current Portainer installation docs for CE typically use the `portainer/portainer-ce:lts` image tag, although Portainer documentation still contains some `:latest` examples in FAQs. The existing image tag in this post is still plausible and was left unchanged.
