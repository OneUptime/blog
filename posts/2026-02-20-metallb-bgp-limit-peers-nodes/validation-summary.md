# Validation Summary: How to Limit BGP Peers to Specific Nodes in MetalLB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- MetalLB
- BGP
- BGPPeer custom resources
- Kubernetes label selectors
- kubectl

## Sources Consulted
- MetalLB Advanced BGP configuration: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB API reference for `metallb.io/v1beta2` `BGPPeer`: https://metallb.io/apis/index.html
- MetalLB BGP concepts: https://metallb.io/concepts/bgp/
- MetalLB installation manifest labels for v0.15.3: https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-native.yaml
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes `kubectl label` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The architecture diagram and explanation used `edge=true`, but the actual commands and `BGPPeer` examples use `network-role=edge`. Updated the diagram labels and explanatory sentence to use `network-role=edge`.
- The comment above `nodeSelectors` said nodes must match all selectors. MetalLB's API reference says `BGPPeer.spec.nodeSelectors` connects on nodes that match one of the selectors, while Kubernetes label selector requirements within a single selector are ANDed together. Updated the comment to say nodes matching any selector in the list establish a session.

## Review Notes
The `BGPPeer` examples use the current `metallb.io/v1beta2` API, and the fields `myASN`, `peerASN`, `peerAddress`, and `nodeSelectors` are valid. The `matchLabels` and `matchExpressions` examples follow Kubernetes `LabelSelector` semantics. The `kubectl` label, apply, get, logs, delete, and label-removal command forms are valid, though live command verification was not possible because `kubectl` is not installed in this workspace.
