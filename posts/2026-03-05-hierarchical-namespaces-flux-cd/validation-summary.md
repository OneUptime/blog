# Validation Summary: How to Use Hierarchical Namespaces with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Hierarchical Namespace Controller (HNC)
- Kustomize
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Kubernetes Secrets and ConfigMaps

## Sources Consulted
- HNC GitHub repository and user guide: https://github.com/kubernetes-retired/hierarchical-namespaces
- HNC v1.1.0 release notes and installation instructions: https://github.com/kubernetes-retired/hierarchical-namespaces/releases/tag/v1.1.0
- HNC quickstart documentation for propagation, subnamespaces, and exceptions: https://github.com/kubernetes-retired/hierarchical-namespaces/blob/master/docs/user-guide/quickstart.md
- HNC configuration CRD schema: https://github.com/kubernetes-retired/hierarchical-namespaces/blob/master/config/crd/bases/hnc.x-k8s.io_hncconfigurations.yaml
- HNC concepts documentation for propagation labels and annotations: https://github.com/kubernetes-retired/hierarchical-namespaces/blob/master/docs/user-guide/concepts.md
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes blog introduction to HNC: https://kubernetes.io/blog/2020/08/14/introducing-hierarchical-namespaces

## Issues Found
- The original HNC HelmRepository URL and `hnc-manager` chart example were not valid for the upstream HNC project. Replaced the HelmRepository/HelmRelease example with a Flux-managed Kustomize directory that vendors the official HNC v1.1.0 release manifest.
- The original `HNCConfiguration` attempted to configure RBAC Roles and RoleBindings. HNC preconfigures those resources for propagation and the CRD schema says user configuration of them is not allowed, so they were removed from the snippet.
- The `HNCConfiguration` used the network policy resource without an explicit API group. Added `group: networking.k8s.io` and `resource: networkpolicies` to match HNC's documented configuration pattern.
- The post described ResourceQuota propagation as quota inheritance. Updated the wording to refer to HNC HierarchicalResourceQuota support for aggregate subtree quotas and removed regular ResourceQuota propagation from the example.
- The application deployment step said `targetNamespace`, but the snippet used Kustomize's `namespace` field. Corrected the text to match the example.
- The post said applications automatically inherit image pull secrets. Clarified that secrets are propagated into child namespaces and can be used there; Kubernetes does not automatically use a Docker config secret unless the Pod or ServiceAccount references it.
- The propagation exception section referred to the `none` annotation while the example used `treeSelect`. Corrected the text to describe `treeSelect`.

## Review Notes
HNC's upstream repository was archived on April 17, 2025. The tutorial is still technically useful for existing HNC users, but future readers should evaluate whether an archived project is appropriate for new production deployments.
