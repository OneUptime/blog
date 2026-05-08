# Validation Summary: How to Use Basic Configuration in Cilium Hubble

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Helm
- Prometheus metrics
- kubectl, Cilium CLI, and Hubble CLI

## Sources Consulted
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Hubble setup guide: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble TLS configuration: https://docs.cilium.io/en/stable/observability/hubble/configuration/tls/
- Cilium Hubble metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium v1.19.3 Helm chart values source: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/install/kubernetes/cilium/values.yaml

## Issues Found
- The post used `hubble.eventBufferCapacity: "4096"` and described 4096 as the default. Current Cilium Helm values document supported capacities as one less than powers of two, including `4095`; changed examples and text to use `4095`.
- The first UI configuration used `hubble.ui.resources`, which is not a current Cilium Helm value. Hubble UI resources are configured under `hubble.ui.backend.resources` and `hubble.ui.frontend.resources`; updated the snippet accordingly.
- The observer snippet described `hubble.preferIpv6` as a datapath selector with values such as `any`, `veth`, and `netkit`. In current Cilium Helm values, `preferIpv6` controls whether Hubble prefers IPv6 addresses when both IPv4 and IPv6 are available; corrected the comment.
- The relay snippet included `hubble.relay.dialTimeout`, which is not present in current Cilium Helm values. Removed it and kept the documented `retryTimeout`, `sortBufferLenMax`, and `sortBufferDrainTimeout` values.
- The relay verification command used `hubble-relay status` inside the relay deployment. Current official docs validate relay access with `hubble status -P` and list connected nodes with `hubble list nodes -P`; updated the commands.
- The metrics verification port-forward targeted `ds/cilium`. Current Hubble metrics documentation describes the `hubble-metrics` service created by the Cilium chart when Hubble metrics are enabled; updated the command to port-forward `svc/hubble-metrics`.

## Review Notes
The post is technically relevant and was corrected against current Cilium 1.19.3 documentation. The examples assume the Cilium CLI and Hubble CLI are installed locally, and that Prometheus Operator CRDs exist before enabling `hubble.metrics.serviceMonitor.enabled`.
