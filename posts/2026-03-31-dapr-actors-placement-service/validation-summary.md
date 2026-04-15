# Validation Summary: How to Use Dapr Actors with the Placement Service

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (placement service, actor runtime, sidecar architecture)
- Kubernetes (StatefulSets, rolling deployments, Helm charts)
- Prometheus (alerting rules, metrics scraping)
- Consistent hashing (virtual node hash ring)

## Sources Consulted
- Dapr CLI reference: `dapr status` — https://docs.dapr.io/reference/cli/dapr-status/
- Dapr CLI reference: `dapr list` — https://docs.dapr.io/reference/cli/dapr-list/
- Dapr placement service overview — https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr placement API reference — https://docs.dapr.io/reference/api/placement_api/
- Dapr actor runtime configuration — https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr Kubernetes deployment (Helm chart) — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr metrics overview — https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr CLI `dapr run` arguments — https://docs.dapr.io/reference/arguments-annotations-overview/

## Issues Found

1. **Incorrect CLI command for self-hosted mode** (line 39): `dapr status -a actor-service` was incorrect. The `dapr status` command is Kubernetes-only and does not have a `-a` flag. Changed to `dapr list`, which lists running Dapr applications in self-hosted mode.

2. **Wrong port for placement API** (line 53): The placement state API endpoint was listed as `localhost:9090/placement/state`. Port 9090 is the metrics port, not the placement API port. The placement API is exposed on the healthz port, which defaults to 8080. Changed to `localhost:8080/placement/state`.

3. **Missing `tableVersion` in API response** (lines 59-69): The example response for the placement state API was missing the `tableVersion` field at the root level. Added `"tableVersion": 1` to match the actual API response schema documented by Dapr.

4. **Non-existent Prometheus metric name** (line 112): The Prometheus alert rule used `dapr_placement_actorheartbeat_connected`, which is not a real Dapr metric. Replaced with `dapr_placement_runtimes_total`, which tracks the number of registered actor runtimes, and updated the alert summary to match.

## Review Notes
- The placement state API (`/placement/state`) is disabled by default and must be explicitly enabled via the `--metadata-enabled` CLI flag or `DAPR_PLACEMENT_METADATA_ENABLED` environment variable. The post does not mention this, which could cause confusion for readers who get empty or 404 responses. This is not a technical error in what's written, but a helpful caveat to add in a future revision.
- The `drainRebalancedActors` default is `true` in Dapr, so the JSON example showing `"drainRebalancedActors": true` is technically redundant but not incorrect — it serves as explicit documentation of the setting.
- The Helm chart `maxAPILevel` field shown in the configuration example is a valid placement service option but is an advanced setting that most users won't need to modify.
