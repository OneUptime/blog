# Validation Summary: Preventing Cilium Limiting Identity-Relevant Labels

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus and Prometheus Operator
- Flux HelmRelease
- iperf3 and netperf

## Sources Consulted
- Cilium documentation: Limiting Identity-Relevant Labels, https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium documentation: Security Identities, https://docs.cilium.io/en/stable/internals/security-identities/
- Cilium documentation: Terminology and label sources, https://docs.cilium.io/en/stable/gettingstarted/terminology/
- Cilium documentation: Monitoring & Metrics, https://docs.cilium.io/en/stable/observability/metrics/
- Cilium documentation: Helm Reference, https://docs.cilium.io/en/stable/helm-reference/
- Cilium command reference: cilium config, https://docs.cilium.io/en/latest/cmdref/cilium_config/
- Cilium command reference: cilium-dbg identity list, https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/

## Issues Found
- The Helm `labels` example used Cilium display labels with `k8s:` source prefixes and an overly broad `io.cilium.k8s.policy` pattern. Updated it to use documented label patterns, escaped dotted names, and explicit policy cluster and service account patterns.
- The post implied that the Helm `labels` value creates an exact allow-list. Cilium documents that this value appends to default identity-relevant label patterns, so a note was added explaining this and pointing to `label-prefix-file` for exact declarative control.
- The Prometheus alerts used `cilium_identity_count`, which is not the documented Cilium metric. Updated the expressions to use the documented `cilium_identity` metric and aggregate per Cilium pod to avoid multiplying identity count by the number of agents.
- The rapid-growth alert used `deriv(...[1h]) > 100`, which would be interpreted as a per-second slope and was not valid for the original metric name. Updated it to a one-hour subquery and converted the slope to identities per hour.
- The verification command used `cilium identity list`, but the documented identity-list command is `cilium-dbg identity list`. Updated the example to run `cilium-dbg` inside the Cilium DaemonSet.
- The troubleshooting section claimed identity counts should drop after simply waiting for garbage collection and that namespace identities are the minimum. Updated it to mention endpoint regeneration/restarts and Cilium's default identity-relevant label patterns.

## Review Notes
The remaining benchmarking snippets are syntactically reasonable, but their thresholds and service names are environment-specific. The guide should treat the 8 Gbps threshold and 5% regression threshold as examples to calibrate per cluster.
