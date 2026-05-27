# Validation Summary: How to Set IPAddressPool Priority for Allocation Order in MetalLB

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Kubernetes
- MetalLB
- IPAddressPool custom resources
- kubectl
- YAML

## Sources Consulted
- MetalLB API reference: https://metallb.io/apis/
- MetalLB Advanced AddressPool configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB Configuration documentation: https://metallb.io/configuration/
- MetalLB Troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB Release Notes, label selector guidance: https://metallb.io/release-notes/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- Corrected the equal-priority behavior. The post said MetalLB uses alphabetical pool names as a tiebreaker, but official MetalLB documentation says selection is random when multiple matching IPAddressPools have the same priority.
- Corrected the explanation for pools without `serviceAllocation`. Official MetalLB documentation states that unset priority, and priority set to `0`, have the lowest priority and are used only if prioritized pools cannot be used.
- Updated the MetalLB controller log selector from `component=controller` to the current `app.kubernetes.io/component=controller` label used with `app=metallb`.
- Updated the wrapping-up guidance to avoid referring to alphabetical name ordering.

## Review Notes
The `IPAddressPool` examples use the current `metallb.io/v1beta1` API and valid `serviceAllocation.priority` syntax. The recommended priority ranges are advisory conventions rather than MetalLB requirements.
