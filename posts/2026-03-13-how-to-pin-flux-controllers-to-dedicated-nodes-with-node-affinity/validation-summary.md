# Validation Summary: How to Pin Flux Controllers to Dedicated Nodes with Node Affinity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Kubernetes
- Kustomize
- kubectl
- Node affinity
- Taints and tolerations

## Sources Consulted
- Kubernetes documentation: Assigning Pods to Nodes, including `requiredDuringSchedulingIgnoredDuringExecution` and `preferredDuringSchedulingIgnoredDuringExecution`: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes kubectl reference: `kubectl taint`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Kubernetes kubectl reference: `kubectl label`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Flux documentation: GitOps Toolkit components: https://fluxcd.io/flux/components/
- Flux documentation: Optional components and default controllers: https://v2-6.docs.fluxcd.io/flux/installation/configuration/optional-components/

## Issues Found
- The post overstated the effect of node affinity by saying it guarantees consistent resource access and avoids noisy neighbors. Node affinity controls placement, but it does not itself reserve capacity or prevent all other workloads from running on those nodes. Updated the wording to "help ensure" consistent access and "reduce the impact" of noisy neighbors.
- The summary said node affinity eliminates resource contention and that taints and tolerations provide complete workload separation. Taints repel pods without matching tolerations, but other pods with matching or broad tolerations can still schedule there, and affinity does not reserve resources. Updated the wording to "reduces resource contention," "strict placement," and "stronger workload separation."

## Review Notes
- The Kubernetes affinity YAML uses valid `apps/v1` Deployment pod template fields and current node affinity field names.
- The `kubectl label`, `kubectl get ... -l`, `kubectl get pods -o wide`, and `kubectl taint` commands are consistent with the Kubernetes command references. The local environment did not have `kubectl` installed, so command validation was performed against official documentation.
- The reusable Kustomize patch pattern was checked with `npx kustomize build` using equivalent sample Deployments, and the patch applied correctly to multiple targeted Deployments.
