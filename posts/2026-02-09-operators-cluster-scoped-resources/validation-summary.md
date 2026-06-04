# Validation Summary: How to Build Kubernetes Operators That Handle Cluster-Scoped Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes CustomResourceDefinitions
- Kubernetes RBAC
- Kubernetes owner references and garbage collection
- Kubernetes finalizers
- Kubebuilder
- controller-runtime
- kubectl
- Go

## Sources Consulted
- Kubernetes CustomResourceDefinition API reference: https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes guide to extending the API with CustomResourceDefinitions: https://kubernetes.io/docs/tasks/access-kubernetes-api/extend-api-custom-resource-definitions/
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes RBAC API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/
- Kubernetes Owners and Dependents documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/
- Kubernetes Finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubebuilder CRD scope documentation: https://book.kubebuilder.io/reference/crd-scope.html
- controller-runtime controllerutil package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/controller/controllerutil
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found

1. **Missing Go import for NodeList**: Added the `k8s.io/api/core/v1` import as `corev1` in the full reconciler example because the snippet uses `corev1.NodeList`.

2. **Incorrect owner-reference rule**: The post incorrectly stated that cluster-scoped resources cannot own namespace-scoped resources. Kubernetes documentation says namespaced dependents can specify cluster-scoped owners. Updated the section to show a cluster-scoped custom resource owning a namespace-scoped Deployment as valid, and clarified the actual restrictions: namespace-scoped owners must be in the same namespace as their dependents, and cluster-scoped dependents can only have cluster-scoped owners.

3. **Finalizer added after deletion handling**: The finalizer example added a finalizer before checking `DeletionTimestamp`. Kubernetes disallows adding new finalizers after deletion has started. Reordered the example so deletion is handled first and new finalizers are added only to non-deleting resources.

## Review Notes
- The CRD `spec.scope: Cluster` example is correct for `apiextensions.k8s.io/v1`.
- The Kubebuilder `+kubebuilder:resource:scope=Cluster` marker is correct.
- The RBAC examples correctly use ClusterRoles and ClusterRoleBindings for cluster-scoped resources and cluster-wide access to namespace-scoped resources.
- The kubectl examples use valid command forms for applying, listing, describing, deleting, creating a ClusterRoleBinding, and running a pod with a service account.
