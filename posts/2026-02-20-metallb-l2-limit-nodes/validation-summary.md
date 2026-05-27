# Validation Summary: How to Limit L2 Advertisement to Specific Nodes in MetalLB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- MetalLB
- Layer 2 LoadBalancer advertisement
- MetalLB IPAddressPool and L2Advertisement custom resources
- Kubernetes labels and LabelSelector syntax
- kubectl

## Sources Consulted
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB advanced L2 configuration documentation: https://metallb.io/configuration/_advanced_l2_configuration
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/index.html
- MetalLB FAQ, ServiceL2Status verification: https://metallb.io/faq/
- MetalLB installation manifests and speaker labels: https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-native.yaml
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The VLAN failure example implied that a node on VLAN B would reply to an ARP request from VLAN A. Updated the wording to clarify that the elected node is responsible for announcing the service IP but cannot answer ARP on the client's Layer 2 segment when it is only reachable on the wrong VLAN.
- The speaker log command used `-l app=metallb-speaker`, which does not match the standard MetalLB speaker labels from the official manifest. Updated it to `-l app=metallb,component=speaker`.
- The verification section only described logs. Added the official `servicel2statuses` check because MetalLB documents this status resource as a way to see which node advertises a service in Layer 2 mode.
- The "forgetting to label nodes" mistake said the service would stay `<pending>` or get an unannounced IP. Since IP allocation is handled separately from Layer 2 advertisement, updated it to say the service can receive an IP that is not advertised and remains unreachable.

## Review Notes
The CRD examples use current MetalLB `metallb.io/v1beta1` APIs for `IPAddressPool` and `L2Advertisement`. The `nodeSelectors` examples are valid Kubernetes `LabelSelector` syntax, including `matchLabels` and `matchExpressions` with `In` and `DoesNotExist`.
