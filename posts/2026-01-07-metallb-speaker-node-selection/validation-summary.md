# Validation Summary: How to Configure MetalLB Speaker Node Selection

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- MetalLB
- MetalLB Operator
- Kubernetes DaemonSets
- Kubernetes node selectors, node affinity, taints, and tolerations
- MetalLB IPAddressPool and L2Advertisement custom resources
- kubectl

## Sources Consulted
- MetalLB Operator README: https://github.com/metallb/metallb-operator
- MetalLB Operator CRD manifest: https://raw.githubusercontent.com/metallb/metallb-operator/main/bin/metallb-operator.yaml
- OKD MetalLB Operator documentation: https://docs.okd.io/4.15/networking/metallb/metallb-operator-install.html
- MetalLB installation documentation: https://metallb.universe.tf/installation/
- MetalLB advanced L2 configuration documentation: https://metallb.universe.tf/configuration/_advanced_l2_configuration/
- MetalLB API reference: https://metallb.universe.tf/apis/
- MetalLB Helm chart values: https://github.com/metallb/metallb/blob/main/charts/metallb/values.yaml
- Kubernetes node assignment documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/

## Issues Found
- The post used `kind: MetalLB` custom resources but the prerequisites only said "MetalLB installed." Updated this to "MetalLB Operator installed" because the `MetalLB` CR is provided by the MetalLB Operator, not by every supported MetalLB installation method.
- The basic `speakerConfig` example included `securityContext`, which is not a supported field in the MetalLB Operator `speakerConfig` schema. Removed that field.
- Several snippets placed speaker tolerations under `spec.speakerConfig.tolerations`. The MetalLB Operator schema uses top-level `spec.speakerTolerations` for speaker DaemonSet tolerations. Moved the toleration examples to `speakerTolerations`.
- The "Using Node Anti-Affinity" section actually used Kubernetes `nodeAffinity` with `NotIn` expressions, not pod anti-affinity. Renamed the section and wording to describe node affinity accurately.
- The troubleshooting command grepped for generic `tolerations`; updated it to check `speakerTolerations`, the correct MetalLB Operator field.

## Review Notes
The MetalLB L2Advertisement `nodeSelectors` example is valid and matches the official MetalLB API. The guide is Operator-specific after these fixes; a future improvement would be adding a separate Helm values example for clusters that install MetalLB with Helm rather than the Operator.
