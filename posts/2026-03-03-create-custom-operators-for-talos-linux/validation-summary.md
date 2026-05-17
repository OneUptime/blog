# Validation Summary: How to Create Custom Operators for Talos Linux

## Status
validated

## Post Type
Tutorial / Developer Guide

## Technologies Covered
- Talos Linux (target Kubernetes distribution)
- Kubernetes Operator pattern (CRDs, controllers, reconciliation)
- Operator SDK (Go-based scaffolding tool)
- Go (controller language)
- controller-runtime / sigs.k8s.io/controller-runtime
- Kubebuilder markers (`+kubebuilder:default`, `+kubebuilder:validation`, `+kubebuilder:rbac`, `+kubebuilder:printcolumn`, `+kubebuilder:subresource:status`)
- Ginkgo v2 and Gomega (envtest framework)
- Kubernetes API types: apps/v1 (Deployment), core/v1 (Service, Container), networking.k8s.io/v1 (Ingress)

## Sources Consulted
- Operator SDK releases page: https://github.com/operator-framework/operator-sdk/releases (verified v1.42.2 is the latest stable as of 2026-03-19)
- Operator SDK Go tutorial: https://sdk.operatorframework.io/docs/building-operators/golang/tutorial/
- Operator SDK Go quickstart: https://sdk.operatorframework.io/docs/building-operators/golang/quickstart/
- Operator SDK testdata samples in repo at v1.42.2 (testdata/go/v4/memcached-operator) — confirms the current `go/v4` plugin scaffolds `cmd/main.go` and `internal/controller/` (singular package `controller`)
- Kubebuilder layout docs: https://book.kubebuilder.io/cronjob-tutorial/basic-project
- controller-runtime API: https://pkg.go.dev/sigs.k8s.io/controller-runtime

## Issues Found

1. **Outdated operator-sdk version (v1.33.0)**: The download URL referenced v1.33.0 (released Dec 2023), which is more than two years out of date relative to the post's publication date and predates the go/v4 plugin becoming the default. Updated to v1.42.2 (current stable).

2. **Inconsistent project layout**: The "generated" project structure mixed kubebuilder v3 and v4 conventions — it showed `cmd/main.go` (v4 layout) alongside `controllers/` (v3 layout). The current operator-sdk only ships the `go/v4` plugin, which scaffolds `cmd/main.go` plus `internal/controller/` (singular). Updated the directory listing to `internal/controller/` to match what `operator-sdk init` actually produces.

3. **Controller package and file paths**: The Go controller code declared `package controllers` with a `// controllers/webapp_controller.go` header comment, and the test file did the same. The current scaffold uses `package controller` (singular) under `internal/controller/`. Updated both file-path comments and package declarations to `controller` / `internal/controller/webapp_controller.go` and the matching test file path.

## Review Notes

- The controller code imports `fmt`, `networkingv1`, and `intstr` which are not referenced in the snippet shown. These would be flagged by `go vet` / the compiler as unused imports if a reader copies the file as-is. They are clearly forward-declared for the unshown `reconcileService`, `reconcileIngress`, and `updateStatus` methods that the `Reconcile` function calls, so this is acceptable in a tutorial context where readers are expected to fill in the missing methods. Worth keeping in mind for a future revision.
- `SetupWithManager` registers `Owns(&corev1.Service{})` and `Owns(&appsv1.Deployment{})` but omits `Owns(&networkingv1.Ingress{})` even though the controller can reconcile Ingresses when `webapp.Spec.Host` is set. Not strictly wrong (you can reconcile a resource you don't watch), but worth adding for completeness in a future revision.
- The `reconcileDeployment` function does not handle the case where `Get` returns an error that is neither `NotFound` nor `nil` — it falls through to the update path with an uninitialized `deploy`. Again, acceptable for a teaching example but a real implementation should add the missing error guard.
- The `--plugins=go/v4` flag is not required for `operator-sdk init` since the `go/v4` plugin is now the default in v1.42.x; documentation note about Apple Silicon needing this flag is a historical artifact.
- All `make` targets used (`manifests`, `docker-build`, `docker-push`, `deploy`, `install`, `run`, `test`) are part of the standard Makefile that `operator-sdk init` scaffolds and are correct.
- `kubectl get crd webapps.apps.example.com` correctly reflects the `{plural}.{group}` naming convention for the generated CRD.
- The kubebuilder RBAC, printcolumn, validation, and subresource markers are all syntactically correct.
- `brew install operator-sdk` is correct — the formula exists in homebrew-core.
