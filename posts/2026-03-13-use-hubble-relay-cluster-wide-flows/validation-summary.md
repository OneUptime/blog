# Validation Summary: How to Use Hubble Relay for Cluster-Wide Flow Searches in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Hubble Relay
- Hubble CLI
- Kubernetes
- Helm
- Hubble UI
- jq

## Sources Consulted
- Cilium documentation: Setting up Hubble Observability - https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium documentation: Network Observability with Hubble - https://docs.cilium.io/en/stable/observability/hubble/
- Cilium documentation: Hubble Helm values - https://docs.cilium.io/en/stable/helm-values/
- Cilium documentation: Inspecting Network Flows with the CLI - https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium documentation: Service Map & Hubble UI - https://docs.cilium.io/en/latest/observability/hubble/hubble-ui/
- Cilium documentation: Configuring Hubble exporter - https://docs.cilium.io/en/stable/observability/hubble/configuration/export.html
- Cilium v1.19.3 Hubble CLI help/source - https://raw.githubusercontent.com/cilium/cilium/v1.19.3/hubble/cmd/observe_help.txt

## Issues Found
- The external-destination example used `--not-to-namespace`, which is not a supported `hubble observe` flag. Changed it to the documented negation form, `--not --to-namespace production`.
- The DNS protocol example used uppercase `DNS`. Changed it to lowercase `dns`, matching the documented Hubble CLI protocol examples.
- The HTTP error example used `--http-status-code`, which is not a supported Hubble CLI flag. Changed it to `--http-status`, which filters by HTTP status code prefix.

## Review Notes
The Relay deployment Helm values, Relay port-forwarding flow, cluster-wide Relay explanation, service filter, namespace/IP filters, JSON output mode, and Hubble UI access pattern are consistent with Cilium/Hubble documentation. HTTP and DNS visibility depend on Cilium/Hubble receiving L7 flow data; in practice this usually requires appropriate L7 visibility or policy configuration.
