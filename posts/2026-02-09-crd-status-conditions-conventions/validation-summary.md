# Validation Summary: How to Implement CRD Status Conditions Following Kubernetes Conventions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes custom resource definitions
- Kubernetes status subresources
- Kubernetes status conditions
- Kubebuilder markers
- Go controller-runtime controllers
- Kubernetes apimachinery `metav1.Condition` and `api/meta` helpers
- `kubectl describe`

## Sources Consulted
- Kubernetes apimachinery `meta` package documentation: https://pkg.go.dev/k8s.io/apimachinery/pkg/api/meta
- Kubernetes apimachinery `metav1.Condition` documentation: https://pkg.go.dev/k8s.io/apimachinery/pkg/apis/meta/v1
- Kubebuilder CRD generation and status subresource documentation: https://book.kubebuilder.io/reference/generating-crd.html
- Kubernetes Server-Side Apply merge strategy markers for CRDs: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes Pod conditions documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-condition/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/

## Issues Found
- The CRD status example used `[]metav1.Condition` without list merge markers. Added `+listType=map` and `+listMapKey=type` so conditions merge by `type`, matching `metav1.Condition` guidance for CRD status conditions.
- The post described the listed condition names as standard and said most resources should have `Ready`. Adjusted the wording to "common" condition types and scoped `Ready` to long-running resources, which is more accurate for Kubernetes API conventions.
- The controller import block was incomplete for the identifiers used in the example. Added imports for `fmt`, `logr`, `appsv1`, `apierrors`, `runtime`, `ptr`, and the example API package.
- The reconciler struct used `runtime.Scheme` and later referenced `r.Log`, but the struct did not define a logger. Added a `Log logr.Logger` field.
- The Deployment lookup ignored non-NotFound errors. Added an error return for non-NotFound errors so the reconciler does not silently update stale status.
- The Deployment replica count example dereferenced `deployment.Spec.Replicas` directly. Replaced it with `ptr.Deref(deployment.Spec.Replicas, int32(1))` to avoid a nil pointer panic in examples or tests where defaulting may not have run.
- Some reconcile branches did not update all condition types, which could leave stale `Available` or `Degraded` conditions from earlier reconciles. Added condition updates in the missing branches.
- The checking-conditions snippet used `metav1.ConditionTrue` without importing `metav1`. Added the missing import.
- The health handler dereferenced the Ready condition even when it was missing. Added fallback reason and message values when the Ready condition is absent.
- The best-practices section incorrectly said updating conditions on every reconcile refreshes the timestamp. Corrected it to say `LastTransitionTime` changes when the condition status transitions, matching `meta.SetStatusCondition` and `metav1.Condition` documentation.

## Review Notes
The examples are illustrative snippets rather than a complete controller package. A future improvement would be to note that production reconcilers usually use patch-based status updates and handle status update conflicts, but the current examples are technically valid for explaining condition conventions.
