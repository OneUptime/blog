# Validation Summary: How to Handle Dapr Performance at Scale

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (control plane: Operator, Sentry, Placement)
- Kubernetes (kubectl, Helm)
- Redis (Dapr state store component)
- mTLS certificate management

## Sources Consulted
- [Dapr Operator control plane service overview](https://docs.dapr.io/concepts/dapr-services/operator/) — confirmed `watchInterval` is the injector watchdog interval, not a component reconciliation interval
- [Dapr Helm chart README](https://github.com/dapr/dapr/blob/master/charts/dapr/README.md) — verified Helm chart parameter names
- [Dapr Helm chart values.yaml](https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml) — verified available Helm values
- [Production guidelines on Kubernetes](https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/) — confirmed Placement HA uses `dapr_placement.ha=true` with fixed 3 replicas
- [Dapr Placement control plane service overview](https://docs.dapr.io/concepts/dapr-services/placement/) — confirmed Raft-based consensus requires HA mode
- [Redis state store component reference](https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/) — confirmed `poolSize` is a valid metadata field
- [Dapr Sentry control plane service overview](https://docs.dapr.io/concepts/dapr-services/sentry/) — verified Sentry metrics and certificate signing
- [Configure metrics | Dapr Docs](https://docs.dapr.io/operations/observability/metrics/metrics-overview/) — confirmed default metrics port is 9090
- [Sidecar watchdog fixes PR #5287](https://github.com/dapr/dapr/pull/5287) — confirmed watchdog behavior and defaults
- [Fix wrong metrics and typos in sentry PR #1249](https://github.com/dapr/dapr/pull/1249/files) — investigated Sentry metric names

## Issues Found

### 1. Placement service HA configuration (line ~38-42)
**What was wrong:** Used `--set dapr_placement.replicaCount=3` to scale the Placement service.
**What was changed:** Replaced with `--set dapr_placement.ha=true`. The Placement service uses Raft consensus for state replication, and HA mode must be explicitly enabled via `dapr_placement.ha=true`, which automatically deploys 3 replicas with proper Raft-based leader election. Simply setting `replicaCount=3` would create 3 independent instances without consensus, which would not function correctly.

### 2. `watchInterval` description was incorrect (line ~59-65)
**What was wrong:** The section claimed `dapr_operator.watchInterval` tunes "how frequently Dapr watches for component changes" and that the default `0` means "immediate."
**What was changed:** Corrected the section title and description. The `watchInterval` parameter controls the **injector watchdog**, which periodically polls pods to confirm that sidecar injection succeeded. The default value of `0` means the watchdog is **disabled**, not "immediate." This is a fundamentally different feature from component reconciliation.

### 3. `poolSize` comment was misleading (line ~83)
**What was wrong:** The comment said `# Allow 200 total connections (shared across all pods)`.
**What was changed:** Updated to `# Max connections per sidecar (each pod gets its own pool)`. Each Dapr sidecar maintains its own independent connection pool to Redis. A `poolSize` of 200 means each individual sidecar can open up to 200 connections, not that 200 connections are shared across all pods. With hundreds of pods, this could result in thousands of connections to Redis.

### 4. Summary section updated
**What was changed:** Updated the summary paragraph to reflect the corrected `watchInterval` description (changed "tune watch intervals to reduce reconciliation load" to "enable the injector watchdog for reliable sidecar injection").

## Review Notes
- The Sentry metric name `dapr_sentry_cert_sign_request_received_total` could not be definitively confirmed against current Dapr documentation. PR #1249 in the Dapr repo shows cert signing request metrics existed with a typo (`Recieved` instead of `Received`) that was later fixed, but the exact current metric name may differ. Readers should verify against their Dapr version's metrics endpoint.
- The namespace label `dapr.io/enabled=true` applied in the "Namespace Isolation" section does not functionally enable Dapr sidecar injection (which is controlled by pod-level annotations). However, using it as an organizational label is a reasonable practice and the section doesn't claim it enables injection, so this was left as-is.
- The `kubectl top` audit command works as a rough estimation tool but assumes consistent unit formatting in the output. CPU values from `kubectl top` include the `m` suffix (millicores) and memory values include `Mi`/`Gi` suffixes, which the `awk` script treats as plain numbers. This is adequate for approximate cluster-wide auditing.
- The Sentry port-forward command targets `svc/dapr-sentry` on port 9090. While the metrics port 9090 is configured on Sentry pods, the Kubernetes service may not expose this port depending on the Helm chart configuration. Readers may need to port-forward directly to a Sentry pod instead.
