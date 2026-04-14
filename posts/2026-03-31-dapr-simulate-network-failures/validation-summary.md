# Validation Summary: How to Simulate Network Failures for Dapr Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux Traffic Control (`tc`) with `netem`
- Toxiproxy (TCP proxy for fault injection)
- Chaos Mesh (Kubernetes chaos engineering platform)
- Dapr Resiliency policies (retries, timeouts)
- Dapr state store component (Redis)
- Prometheus metrics for Dapr

## Sources Consulted
- tc-netem(8) Linux manual page — https://man7.org/linux/man-pages/man8/tc-netem.8.html
- tc(8) Linux manual page — https://man7.org/linux/man-pages/man8/tc.8.html
- Toxiproxy GitHub repository and README — https://github.com/Shopify/toxiproxy
- Chaos Mesh documentation for NetworkChaos — https://chaos-mesh.org/docs/simulate-network-chaos-on-kubernetes/
- Dapr Resiliency documentation — https://docs.dapr.io/operations/resiliency/
- Dapr Redis state store component documentation — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr metrics documentation — https://docs.dapr.io/operations/observability/metrics/

## Issues Found

1. **Toxiproxy Docker image is outdated**: The post used `shopify/toxiproxy` (Docker Hub), which only hosts very old versions (<= 2.1.4). Changed to `ghcr.io/shopify/toxiproxy` which is the current official image location on GitHub Container Registry.

2. **Dapr Resiliency YAML missing `outbound:` wrapper**: The `targets.components.statestore` section placed `timeout` and `retry` directly under the component name. Dapr's Resiliency spec requires an `outbound:` (or `inbound:`) wrapper under the component name. Added the `outbound:` key with the correct indentation.

## Review Notes
- The `tc` commands are all individually correct but are presented in a single code block. Running them sequentially would cause the second and third `add` commands to fail with "RTNETLINK answers: File exists" because a root qdisc already exists. Readers should understand these are separate alternatives — each requires deleting the previous rule first, or using `tc qdisc change` instead of `add`.
- The exponential retry policy in the Resiliency YAML is technically valid but omits `initialInterval` and `multiplier` fields that are commonly included in Dapr documentation examples. Dapr uses defaults when these are omitted, so this is not an error, but a more complete example would include them.
- The Chaos Mesh YAML uses `externalTargets` for `redis-master.default.svc.cluster.local`, which is a cluster-internal Kubernetes service. While `externalTargets` can resolve internal DNS names, the more idiomatic approach for targeting in-cluster services is using a `target` block with a `selector`. The current approach is functional but not best practice.
- The Prometheus metric `dapr_resiliency_count` is a valid Dapr metric. Other related metrics like `dapr_resiliency_activations_total` may also be useful for monitoring resiliency behavior.
