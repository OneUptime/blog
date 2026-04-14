# Validation Summary: How to Simulate State Store Failures for Dapr Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (state management building block, resiliency policies)
- Redis (as Dapr state store)
- Toxiproxy (network fault injection)
- Chaos Mesh (Kubernetes chaos engineering)
- Kubernetes (kubectl, pods, StatefulSets)
- Docker

## Sources Consulted
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Targets: https://docs.dapr.io/operations/resiliency/targets/
- Dapr State Store (Redis) Component Reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Chaos Mesh PodChaos Documentation: https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/
- Chaos Mesh Schedule Documentation: https://chaos-mesh.org/docs/define-scheduling-rules/
- Chaos Mesh GitHub Discussion #2065 (maintainer confirmation that `scheduler` field was removed in 2.0): https://github.com/chaos-mesh/chaos-mesh/discussions/2065
- Toxiproxy CLI Documentation: https://github.com/Shopify/toxiproxy

## Issues Found

### 1. Chaos Mesh `scheduler` field removed in 2.x (fixed)
**What was wrong:** The `PodChaos` resource included a `scheduler.cron` field, which was valid only in Chaos Mesh 1.x. In Chaos Mesh 2.x (current), this field was removed and causes a validation error (`unknown field 'scheduler'`).

**What was changed:** Converted the `PodChaos` resource with embedded `scheduler` to a `Schedule` resource, which is the correct Chaos Mesh 2.x approach for recurring chaos experiments. Updated the `kubectl apply` filename accordingly.

**Why:** The `scheduler` field was replaced by the `Schedule` kind in Chaos Mesh 2.0, as confirmed by maintainer YangKeao in GitHub Discussion #2065.

### 2. Dapr Resiliency component target missing `outbound` key (fixed)
**What was wrong:** The resiliency policy's `targets.components.statestore` section placed `timeout`, `retry`, and `circuitBreaker` directly under the component name, without the required `outbound` wrapper.

**What was changed:** Added the `outbound` key under `statestore` in the targets section, wrapping the policy references.

**Why:** Dapr's resiliency spec requires an `outbound` (and/or `inbound`) directional key for component targets, as defined in the Go types (`ComponentPolicyNames` struct) and shown in all official documentation examples. Without `outbound`, the policies would not be applied to state store calls.

## Review Notes
- The Docker command for Toxiproxy uses both `-p` port mappings and `--network host`. When `--network host` is used, `-p` flags are ignored (Docker emits a warning). This is not technically an error (Docker still runs), but could be confusing. Users should either remove `--network host` to use port mappings, or remove the `-p` flags when using host networking.
- The Toxiproxy Docker image `shopify/toxiproxy` on Docker Hub works, but the canonical location has moved to `ghcr.io/shopify/toxiproxy`. Both are functional.
- The Dapr metrics endpoint at `localhost:9090` is not the default Dapr metrics port (default is `9090`, so this is correct). The metric name `dapr_state` is a plausible prefix for Dapr state store metrics.
