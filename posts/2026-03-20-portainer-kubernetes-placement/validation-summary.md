# Validation Summary: How to Set Placement Preferences and Constraints in Portainer for Kubernetes (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- `kubectl`
- Kubernetes scheduling primitives: `nodeSelector`, node affinity, pod affinity, pod anti-affinity, topology spread constraints, taints, and tolerations

## Sources Consulted
- Portainer Documentation: Add a new application using a form — https://docs.portainer.io/2.27/user/kubernetes/applications/add
- Portainer Documentation: Add a new application using code — https://docs.portainer.io/2.27/user/kubernetes/applications/manifest
- Portainer Documentation: Edit an application — https://docs.portainer.io/user/kubernetes/applications/edit
- Portainer Documentation: Inspect an application — https://docs.portainer.io/sts/user/kubernetes/applications/inspect
- Kubernetes Documentation: Assigning Pods to Nodes — https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Documentation: Pod Topology Spread Constraints — https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes Documentation: Taints and Tolerations — https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes Documentation: `kubectl label` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes Documentation: `kubectl taint` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/

## Issues Found
- The "Combined with node affinity" YAML snippet placed `nodeAffinity` directly under `spec`. I corrected it to `spec.affinity.nodeAffinity`, which is the valid Pod schema.
- The post mixed a custom `zone` label with the standard `topology.kubernetes.io/zone` key used later in anti-affinity and topology spread examples. I standardized the examples on `topology.kubernetes.io/zone` so the guidance is internally consistent.
- The Portainer instructions referred generically to "Placement" and "YAML mode" and implied direct node-selector wording in the form. I updated this to Portainer's documented `Placement preferences and constraints`, `Mandatory` / `Preferred` node-label rules, and `Create from code` / YAML-tab workflow.
- The taints section comment implied one exact toleration object was required. I clarified that pods need a matching toleration to schedule onto the tainted node.
- The topology spread section wording now reflects that the feature is generally available in Kubernetes 1.19 and later.

## Review Notes
- The examples assume nodes are labeled consistently for the topology keys they use, especially `kubernetes.io/hostname` and `topology.kubernetes.io/zone`.
- Portainer documents direct YAML editing for Kubernetes applications as a Business Edition capability, while deploying advanced manifests through `Create from code` is the general path.
