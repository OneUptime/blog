# Validation Summary: How to Monitor Dapr Placement Service Health

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (placement service, actor runtime, sidecar)
- Kubernetes (StatefulSet, pod health, kubectl)
- Prometheus (metrics scraping, AlertManager rules)
- Raft consensus protocol (leader election in placement HA mode)

## Sources Consulted
- Dapr Metrics Overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Actors API Reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Health API Reference: https://docs.dapr.io/reference/api/health_api/
- Dapr Kubernetes Production Guidelines: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Placement Helm Chart (StatefulSet template): https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_placement/templates/dapr_placement_statefulset.yaml
- Dapr Metrics Documentation: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr GitHub Issues #2242 (healthz port), #3725 (healthz server), #5029 (labels)

## Issues Found

1. **Non-existent metric `dapr_placement_leader_election_total`**: The blog post referenced a metric called `dapr_placement_leader_election_total` described as "Raft leader election count". This metric does not exist in Dapr. The actual leader-related metric is `dapr_placement_leader_status`, which is a gauge (1 = leader, 0 = not leader). Fixed the metric name and description in the Prometheus Metrics section.

2. **Invalid AlertManager rule using `rate()` on non-existent counter**: The `DaprPlacementLeaderElectionFrequent` alert used `rate(dapr_placement_leader_election_total[10m]) > 0.1`, which referenced the non-existent counter metric. Since the real metric (`dapr_placement_leader_status`) is a gauge, `rate()` is inappropriate. Replaced with a `DaprPlacementNoLeader` alert that checks `max(dapr_placement_leader_status) == 0` to detect when no instance is reporting as leader.

3. **Misleading description for `dapr_placement_actor_heartbeat_timestamp`**: The blog post described this metric as "Actor table dissemination duration". The actual metric represents the timestamp (in seconds) when an actor's heartbeat was last reported to the placement service -- it is a timestamp, not a duration. Fixed the description.

## Review Notes
- The actor invocation example uses `PUT` which is technically valid (the Dapr actors API accepts POST, GET, PUT, and DELETE), but `POST` is more conventional in Dapr documentation examples.
- The sidecar log messages shown (e.g., "placement service connection error: connection reset") are illustrative approximations rather than exact log formats, which vary by Dapr version. This is acceptable for a monitoring guide.
- The placement service log patterns listed (e.g., "leader elected", "raft: failed to") are reasonable patterns to grep for but are not guaranteed to be exact strings across all Dapr versions.
