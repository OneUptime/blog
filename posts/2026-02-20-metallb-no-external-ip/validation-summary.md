# Validation Summary: How to Troubleshoot MetalLB Service Not Getting an External IP

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes Services
- Kubernetes kubectl CLI
- MetalLB
- MetalLB IPAddressPool
- MetalLB L2Advertisement
- MetalLB BGPAdvertisement
- jq
- Bash

## Sources Consulted
- MetalLB Configuration documentation: https://metallb.io/configuration/
- MetalLB Troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB Advanced IPAddressPool configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB Installation documentation: https://metallb.io/installation/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The Step 6 introduction said an IPAddressPool or Advertisement may be restricted to certain namespaces or service labels. MetalLB namespace and service label allocation restrictions are configured under `IPAddressPool.spec.serviceAllocation`, not on L2Advertisement or BGPAdvertisement resources. Updated the sentence to refer only to IPAddressPool.
- The quick diagnostic script checked recent events only in the `metallb-system` namespace. MetalLB assignment and advertisement events are attached to Services, so they appear in the Service's namespace. Updated the command to query events across all namespaces and filter for MetalLB-related entries.

## Review Notes
- The MetalLB CRD examples use current `metallb.io/v1beta1` API versions for IPAddressPool, L2Advertisement, and BGPAdvertisement.
- The `kubectl get svc -A --field-selector spec.type=LoadBalancer` command is valid in current Kubernetes documentation, which lists `spec.type` as a supported Service field selector. Older Kubernetes clusters may not support that Service field selector.
- `kubectl` was not installed in the local environment, so CLI flags were verified against official Kubernetes documentation rather than local `kubectl --help` output.
