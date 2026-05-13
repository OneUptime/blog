# Validation Summary: Configure Cilium with Broadcom NSX

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Hubble
- CiliumNetworkPolicy
- Broadcom NSX / VMware NSX-T
- eBPF networking

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup.html
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium policy language documentation: https://docs.cilium.io/en/stable/security/policy/language/
- VMware NSX-T Data Center Quick Start Guide: https://docs.vmware.com/en/VMware-NSX-T-Data-Center/3.2/nsxt_32_quick_start.pdf
- VMware NSX-T routing overview: https://blogs.vmware.com/networkvirtualization/2017/09/nsx-t-routing-where-you-need-it.html/

## Issues Found
- The Cilium Helm install and Best Practices section used `tunnel=disabled`, which is not the current Helm value for native routing. Changed the Helm command and guidance to `routingMode=native`, matching current Cilium Helm documentation.
- The Helm install included `--set nativeRoutingCIDR="10.0.0.0/8"`, which is not a current Cilium Helm chart value. Removed it and kept `ipv4NativeRoutingCIDR`, which is the documented value.
- The Cilium ConfigMap example used `tunnel: "disabled"`. Changed it to `routing-mode: "native"` and added `ipv4-native-routing-cidr` so the ConfigMap matches documented Cilium native-routing configuration.
- The NSX overlay text referred to VXLAN overhead. NSX-T/NSX overlay networking uses GENEVE, so the affected comments were corrected to reference GENEVE.
- The Hubble verification command ran `hubble observe` immediately after enabling Hubble. Added `cilium hubble port-forward &` so the local Hubble CLI has access to Hubble Relay before observing flows.

## Review Notes
The native-routing configuration assumes the Kubernetes nodes share L2 adjacency on the NSX-backed network, or that routes for pod CIDRs are otherwise available. The example CIDRs and MTU values remain illustrative and should be adjusted to match the actual cluster pod CIDR and NSX transport-network MTU.
