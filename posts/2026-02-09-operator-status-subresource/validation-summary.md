# Validation Summary: Implementing and Using the Status Subresource in Kubernetes Custom Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes CustomResourceDefinitions
- Kubernetes status subresource
- Kubebuilder and controller-gen markers
- controller-runtime client APIs
- Kubernetes RBAC
- Go
- kubectl JSONPath and print columns

## Sources Consulted
- Kubernetes documentation, "Extend the Kubernetes API with CustomResourceDefinitions": https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes documentation, "Kubernetes API Concepts": https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubebuilder Book, "Generating CRDs": https://master.book.kubebuilder.io/reference/generating-crd.html
- Kubebuilder Book, "CRD Generation markers": https://master.book.kubebuilder.io/reference/markers/crd.html
- Kubebuilder Book, "Markers for config/code generation": https://book.kubebuilder.io/reference/markers.html
- controller-runtime client package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/client
- Kubernetes apimachinery meta package documentation: https://pkg.go.dev/k8s.io/apimachinery/pkg/api/meta
- Kubernetes apimachinery metav1 Condition documentation: https://pkg.go.dev/k8s.io/apimachinery/pkg/apis/meta/v1

## Issues Found
- The conflict-handling section incorrectly stated that the status subresource has its own resource-version tracking and eliminates conflicts between spec and status updates. Kubernetes uses `metadata.resourceVersion` for update conflict detection, so a stale object can still receive a 409 Conflict after spec, metadata, or status changes. Updated the section to explain that the subresource isolates written fields but does not provide separate resource-version tracking.
- The best-practices section described a `client.MergeFrom` example as server-side apply. `client.MergeFrom` creates a merge patch, not a server-side apply patch. Updated the text to describe the example as a merge patch and noted that CRDs should use merge patch rather than strategic merge patch.

## Review Notes
The remaining examples and claims align with official Kubernetes and Kubebuilder documentation: `+kubebuilder:subresource:status` enables the CRD status subresource, `/status` updates only the status stanza, root-resource writes ignore status changes, `make manifests` is the expected Kubebuilder generation target, `meta.SetStatusCondition` is current, and separate RBAC on `databases/status` is required for status updates.
