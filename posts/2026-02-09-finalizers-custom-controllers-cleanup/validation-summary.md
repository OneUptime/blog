# Validation Summary: How to Use Finalizers in Custom Controllers for Cleanup Logic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes finalizers
- Kubernetes deletion lifecycle
- Kubernetes garbage collection and owner references
- Go
- controller-runtime custom controllers

## Sources Consulted
- Kubernetes documentation: Finalizers - https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes documentation: Garbage Collection - https://kubernetes.io/docs/concepts/workloads/controllers/garbage-collection/
- Kubernetes documentation: API Concepts - https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubebuilder Book: Using Finalizers - https://book.kubebuilder.io/reference/using-finalizers.html
- controller-runtime controllerutil package documentation - https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/controller/controllerutil

## Issues Found
- The introduction said Kubernetes removes Pods from etcd immediately when deleted. This was too broad because Pods have graceful termination behavior, and Kubernetes objects with finalizers are not removed until finalizers are cleared. Updated the opening to describe deletion processing more accurately.
- The first full Go snippet imported `metav1` but did not use it, and used `log.FromContext` without importing the controller-runtime `log` package. Removed the unused import and added the correct import.
- The first finalizer-addition snippet could attempt to add a finalizer after `deletionTimestamp` was already set. Kubernetes allows removing existing finalizers from objects pending deletion, but does not allow adding new finalizers after deletion has started. Added an early deletionTimestamp check before appending the finalizer.

## Review Notes
The remaining code examples are illustrative and assume surrounding project definitions such as `MyResource`, `Spec` fields, RBAC permissions, external deletion functions, and normal reconcile methods. In a production controller, controller-runtime's `controllerutil.ContainsFinalizer`, `controllerutil.AddFinalizer`, and `controllerutil.RemoveFinalizer` helpers are also available and reduce custom slice-manipulation code.
