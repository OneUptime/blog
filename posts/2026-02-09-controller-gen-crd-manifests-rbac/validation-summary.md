# Validation Summary: How to Use controller-gen to Generate CRD Manifests and RBAC Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes CustomResourceDefinitions
- controller-gen / controller-tools
- Kubebuilder markers
- Kubernetes RBAC
- Kubernetes admission webhooks
- Go controller-runtime APIs

## Sources Consulted
- Kubebuilder Book: controller-gen CLI - https://book.kubebuilder.io/reference/controller-gen.html
- Kubebuilder Book: Markers for config/code generation - https://book.kubebuilder.io/reference/markers.html
- Kubebuilder Book: CRD generation markers - https://book.kubebuilder.io/reference/markers/crd.html
- Kubebuilder Book: CRD validation markers - https://book.kubebuilder.io/reference/markers/crd-validation.html
- Kubebuilder Book: RBAC markers - https://book.kubebuilder.io/reference/markers/rbac.html
- Kubebuilder Book: Webhook markers - https://book.kubebuilder.io/reference/markers/webhook.html
- Kubebuilder Book: Object/DeepCopy markers - https://book.kubebuilder.io/reference/markers/object
- controller-runtime admission package documentation - https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/webhook/admission

## Issues Found
- The introduction said controller-gen generates RBAC rules from the controller's API calls. controller-gen generates RBAC manifests from `+kubebuilder:rbac` markers, so the wording was corrected.
- The RBAC controller example used `context`, `runtime.Scheme`, and `client.Client` without importing the required packages. The missing imports were added.
- The webhook example used outdated `webhook.Defaulter` and `webhook.Validator` interfaces. It was updated to use the current generic `admission.Defaulter[*Application]` and `admission.Validator[*Application]` interfaces and their current method signatures.
- The Makefile used `$(CONTROLLER_GEN)` without defining it. A default `CONTROLLER_GEN ?= controller-gen` assignment was added.

## Review Notes
- `go` is not installed in this review environment, so commands could not be verified with local `controller-gen --help`; CLI flags and marker syntax were checked against the current Kubebuilder/controller-gen documentation instead.
- The post uses `go install ...@latest`, which is valid but less reproducible than pinning a controller-tools version in real projects.
