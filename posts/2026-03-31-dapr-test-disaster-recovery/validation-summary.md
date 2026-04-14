# Validation Summary: How to Test Dapr Disaster Recovery Procedures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar, state management API, pub/sub API, health endpoint)
- Chaos Mesh (PodChaos, NetworkChaos)
- Kubernetes (CronJob, kubectl, multi-cluster contexts)
- Helm
- Redis (as Dapr state store)

## Sources Consulted
- [Simulate Pod Faults | Chaos Mesh](https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/) — verified PodChaos spec structure
- [Upgrade to Chaos Mesh 2.0 | Chaos Mesh](https://chaos-mesh.org/docs/upgrade-to-2.0/) — confirmed `scheduler` field removal in 2.x
- [Define Scheduling Rules | Chaos Mesh](https://chaos-mesh.org/docs/define-scheduling-rules/) — confirmed `Schedule` CRD replaces inline scheduler
- [Simulate Network Faults | Chaos Mesh](https://chaos-mesh.org/docs/simulate-network-chaos-on-kubernetes/) — verified NetworkChaos spec structure
- [Sidecar Health | Dapr Docs](https://docs.dapr.io/operations/resiliency/health-checks/sidecar-health/) — verified `/v1.0/healthz` endpoint
- [State Management API Reference | Dapr Docs](https://docs.dapr.io/reference/api/state_api/) — verified state save/get API paths and payload format
- [Pub/sub API Reference | Dapr Docs](https://docs.dapr.io/reference/api/pubsub_api/) — verified publish API path
- [chaos-mesh-action Issue #10](https://github.com/chaos-mesh/chaos-mesh-action/issues/10) — confirms `scheduler` field causes validation errors in 2.x

## Issues Found

### 1. PodChaos `scheduler` field (Chaos Mesh 1.x only)
- **What was wrong:** The PodChaos YAML included a `scheduler: cron: "@once"` block. This field existed in Chaos Mesh 1.x but was removed in Chaos Mesh 2.x. Applying this YAML against a Chaos Mesh 2.x cluster produces a validation error: `unknown field 'scheduler'`.
- **What was changed:** Removed the `scheduler` block. In Chaos Mesh 2.x, a PodChaos resource runs immediately on creation — no scheduling field is needed for one-time experiments.
- **Why:** Chaos Mesh 2.0 has been the current major version since 2021. The `Schedule` CRD is now the correct way to define recurring chaos experiments.

### 2. DR drill script `set -e` conflicts with error-handling design
- **What was wrong:** The script used `set -e` (exit on error) but had a bare `curl` command for state writing (outside the `check()` function). If this curl failed (e.g., connection refused in a DR scenario), `set -e` would terminate the script immediately, preventing remaining tests from running. This contradicts the script's design of reporting individual pass/fail results for each test.
- **What was changed:** Removed `set -e` from the script.
- **Why:** The script's `check()` function already handles errors gracefully by wrapping commands in `if` blocks. The `set -e` directive undermined this pattern by crashing on any failure outside an `if` condition.

## Review Notes
- The Helm install command for Chaos Mesh assumes containerd as the container runtime. Users on Docker or CRI-O would need to adjust the `chaosDaemon.runtime` and `chaosDaemon.socketPath` values accordingly.
- The DR drill script uses placeholder URLs like `http://dr-svc/v1.0/...` which would need to be replaced with actual service endpoints (e.g., via port-forwarding or an ingress) in a real deployment.
- The `kubectl get component` command works but `kubectl get components` (plural) is the more standard Kubernetes convention for Dapr CRDs.
- The CronJob schedule `"0 3 * * 0"` runs at 3:00 AM every Sunday, which is a reasonable choice for weekly DR drills.
