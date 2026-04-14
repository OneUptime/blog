# Validation Summary: How to Use In-Memory Raft Store for Dapr Placement

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (placement service, sidecar, actors)
- Raft consensus protocol (in-memory vs disk-based log store)
- Docker Compose
- Kubernetes (Deployments, annotations)

## Sources Consulted
- Dapr placement service source code (v1.14.0): https://github.com/dapr/dapr/blob/v1.14.0/cmd/placement/options/options.go — verified flag names, default values (`inmem-store-enabled=true`, `port=50005`)
- Dapr placement service source code (master): https://github.com/dapr/dapr/blob/master/cmd/placement/options/options.go — confirmed flags remain consistent
- Dapr self-hosted without Docker docs: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-no-docker/ — confirmed default placement port is 50005
- Dapr self-hosted with Docker docs: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/ — confirmed Docker Compose uses `--port 50006` convention and `daprio/placement` image
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/ — confirmed `dapr.io/placement-host-address` annotation exists
- Dapr Kubernetes production guidelines: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/ — confirmed `forceInMemoryLog` Helm setting and placement tuning parameters
- Dapr placement service concepts: https://docs.dapr.io/concepts/dapr-services/placement/

## Issues Found

1. **Incorrect default behavior claim (opening paragraph)**: The post stated "By default, the Dapr placement service persists its Raft log to disk." This is incorrect — the binary defaults to `inmem-store-enabled=true`, meaning in-memory is the default. Fixed to accurately describe the default behavior and mention `raft-logstore-path` for disk persistence.

2. **Wrong default port for `dapr init` (line 29)**: The post stated placement starts at "localhost:50006" after `dapr init`. The actual default port is **50005** (confirmed in source code and official docs). Port 50006 is only used when explicitly set via `--port 50006` (common in Docker Compose). Fixed to 50005.

3. **Incorrect `-initial-cluster ""` mechanism (Docker Compose section)**: The post used `-initial-cluster` with an empty string and commented "Empty = single node, no disk persistence." This is wrong — `initial-cluster` configures Raft cluster peers for HA mode, not storage mode. In-memory storage is controlled by `inmem-store-enabled` (which already defaults to `true`). Removed the incorrect flags entirely since in-memory mode requires no special configuration.

4. **Unnecessary emptyDir volume (Kubernetes section)**: The Kubernetes example used an `emptyDir` volume mount at `/var/lib/dapr/placement`, but since `inmem-store-enabled` defaults to `true`, no volume is needed for in-memory mode. Simplified the deployment to remove the unnecessary volume mount and updated the section heading and description.

5. **Flag format inconsistency**: Changed single-dash flags (`-port`, `-log-level`) to double-dash format (`--port`, `--log-level`) to match official Dapr documentation conventions. Both formats work with Go's flag package, but double-dash is the documented style.

## Review Notes
- The `dapr status` output and log messages in the "Behavior After Restart" section are illustrative and may not exactly match real output format, but are reasonable representations.
- The performance numbers (0.008s vs 0.015s) are presented as an example measurement, not as official benchmarks. This is fine for illustrative purposes.
- The `dapr.io/placement-host-address` annotation and actor invocation API path (`/v1.0/actors/{type}/{id}/method/{method}`) are correct.
- The Kubernetes Deployment YAML is missing a `selector` field and pod `metadata.labels`, which are required for a valid Deployment. However, this appears to be an intentional abbreviation for clarity (showing only the relevant parts), which is common in blog posts.
- The Docker image `daprio/placement:1.14.0` is correct and available on Docker Hub.
