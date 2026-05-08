# Validation Summary: How to Use Kubernetes with Cilium Observability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Cilium
- Hubble
- Hubble CLI
- Hubble UI
- Helm
- Prometheus
- Grafana
- Kubernetes Ingress

## Sources Consulted
- Cilium Network Observability with Hubble documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Cilium Setting up Hubble Observability documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Service Map & Hubble UI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-ui/
- Cilium command reference for cilium-dbg endpoint list: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for cilium-dbg status: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Helm chart values and templates for v1.14.0 and v1.19.3: https://github.com/cilium/cilium/tree/v1.19.3/install/kubernetes/cilium
- Hubble CLI observe help output from the official cilium/hubble release binary: https://github.com/cilium/hubble/releases
- Cilium CLI hubble port-forward and hubble ui help output from the official cilium/cilium-cli release binary: https://github.com/cilium/cilium-cli/releases

## Issues Found
- The Hubble metrics configuration enabled `httpV2:exemplars=true` without enabling OpenMetrics. Cilium documents that exemplars require OpenMetrics, so I added `hubble.metrics.enableOpenMetrics: true`.
- The Prometheus query grouped `hubble_flows_processed_total` by `source_namespace` and `destination_namespace`, but the `flow` metric was enabled without those labels. I changed the flow metric entry to `flow:labelsContext=source_namespace,destination_namespace` so the query has the labels it groups by.
- The endpoint-state command used `cilium endpoint list` inside the Cilium DaemonSet. Current Cilium documentation uses the debug CLI installed in agent pods, so I changed it to `cilium-dbg endpoint list -o json`.
- The troubleshooting command used `cilium status` inside the Cilium DaemonSet. Current Cilium documentation uses `cilium-dbg status` inside agent pods, so I changed the command accordingly.

## Review Notes
- The remaining Hubble CLI filters, Helm keys, Hubble UI service port-forward, Ingress API version, and `hubble.eventBufferCapacity` Helm value were consistent with Cilium documentation and chart templates for the stated Cilium 1.14+ baseline and current stable Cilium documentation.
- L7 HTTP metrics and HTTP flow details depend on Cilium Layer 7 visibility being enabled for the relevant traffic; the post's examples are valid but users may need policy or visibility configuration before seeing HTTP-level data.
