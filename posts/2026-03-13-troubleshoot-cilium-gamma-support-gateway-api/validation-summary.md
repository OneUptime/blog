# Validation Summary: How to Troubleshoot Cilium GAMMA Support in the Cilium Gateway API

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Gateway API
- GAMMA
- Helm
- kubectl

## Sources Consulted
- Cilium GAMMA Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gamma/
- Cilium Gateway API Support and troubleshooting documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium CLI `config view` reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view.html
- Kubernetes Gateway API HTTPRoute documentation: https://gateway-api.sigs.k8s.io/api-types/httproute/
- Gateway API v1.4.1 HTTPRoute CRD manifest: https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v1.4.1/config/crd/standard/gateway.networking.k8s.io_httproutes.yaml

## Issues Found
- The post used `enable-gateway-api-gamma` and `gatewayAPI.enableGamma`, but current Cilium documentation exposes Gateway API support through `enable-gateway-api` in config and `gatewayAPI.enabled=true` in Helm values. Updated the command and Helm guidance accordingly.
- The post stated that GAMMA requires experimental CRDs. Current Cilium stable documentation lists the required Gateway API CRDs for GAMMA from the supported Gateway API release, with HTTPRoute provided through the standard CRD channel. Updated the text to check the CRD bundle version and channel instead of requiring an experimental install.
- The post described successful reconciliation as eBPF rules being loaded. Cilium documentation describes GAMMA HTTP traffic as being routed through the per-node Envoy proxy after Gateway API resources are reconciled. Updated the wording to "Envoy config applied."
- The description and introduction referred to eBPF program failures and a separate GAMMA feature flag. Updated these to Gateway API configuration and Envoy reconciliation failures.

## Review Notes
Cilium's required Gateway API CRD version is release-specific. The current stable documentation for Cilium 1.19.3 references Gateway API v1.4.1, while the latest development documentation references v1.5.1. Future updates to the post should align examples with the Cilium version being discussed.
