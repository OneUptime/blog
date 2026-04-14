# Validation Summary: How to Configure the Dapr Placement Service In-Memory Raft Store

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr placement service
- Raft consensus algorithm
- Kubernetes (StatefulSet, kubectl)
- Dapr Helm chart
- Dapr Resiliency CRD
- Prometheus metrics

## Sources Consulted
- Dapr source code: `charts/dapr/charts/dapr_placement/values.yaml` — Helm chart default values for placement subchart
- Dapr source code: `charts/dapr/charts/dapr_placement/templates/dapr_placement_statefulset.yaml` — StatefulSet template with replica logic and forceInMemoryLog usage
- Dapr source code: `pkg/placement/monitoring/metrics.go` — placement service metric definitions
- Dapr source code: `pkg/metrics/exporter.go` — default metrics path (`/`) and namespace (`dapr`)
- Dapr source code: `pkg/metrics/options.go` — default metrics port (9090)
- Dapr source code: `cmd/placement/options/options.go` — placement CLI flags including `--inmem-store-enabled`
- Dapr source code: `pkg/placement/internal/leadership/leadership.go` — Raft store initialization
- Dapr Resiliency spec examples across the blog repository, cross-referenced with official Dapr documentation

## Issues Found

1. **Helm chart `replicaCount: 3` does not exist**: The `dapr_placement` subchart has no `replicaCount` field. When `ha: true` is set, the StatefulSet template hardcodes `replicas: 3`. The field was removed from the example.

2. **Overview incorrectly stated in-memory is the default for all modes**: The default in HA Kubernetes deployments is persistent storage via PVC (`forceInMemoryLog: false`). In-memory is only the default for self-hosted and single-replica development mode. Updated the overview to clarify this distinction.

3. **Metric `dapr_placement_runtimehosts_total` does not exist**: The correct metric name is `dapr_placement_runtimes_total`, which tracks the total number of connected runtimes (sidecars). Fixed the metric name and description.

4. **Metric `dapr_placement_actortypes_total` does not exist**: There is no metric tracking actor type counts. Replaced with `dapr_placement_actor_runtimes_total`, which tracks the total number of actor-hosting runtimes.

5. **Metric `dapr_placement_actor_heartbeat_timestamp` not found in source code**: This metric is listed in Dapr's docs but not defined in the actual Go source code at `pkg/placement/monitoring/metrics.go`. Replaced with `dapr_placement_leader_status`, which is a confirmed metric that indicates Raft leader status.

6. **Metrics URL path `/metrics` is incorrect**: The Dapr metrics exporter serves metrics at the root path `/`, not `/metrics`. Fixed the curl command from `:9090/metrics` to `:9090/`.

## Review Notes
- The Resiliency CRD example is correct: `apiVersion: dapr.io/v1alpha1`, retry policy structure, and actor target structure all verified against official Dapr sources.
- The kubectl commands use the correct pod name (`dapr-placement-server-0`) and label selector (`app=dapr-placement-server`), matching the StatefulSet template in the Helm chart.
- The metrics port 9090 is correct per the Dapr default configuration.
- On current Dapr master, the in-memory store is hardcoded regardless of CLI flags (the `--inmem-store-enabled` and `--raft-logstore-path` flags are parsed but not passed to the placement service). The Helm chart's `forceInMemoryLog` controls whether a PVC is mounted and the `--raft-logstore-path` argument is passed to the container.
