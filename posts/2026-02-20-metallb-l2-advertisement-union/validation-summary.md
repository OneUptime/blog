# Validation Summary: How to Understand L2Advertisement Union Behavior for Multiple Advertisements

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- MetalLB
- MetalLB Layer 2 mode
- MetalLB `IPAddressPool` and `L2Advertisement` custom resources
- `kubectl`
- YAML

## Sources Consulted
- MetalLB API reference: https://metallb.io/apis/
- MetalLB Advanced L2 configuration documentation: https://metallb.io/configuration/_advanced_l2_configuration/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- Kubernetes kubectl output formatting documentation: https://kubernetes.io/docs/reference/kubectl/
- MetalLB upstream manifests for speaker labels: https://github.com/metallb/metallb/blob/main/config/manifests/metallb-native.yaml

## Issues Found
- The post described union behavior as causing the IP to be announced "from every node" selected by matching advertisements. In MetalLB Layer 2 mode, only one speaker node is elected to announce a given service IP; node selectors affect which nodes are eligible. Updated the explanation, diagram labels, node selector section, and wildcard guidance to distinguish eligible nodes from the single elected announcer.

## Review Notes
The YAML examples use current `metallb.io/v1beta1` `IPAddressPool` and `L2Advertisement` resources and valid fields. The `kubectl get ... -o custom-columns=...` command format is valid, and the upstream MetalLB speaker pods use the `app=metallb,component=speaker` labels referenced by the log command. MetalLB also supports `serviceSelectors` on `L2Advertisement`; the post does not cover that field, but it is not required for the topic.
