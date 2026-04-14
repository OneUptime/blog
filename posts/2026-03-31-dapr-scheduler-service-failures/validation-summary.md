# Validation Summary: How to Handle Dapr Scheduler Service Failures

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr Scheduler service
- Dapr Jobs API (v1.0-alpha1)
- Dapr sidecar configuration
- Kubernetes (kubectl, StatefulSet, Helm)
- Prometheus alerting
- Embedded etcd (within Dapr Scheduler)
- Python (requests library)

## Sources Consulted
- Dapr Jobs API reference documentation (docs.dapr.io)
- Dapr Scheduler overview documentation (docs.dapr.io)
- Dapr Helm chart source code (github.com/dapr/dapr, charts/dapr/charts/dapr_scheduler/)
- Dapr Configuration API allowlist documentation (docs.dapr.io)
- Dapr service invocation API reference (docs.dapr.io)
- Dapr HTTP API source code (pkg/api/http/http.go, pkg/api/http/jobs.go)
- Dapr Scheduler StatefulSet template (dapr_scheduler_statefulset.yaml)

## Issues Found

1. **Incorrect kubectl label selector for Scheduler pods**: The post used `-l app=dapr-scheduler` but the correct label in the Dapr Helm chart StatefulSet is `-l app=dapr-scheduler-server`. Fixed to use the correct label.

2. **Incorrect Helm parameter for Scheduler replica count**: The post suggested `--set dapr_scheduler.replicaCount=3` to configure 3 replicas, but no such Helm value exists. The Dapr Scheduler StatefulSet hardcodes 3 replicas (to form a 3-node etcd cluster) and this is not configurable via Helm values. Rewrote the "Preventing Single Points of Failure" section to explain that the Scheduler defaults to 3 replicas and to show how to verify the StatefulSet is healthy, plus how to enable HA for other control plane services via `global.ha.enabled`.

3. **Summary section updated**: Adjusted the summary to reflect that the Scheduler already runs 3 replicas by default rather than implying you need to configure this.

## Review Notes
- The Configuration allowlist example using `name: jobs` and `version: v1alpha1` is consistent with Dapr source code patterns but is not explicitly listed in the official API allowlist documentation table. This may be an undocumented but functional configuration. Kept as-is since it aligns with the source code.
- The `etcdctl` diagnostic command assumes unauthenticated access on `http://localhost:2379` from within the pod. Depending on etcd mTLS configuration, additional TLS flags may be needed. This is acceptable for a general guide but readers may need to adapt for their specific setup.
- The Jobs API uses the `v1.0-alpha1` version prefix, indicating it is still in alpha. This should be monitored for changes in future Dapr releases.
