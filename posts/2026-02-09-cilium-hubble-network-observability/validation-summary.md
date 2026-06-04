# Validation Summary: How to use Cilium Hubble for network flow observability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Cilium
- Hubble
- Hubble CLI
- Helm
- CiliumNetworkPolicy
- Prometheus metrics
- jq

## Sources Consulted
- Cilium documentation: Network Observability with Hubble: https://docs.cilium.io/en/stable/observability/hubble/
- Cilium documentation: Setting up Hubble Observability: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium documentation: Inspecting Network Flows with the CLI: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium documentation: Service Map & Hubble UI: https://docs.cilium.io/en/stable/observability/hubble/hubble-ui/
- Cilium documentation: Monitoring & Metrics: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium documentation: Layer 7 Policies: https://docs.cilium.io/en/latest/security/policy/layer7/
- Cilium documentation: Troubleshooting: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Hubble CLI v1.19.3 local `hubble observe --help` output.

## Issues Found
- The post pinned Cilium `1.14.5`, which is outdated for a 2026 guide. Updated the Helm examples to Cilium `1.19.4`, matching the current stable Cilium documentation checked during review.
- The Helm install enabled Hubble Relay, UI, and metrics but did not explicitly set `hubble.enabled=true`. Added it so Hubble metrics and observability are enabled unambiguously.
- The Hubble CLI install command used the old GitHub `master` branch URL and hard-coded `amd64`. Updated it to the documented `main` branch URL, added `--fail`, and included architecture detection for Linux `amd64` and `arm64`.
- The post used the removed `--json` Hubble output flag. Replaced all occurrences with `-o json`, which is the current CLI output flag.
- The post used `--type request`, which is not a valid Hubble event type. Replaced it with `--type l7` and used `jq` to select DNS request records where request-only filtering was needed.
- The post enabled the deprecated Hubble `http` metric. Updated Helm metric lists to use `httpV2`, which current Cilium metrics documentation recommends.
- The Prometheus metrics check forwarded `ds/cilium` on port `9090`, but Hubble metrics are exposed through the `hubble-metrics` service on port `9965` when `hubble.metrics.enabled` is set. Updated the command accordingly.
- The manual ServiceMonitor selected `k8s-app: cilium`, which targets the Cilium agent service rather than Hubble metrics. Updated the selector to `k8s-app: hubble`.
- The explanation that Hubble sees every packet at the socket level was too strong. Reworded it to describe Hubble observing flows from the Cilium datapath with Kubernetes identity context.
- The HTTP method filtering example used JSON processing where the current Hubble CLI has a dedicated `--http-method` filter. Updated the command to use the built-in filter.
- The performance section labeled TCP RST/FIN flags as retransmissions and described SYN listing as connection establishment timing. Reworded those examples to accurately describe resets, closes, and connection attempts.
- The troubleshooting section used `cilium status` and `cilium config view` inside the Cilium pod and referenced a non-existent `hubble stats` command. Updated the commands to use `cilium-dbg status`, `cilium-dbg config --all`, and `hubble status`.
- The PromQL example labeled the flow metric as namespace-specific without configuring namespace labels. Updated the comment to describe it as a general flow-rate query.

## Review Notes
The Cilium docs note that L7 metrics such as HTTP are only emitted for pods with Layer 7 protocol visibility enabled. The post already demonstrates enabling HTTP visibility with a CiliumNetworkPolicy, but readers should be aware that HTTP metrics will not appear for arbitrary traffic unless L7 visibility applies.
