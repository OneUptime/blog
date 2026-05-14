# Validation Summary: Hubble Observability in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Helm
- Hubble CLI
- eBPF
- Prometheus metrics

## Sources Consulted
- Cilium documentation: Setting up Hubble Observability - https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium documentation: Inspecting Network Flows with the CLI - https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium documentation: Service Map & Hubble UI - https://docs.cilium.io/en/stable/observability/hubble/hubble-ui/
- Cilium documentation: Monitoring & Metrics - https://docs.cilium.io/en/stable/observability/metrics/
- Cilium documentation: Hubble internals - https://docs.cilium.io/en/stable/internals/hubble/
- Cilium documentation: Helm Reference - https://docs.cilium.io/en/stable/helm-reference/
- Hubble CLI v1.19.3 `hubble observe --help` output

## Issues Found
- The prerequisite list required the `hubble` CLI before the post's own installation step and omitted the `cilium` CLI used in Step 1. Changed the prerequisite to require the `cilium` CLI instead.
- The guide claimed Cilium v1.10+ compatibility, but the Helm values and `httpV2` metric example match current Cilium documentation rather than the older v1.10-era configuration. Updated the prerequisite to Cilium v1.19+.
- The Helm enable command did not explicitly set `hubble.enabled=true`, which is required for Hubble metrics and makes the command correct even when Hubble is not already enabled. Added the Helm value.
- The verification block included `cilium hubble enable`, which is an enable command rather than a verification command and could conflict with the preceding Helm-based setup. Removed it from the verification block.
- The Hubble CLI install snippet used the old `master` branch URL for `stable.txt` and did not verify the downloaded artifact. Updated it to the current `main` URL, architecture-aware Linux tarball name, checksum verification, and documented install command.
- The post described `--last` and `--since` queries as historical flow queries. Hubble returns flows from its flow buffer, not durable historical storage. Renamed the section and comments to describe buffered flows.
- The architecture diagram showed Prometheus metrics behind Hubble Relay. Cilium documentation states Hubble metrics are served by Hubble instances running inside `cilium-agent`, with the default metrics port exposed via the Hubble metrics service. Updated the diagram edge to show metrics from the per-node Hubble server.
- The post overclaimed that Hubble shows exactly which network policy allowed or denied each connection. Adjusted wording to say it shows whether policy allowed or denied connections, which is accurate for policy verdict visibility.
- The introduction and conclusion described Hubble as observing every network packet without packet-copying overhead. Adjusted this to network-flow visibility without packet sampling or full packet-capture overhead.

## Review Notes
The Hubble UI can also be opened with `cilium hubble ui`, which automatically sets up port forwarding. The manual `kubectl port-forward` example in the post remains technically valid.
