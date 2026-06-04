# Validation Summary: How to Build a Kubernetes Controller with the Controller-Runtime Library

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes controllers
- controller-runtime
- Kubebuilder controller patterns
- Go
- Kubernetes custom resources, status subresources, watches, predicates, finalizers, leader election, metrics, and health probes

## Sources Consulted
- controller-runtime root package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime
- controller-runtime builder package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/builder
- controller-runtime client package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/client
- controller-runtime controllerutil package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/controller/controllerutil
- controller-runtime handler package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/handler
- controller-runtime manager package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/manager
- controller-runtime reconcile package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/reconcile
- Kubebuilder Book status subresource documentation: https://book.kubebuilder.io/reference/generating-crd

## Issues Found
- The custom resource example used a plain `Application` struct without implementing `runtime.Object` or registering the type in a scheme. Added `ApplicationList`, `DeepCopyObject` implementations, and scheme registration helpers so the type can be used with controller-runtime clients and builders.
- The `ApplicationReconciler` called `r.Scheme()` even though only `client.Client` was embedded. Added a `Scheme *runtime.Scheme` field and used it when setting the controller reference.
- The deployment create/update logic tried to `Create` a new object and then `Update` the same object on `AlreadyExists`, which would not have the existing object's `resourceVersion`. Replaced it with `controllerutil.CreateOrUpdate`.
- The multi-resource watch example used the old `source.Kind{Type: ...}` style. Updated it to the current builder `Watches(&corev1.ConfigMap{}, &handler.EnqueueRequestForObject{})` form.
- The predicate example referenced `ctrl.Manager` without importing the controller-runtime root package. Added the missing import.
- The requeue example set both deprecated `Requeue` and `RequeueAfter`. Removed `Requeue` because current controller-runtime documentation marks it deprecated and says `RequeueAfter` implies a requeue.
- The manager options example used removed `MetricsBindAddress` and `Namespace` fields. Updated metrics configuration to `Metrics: server.Options{BindAddress: ":8080"}` and replaced the all-namespaces setting with a comment matching current default cache behavior.

## Review Notes
The post is now aligned with current controller-runtime APIs. In a real project, generated deepcopy code and API registration are normally produced by Kubebuilder/controller-gen rather than handwritten as shown in the compact example.
