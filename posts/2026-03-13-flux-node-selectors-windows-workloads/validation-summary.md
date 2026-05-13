# Validation Summary: How to Use Node Selectors for Windows Workloads with Flux

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes scheduling
- Kubernetes Windows containers
- Kubernetes node selectors, node labels, taints, and tolerations
- Kustomize components and patches
- Flux CD Kustomize controller
- Azure Kubernetes Service (AKS) node pools
- Kyverno validation policies
- GitHub Actions CI

## Sources Consulted
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Assign Pods to Nodes task - https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes/
- Kubernetes documentation: Node Labels Populated By The Kubelet - https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes documentation: Guide for Running Windows Containers in Kubernetes - https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes documentation: Windows containers in Kubernetes - https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes documentation: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Flux documentation: Kustomize Controller - https://fluxcd.io/flux/components/kustomize/
- Flux documentation: Kustomization components - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Microsoft Learn: Use labels in an Azure Kubernetes Service cluster - https://learn.microsoft.com/en-us/azure/aks/use-labels
- Microsoft Learn: Manage system node pools in Azure Kubernetes Service - https://learn.microsoft.com/en-us/azure/aks/use-system-pools
- Kyverno documentation: Validate Rules - https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno documentation: Selecting Resources - https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/

## Issues Found
- The introduction described the Kustomize example as using strategic merge patches, but the snippet uses an inline JSON patch under `patches`. Changed the wording to "Kustomize patches" so it accurately matches the example and Kustomize documentation.
- The deployment example did not include the `os: windows` labels needed by the later Kustomize `labelSelector: "os=windows"` and Kyverno selector. Added `metadata.labels.os: windows` to the Deployment and `spec.template.metadata.labels.os: windows` to the Pod template.
- The AKS node pool selector used `agentpool`, but Microsoft documents the AKS node pool label as `kubernetes.azure.com/agentpool`. Updated the label list, explanatory text, and AKS node selector example.
- The AKS GPU example described `accelerator: nvidia-gpu` as a hardware label. Changed the comment to identify it as a custom hardware label, since it is not a documented AKS default label.
- The Kyverno policy used the deprecated top-level `spec.validationFailureAction` and direct `match.resources` form. Updated it to use rule-level `validate.failureAction: Enforce` and `match.any[].resources`, matching current Kyverno guidance.

## Review Notes
- The post is technically valid after correction. The CI grep example is intentionally simple and may not catch every Kustomize-rendered edge case; a future improvement would be to validate rendered manifests from the relevant overlays.
- Flux supports Kustomize components, but Flux documentation notes that Kustomize components are experimental because they are an alpha Kustomize feature.
