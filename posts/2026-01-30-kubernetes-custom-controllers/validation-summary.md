# Validation Summary: How to Build Custom Kubernetes Controllers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes custom resources and controllers
- controller-runtime v0.17.0
- Kubernetes Go API packages v0.29.0
- Kubebuilder CRD markers
- Go
- envtest
- Kubernetes RBAC
- Docker

## Sources Consulted
- controller-runtime package overview and compatibility table: https://pkg.go.dev/sigs.k8s.io/controller-runtime
- controller-runtime v0.17.0 builder source for `For`, `Owns`, `Watches`, `WithOptions`, and `WithPredicates`: https://raw.githubusercontent.com/kubernetes-sigs/controller-runtime/v0.17.0/pkg/builder/controller.go
- controller-runtime v0.17.0 builder options source: https://raw.githubusercontent.com/kubernetes-sigs/controller-runtime/v0.17.0/pkg/builder/options.go
- controller-runtime v0.17.0 controller options source: https://raw.githubusercontent.com/kubernetes-sigs/controller-runtime/v0.17.0/pkg/controller/controller.go
- controller-runtime v0.17.0 fake client source for status subresource behavior: https://raw.githubusercontent.com/kubernetes-sigs/controller-runtime/v0.17.0/pkg/client/fake/client.go
- controller-runtime v0.17.0 map handler source: https://raw.githubusercontent.com/kubernetes-sigs/controller-runtime/v0.17.0/pkg/handler/enqueue_mapped.go
- controller-runtime v0.17.0 predicate source: https://raw.githubusercontent.com/kubernetes-sigs/controller-runtime/v0.17.0/pkg/predicate/predicate.go
- Kubebuilder CRD generation and status subresource documentation: https://book.kubebuilder.io/reference/generating-crd.html
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes owners and dependents documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/
- Kubernetes finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes `intstr` Go package documentation: https://pkg.go.dev/k8s.io/apimachinery/pkg/util/intstr
- Kubernetes `ptr` Go package documentation: https://pkg.go.dev/k8s.io/utils/ptr

## Issues Found
- The setup commands omitted the direct `k8s.io/api` dependency even though the controller imports `k8s.io/api/apps/v1` and `k8s.io/api/core/v1`. Added `go get k8s.io/api@v0.29.0`.
- The custom resource type snippet referenced `SchemeBuilder` and `AddToScheme` without defining the group version or scheme builder. Added the minimal `GroupVersion`, `SchemeBuilder`, and `AddToScheme` definitions.
- The controller file used APIs from several packages that were not imported, including `resource`, `intstr`, `workqueue`, `ptr`, `builder`, `apiutil`, `controller`, `handler`, and `predicate`. Added the missing imports.
- The code used deprecated `intstr.FromInt`. Replaced it with `intstr.FromInt32`, which is available for the Kubernetes v0.29 dependency line used in the post.
- The manual owner-reference example used the older pointer helper style. Updated it to `k8s.io/utils/ptr.To(true)`.
- The Service reconciliation section incorrectly said Services are generally immutable and skipped updates for port changes. Updated the reconciler to update selector and port fields while preserving existing immutable/defaulted Service fields.
- The primary resource watch did not filter status-only updates, while the reconciler updates `lastReconcileTime` on every run. Added `builder.WithPredicates(predicate.GenerationChangedPredicate{})` to the primary `For` watch and clarified the infinite-loop pitfall.
- The fake-client unit test called `Status().Update` through the reconciler without registering the custom resource as having a status subresource. Added `WithStatusSubresource(webapp)`.
- The envtest snippet used `appsv1`, `metav1`, and `types` without importing them. Added the missing imports.

## Review Notes
The examples are still illustrative rather than a complete generated Kubebuilder project; a real project would also include generated deepcopy code, CRD manifests, Makefile targets, and deployment manifests. I could not compile the snippets locally because the workspace does not have the `go` binary installed.
