# Validation Summary: How to Understand the Dapr Control Plane Components

## Status
validated

## Post Type
Reference / Architecture Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (control plane deployment target)
- Helm (chart-based installation and HA configuration)
- gRPC (inter-component communication protocol)
- mTLS / SPIFFE (sidecar identity and certificate management)
- etcd (embedded in Scheduler for persistent job storage)
- Raft consensus (HA for Placement and Scheduler)

## Sources Consulted
- Dapr Operator source: `cmd/operator/options/options.go` — confirms port 6500
- Dapr Sentry config source: `pkg/sentry/config/config.go` — confirms port 50001, 24h default workload cert TTL
- Dapr Placement options source: `cmd/placement/options/options.go` — confirms port 50005
- Dapr Scheduler options source: `cmd/scheduler/options/options.go` — confirms port 50006
- Dapr Injector options source: `cmd/injector/options/options.go` — confirms port 4000
- Dapr CLI source: `cmd/version.go` — confirms `dapr version` only accepts `--output`, no `-k` flag
- Dapr CLI source: `cmd/init.go` — confirms both `--kubernetes` and `-k` flags are valid
- Dapr Helm chart `values.yaml` — confirms `global.ha.enabled` is the primary HA toggle; `dapr_placement.ha` is a bare boolean (not `ha.enabled`)
- Dapr security constants: `pkg/security/consts/consts.go` — confirms `dapr-trust-bundle` secret name
- Dapr Helm chart CRD definitions in `charts/dapr/crds/` — confirms all five listed CRDs
- Dapr Helm repository at `https://dapr.github.io/helm-charts/` — confirmed accessible with valid index

## Issues Found

### 1. Invalid CLI command: `dapr version -k`
- **What was wrong:** The post used `dapr version -k` to check the installed Kubernetes version. The `dapr version` command does not accept a `-k`/`--kubernetes` flag; it only supports `--output`/`-o`.
- **What was changed:** Replaced `dapr version -k` with `dapr status -k`, which correctly displays the health and version of Dapr control plane services in Kubernetes.
- **Why:** Running `dapr version -k` would produce a CLI error. `dapr status -k` is the correct command and was already used earlier in the post.

### 2. Incorrect Helm HA values structure
- **What was wrong:** The HA configuration YAML showed per-component keys like `dapr_placement.ha.enabled` and `dapr_scheduler.ha.enabled`. In the actual Dapr Helm chart: (a) HA is toggled globally via `global.ha.enabled`, which sets replica counts for all components; (b) `dapr_placement.ha` is a bare boolean (`ha: true`), not a nested `ha.enabled`; (c) `dapr_scheduler.ha.enabled` does not exist as a Helm value.
- **What was changed:** Replaced the per-component HA values with the correct `global.ha.enabled: true` and `global.ha.replicaCount: 3` structure, plus `dapr_placement.ha: true` for Raft-based leader election.
- **Why:** Using the original values would result in Helm ignoring the unrecognized keys, leaving HA disabled.

## Review Notes
- The CRD list (Component, Configuration, Resiliency, Subscription, HTTPEndpoint) is accurate but the Dapr Operator now also manages an `MCPServer` CRD added in recent versions. This omission is minor and the post may predate that addition.
- The Dapr Dashboard is correctly noted as optional in the architecture diagram. It is not part of the core five control plane components.
- All port numbers were verified against Dapr source code and are correct.
- The sequence diagram accurately represents the sidecar bootstrap flow.
- The post references Dapr version 1.15.0 in the upgrade example; this is used as an illustrative version number and is appropriate.
