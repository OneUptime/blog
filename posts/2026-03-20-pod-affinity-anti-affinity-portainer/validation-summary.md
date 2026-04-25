# Validation Summary: Pod Affinity and Anti-Affinity in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Kubernetes scheduler
- Pod affinity and pod anti-affinity
- Topology spread constraints
- `kubectl`
- YAML manifests

## Sources Consulted
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: Node Labels Populated By The Kubelet - https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes documentation: `kubectl get` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: `kubectl describe` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Portainer documentation: Applications - https://docs.portainer.io/user/kubernetes/applications
- Portainer documentation: Create an application from a Manifest - https://docs.portainer.io/user/kubernetes/applications/manifest/create
- Portainer documentation: Edit an application - https://docs.portainer.io/user/kubernetes/applications/edit

## Issues Found
- The Portainer workflow in the post did not match current Portainer documentation. I updated the "Configuring via Portainer" and "Applying in Portainer" sections to use `Applications` -> `Create from code` -> `Manifest` -> `Web editor` for new applications, and to describe the documented edit paths for existing applications.
- The description after the hard anti-affinity example overstated the outcome. Hard anti-affinity on `kubernetes.io/hostname` prevents co-location, but if there are not enough eligible nodes some replicas remain `Pending`. I clarified that behavior.
- The topology key section implied that zone and region labels are always available. Kubernetes documents `topology.kubernetes.io/zone` and `topology.kubernetes.io/region` as preset labels only when the kubelet knows them, so I added that caveat.
- The troubleshooting label "Simulate scheduling" was inaccurate because `kubectl describe pod` inspects the current pod state and related events rather than simulating scheduler placement. I renamed that item.
- The opening affinity definitions were slightly too narrow and node-centric. I updated them to describe placement relative to a topology domain, which matches Kubernetes scheduling documentation.

## Review Notes
- The Kubernetes YAML snippets use current, non-deprecated fields such as `affinity`, `podAffinity`, `podAntiAffinity`, `topology.kubernetes.io/zone`, and `topologySpreadConstraints`.
- `kubectl get nodes --show-labels` and `kubectl describe pod <pod-name>` are valid current commands per the Kubernetes CLI reference.
- Kubernetes documents that `requiredDuringSchedulingIgnoredDuringExecution` pod anti-affinity is limited to `kubernetes.io/hostname` by the `LimitPodHardAntiAffinityTopology` admission controller unless that controller is changed or disabled. The post's use of hard anti-affinity at node scope and soft anti-affinity at zone scope is consistent with that guidance.
