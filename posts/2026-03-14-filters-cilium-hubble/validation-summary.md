# Validation Summary: How to Use Filters in Cilium Hubble

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Hubble CLI
- Hubble Relay
- Hubble exporter
- Kubernetes
- Helm
- Python JSON processing

## Sources Consulted
- Cilium documentation: Network Observability with Hubble: https://docs.cilium.io/en/stable/observability/hubble/
- Cilium documentation: Setting up Hubble Observability: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium documentation: Inspecting Network Flows with the CLI: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium documentation: Configuring Hubble exporter: https://docs.cilium.io/en/stable/observability/hubble/configuration/export/
- Cilium source: Hubble observe command filters: https://github.com/cilium/cilium/blob/v1.19.3/hubble/cmd/observe/flows.go
- Cilium source: Hubble flow filter parsing: https://github.com/cilium/cilium/blob/v1.19.3/hubble/cmd/observe/flows_filter.go
- Cilium source: Hubble protocol filtering: https://github.com/cilium/cilium/blob/v1.19.3/pkg/hubble/filters/protocol.go
- Cilium source: Hubble HTTP filtering: https://github.com/cilium/cilium/blob/v1.19.3/pkg/hubble/filters/http.go
- Cilium source: Hubble printer JSON output behavior: https://github.com/cilium/cilium/blob/v1.19.3/hubble/pkg/printer/printer.go

## Issues Found
- The static Hubble exporter configuration used `includeFilters` and `excludeFilters`, but Cilium's static exporter Helm values are `hubble.export.static.allowList` and `hubble.export.static.denyList`. Updated the YAML example and Helm command to use `allowList` and `denyList`.
- The workload filter comment described `--to-workload` as a pod-label filter. Updated the comment to describe it as a workload-name filter.
- The verdict filter comment listed only part of the current Hubble verdict enum. Expanded it to include `REDIRECTED`, `TRACED`, and `TRANSLATED`.
- The "Find TCP retransmissions" recipe did not detect retransmissions; it matched TCP RST and SYN/ACK flags. Renamed the recipe and output text to match what the example actually detects.

## Review Notes
- The CLI examples were checked against Cilium/Hubble v1.19.3 documentation and source. Hubble CLI is documented as backward compatible with supported Cilium releases, but some flags and Helm values may differ on much older Cilium installations.
- L7 examples require Cilium L7 visibility to be configured, as the post already notes.
