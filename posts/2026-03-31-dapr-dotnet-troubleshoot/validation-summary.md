# Validation Summary: How to Troubleshoot Dapr .NET SDK Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (sidecar architecture, metadata API, pub/sub, service invocation, actors, dashboard)
- Dapr CLI (`dapr run`, `dapr list`, `dapr invoke`, `dapr dashboard`)
- Dapr .NET SDK (`DaprException`, `InvokeMethodAsync`, `MapSubscribeHandler`, `MapActorsHandlers`)
- ASP.NET Core (minimal hosting model, logging configuration)
- YAML (Dapr component configuration)

## Sources Consulted
- Dapr Metadata API Reference — https://docs.dapr.io/reference/api/metadata_api/
- Dapr CLI `dapr run` Reference — https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI `dapr invoke` Reference — https://docs.dapr.io/reference/cli/dapr-invoke/
- Dapr CLI `dapr list` Reference — https://docs.dapr.io/reference/cli/dapr-list/
- Dapr .NET SDK Actors Usage Docs — https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-usage/
- Dapr .NET SDK source code (`ActorsEndpointRouteBuilderExtensions.cs`) — https://github.com/dapr/dotnet-sdk
- Dapr CLI source code (`cmd/invoke.go`) — https://github.com/dapr/cli
- Dapr CLI Issue #953 (rename `--components-path`) — https://github.com/dapr/cli/issues/953

## Issues Found
1. **Deprecated CLI flag `--components-path`**: The post referenced `--components-path` in the "DaprException: Component Not Found" section. This flag was deprecated in Dapr CLI 1.10/1.11 in favor of `--resources-path`, because the directory now holds not just components but also subscriptions, resiliency policies, and other resource types. Updated the reference to `--resources-path`.

## Review Notes
- The health endpoint (`/v1.0/healthz`), metadata endpoint (`/v1.0/metadata`), and `jq '.components'` field name are all correct for the current Dapr HTTP API.
- The `dapr invoke --verb GET` syntax is correct (`--verb` with short form `-v`).
- `app.MapSubscribeHandler()` (singular) and `app.MapActorsHandlers()` (plural Actors, plural Handlers) are both the correct method names in the current Dapr .NET SDK.
- The `dapr run --log-level debug` flag and .NET logging filter configuration are accurate.
- The YAML component snippet is a fragment (missing `apiVersion`, `kind`, `spec`) but is clearly presented as an illustrative excerpt showing the relevant `metadata.name` field, which is appropriate for a troubleshooting guide.
- The default port 5001 used in the pub/sub curl example may not match all .NET app configurations, but this is an illustrative example and the post doesn't claim it's universal.
