# Validation Summary: How to Monitor IPv6 Traffic in Kubernetes with Hubble

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Kubernetes
- Cilium (CNI)
- Hubble (Cilium observability layer)
- Hubble CLI
- Hubble UI
- Prometheus (metrics export)
- IPv6 networking / dual-stack

## Sources Consulted
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Hubble CLI source (flows_filter.go) — `ipVersion()` function defining valid `--ip-version` values: `4`, `v4`, `ipv4`, `ip4`, `6`, `v6`, `ipv6`, `ip6`
- Hubble stable version file: https://raw.githubusercontent.com/cilium/hubble/master/stable.txt (returns v1.19.3, confirming the URL is current)
- Cilium GitHub repository (cilium/hubble) for CLI install procedure

## Issues Found
- **Step 8 — wrong metrics port**: The post used `9962` for "Hubble flow metrics", but port `9962` is the Cilium agent metrics endpoint. Hubble flow metrics are exposed on port `9965` (served via the cilium-agent daemonset and the `hubble-metrics` service). Updated the `kubectl port-forward` and `curl` commands to use port `9965` and clarified the comment to "Port-forward the Hubble metrics endpoint".

## Review Notes
- The `--ip-version ipv6` value used by the post is valid; the Hubble CLI accepts `4`, `v4`, `ipv4`, `ip4`, `6`, `v6`, `ipv6`, and `ip6` (case-insensitive) for that flag.
- `--from-ip`, `--to-ip`, `--namespace`, `--follow`, and `--verdict DROPPED` are all valid `hubble observe` flags/values.
- The grep pattern `([0-9a-f:]{2,39})::` in Step 4 is a rough heuristic for matching IPv6 addresses; the native `--ip-version ipv6` filter (also shown) is the more reliable approach, which the post correctly recommends.
- Hubble metrics on port 9965 are only enabled if the Cilium chart was installed with Hubble metrics enabled (e.g. `--set hubble.metrics.enabled="{...}"`). The post does not call out this prerequisite, but this is more of a documentation enhancement than a correctness issue.
- The `cilium hubble enable --ui` command is correct for the Cilium CLI (v0.13+); on very recent Cilium installs, Hubble may already be enabled if the Helm values turned it on at install time.
- The Hubble install URL `https://raw.githubusercontent.com/cilium/hubble/master/stable.txt` is still active and returns the current stable version (v1.19.3 as of review), so the install snippet works as-is.
