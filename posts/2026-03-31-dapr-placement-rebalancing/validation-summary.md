# Validation Summary: How to Handle Dapr Placement Rebalancing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Placement service, actor model)
- Kubernetes (Deployments, StatefulSets, Helm)
- Prometheus (metrics monitoring)
- Node.js (axios HTTP client)

## Sources Consulted
- Dapr Placement service overview: https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr arguments and annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Helm chart README: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr Helm chart placement values.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_placement/values.yaml
- Dapr metrics documentation: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr production guidelines: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr consistent hash implementation: https://github.com/dapr/dapr/blob/master/pkg/placement/hashing/consistent_hash.go

## Issues Found

1. **Invalid `replicaCount` Helm parameter**: The post listed `dapr_placement.replicaCount: 3` in both the YAML config block and the `helm upgrade` command. This parameter does not exist — when `dapr_placement.ha` is set to `true`, the replica count is hardcoded to 3 and cannot be configured. Removed `replicaCount: 3` from the YAML block and `--set dapr_placement.replicaCount=3` from the Helm command.

2. **Incorrect graceful shutdown configuration**: The post used a non-existent `DAPR_GRACEFUL_SHUTDOWN_SECONDS` environment variable on the container. The correct approach is to use the Kubernetes pod annotation `dapr.io/graceful-shutdown-seconds`. Replaced the env var with the proper annotation in the Deployment manifest.

3. **Fabricated Prometheus metric names**: The post listed `dapr_placement_host_count` and `dapr_placement_table_update_total`, neither of which exist. Replaced with the actual Dapr placement metrics: `dapr_placement_runtimes_total` (total number of hosts reported) and `dapr_placement_actorruntimes_total` (total number of actor runtimes reported).

## Review Notes
- The `/v1.0/healthz/outbound` endpoint correctly returns 204 when healthy, which the post accurately states.
- The `app=dapr-placement-server` label selector is correct for targeting placement pods.
- The consistent hash ring explanation is accurate — Dapr uses a consistent hash ring with bounded loads based on Google's 2017 research paper.
- The `keepAliveTime` and `keepAliveTimeout` Helm values are correct with their stated defaults.
