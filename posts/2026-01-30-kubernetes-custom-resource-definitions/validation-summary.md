# Validation Summary: How to Create Kubernetes Custom Resource Definitions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes CustomResourceDefinitions
- Kubernetes OpenAPI v3 schema validation
- Kubernetes CRD status and scale subresources
- Kubernetes CRD versioning and conversion webhooks
- kubectl
- Go HTTP webhook implementation

## Sources Consulted
- Kubernetes documentation: Extend the Kubernetes API with CustomResourceDefinitions: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes documentation: Versions in CustomResourceDefinitions: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- Replaced `kubectl version --short` with `kubectl version`. The current Kubernetes CRD documentation uses `kubectl version`, and `--short` has been deprecated/removed in newer kubectl releases.
- Corrected the status subresource comparison table. The post incorrectly said spec and status have separate `resourceVersion` values. A status subresource provides a separate `/status` endpoint and separate RBAC target, but status remains part of the same Kubernetes object.
- Fixed the Go conversion webhook snippet so it can compile: removed the unused `fmt` import and added the missing `k8s.io/apimachinery/pkg/runtime` import used by `runtime.RawExtension`.

## Review Notes
The CRD examples use `apiextensions.k8s.io/v1`, which is appropriate for Kubernetes 1.16 and later. Local command validation was limited because `kubectl` and Go were not installed in this workspace, so CLI and compilation checks were reviewed against official Kubernetes documentation instead.
