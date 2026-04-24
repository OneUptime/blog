# Validation Summary: How to Configure the Snapshot Interval in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- Portainer CLI flags
- Docker
- Kubernetes
- `curl`
- `jq`

## Sources Consulted
- Portainer documentation, General settings: https://docs.portainer.io/admin/settings/general
- Portainer documentation, CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer documentation, API documentation index: https://docs.portainer.io/api/docs
- Portainer documentation, API usage examples: https://docs.portainer.io/api/examples
- Portainer source, settings update payload and `/settings` handler: https://github.com/portainer/portainer/blob/742523d/api/http/handler/settings/settings_update.go
- Portainer source, settings routes: https://github.com/portainer/portainer/blob/742523d/api/http/handler/settings/handler.go
- Portainer source, manual snapshot endpoint: https://github.com/portainer/portainer/blob/742523d/api/http/handler/endpoints/endpoint_snapshot.go
- Portainer source, endpoint routes: https://github.com/portainer/portainer/blob/742523d/api/http/handler/endpoints/handler.go
- Portainer source, snapshot interval flag validation: https://github.com/portainer/portainer/blob/742523d/api/cli/cli.go
- Portainer source, settings UI field and placeholder: https://github.com/portainer/portainer/blob/742523d/app/react/portainer/settings/SettingsView/ApplicationSettingsPanel/ApplicationSettingsPanel.tsx
- Portainer source, settings model and default snapshot interval representation: https://github.com/portainer/portainer/blob/742523d/api/portainer.go
- Portainer source, Docker snapshot contents: https://github.com/portainer/portainer/blob/742523d/pkg/snapshot/docker.go
- Portainer source, Kubernetes snapshot contents: https://github.com/portainer/portainer/blob/742523d/pkg/snapshot/kubernetes.go

## Issues Found
- The post said the default snapshot interval was 60 seconds. Current Portainer documentation states the default is every 5 minutes, so the overview, UI section, common values, and conclusion were corrected to `5m`.
- The UI navigation path was inaccurate. The settings live under `Settings -> General`, with `Snapshot interval` inside `Application settings`, so the UI instructions were updated accordingly.
- The post treated snapshot values as raw seconds such as `60`, `300`, and `3600`. Portainer’s CLI, settings API, and current UI use duration strings such as `30s`, `5m`, and `1h`, so all examples and recommendations were converted to valid duration syntax.
- The API example used `Authorization: Bearer` with a generic token name and sent `{"SnapshotInterval":"120"}`. The official API access-token workflow uses `X-API-Key`, and the settings payload expects a duration string, so the example was updated to use an API key and `{"SnapshotInterval":"2m"}`.
- The startup flag example used `--snapshot-interval 120`, which is not a valid duration string for Portainer’s CLI validation. It was corrected to `--snapshot-interval 2m`.
- The snapshot description overstated what Portainer snapshots contain, especially for Kubernetes and for resource usage statistics. The section was narrowed to environment summary data and basic environment metadata, matching the official docs and current source.
- The manual snapshot section implied this worked for all environment types. Current source shows direct manual snapshots are not supported for Edge or Azure environments, so the wording was corrected.
- The monitoring section said logs could be used to check snapshot timing. Current source primarily logs snapshot-related errors rather than interval timing, so the wording was corrected to snapshot-related errors.
- The performance table used `Edge (remote)` terminology that could be confused with Portainer Edge environments, which have separate polling settings. This was changed to `Remote environments`.

## Review Notes
- Reviewed against current Portainer 2.39.1 documentation and the official Portainer source as of 2026-04-24.
- Portainer supports both JWT-based `Authorization: Bearer` authentication and API-key authentication on these endpoints. The examples were normalized to `X-API-Key` because that matches Portainer’s documented API access-token workflow for automation.
