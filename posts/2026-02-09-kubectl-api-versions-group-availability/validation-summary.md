# Validation Summary: How to Use kubectl api-versions to Check API Group Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API discovery
- kubectl
- Kubernetes CustomResourceDefinitions
- cert-manager
- Kubernetes API deprecation and migration
- Go client-go discovery API

## Sources Consulted
- Kubernetes kubectl api-versions reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-versions/
- Kubernetes kubectl api-resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes API groups reference: https://kubernetes.io/docs/reference/kubernetes-api/group-versions/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes APIGroup reference: https://kubernetes.io/docs/reference/kubernetes-api/definitions/api-group-v1-meta/
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- client-go discovery package documentation: https://pkg.go.dev/k8s.io/client-go/discovery

## Issues Found
- The specific API checks used unanchored `grep` patterns, which could falsely match versions such as `networking.k8s.io/v1beta1` when checking for `networking.k8s.io/v1`. Updated the checks to use exact-match anchored patterns.
- The Ingress compatibility script fell back to `networking.k8s.io/v1beta1`, which is no longer served in Kubernetes v1.22 and later. Changed the example to fail clearly when the stable Ingress API is unavailable.
- The deprecated Ingress API check only mentioned `extensions/v1beta1`. Updated it to check both removed Ingress beta APIs, `extensions/v1beta1` and `networking.k8s.io/v1beta1`.
- The cert-manager install example referenced v1.13.0. Updated it to the current static manifest version shown in official cert-manager installation documentation.
- The `kubectl version --short` command is not present in the current generated kubectl version reference. Changed the example to `kubectl version`.
- The autoscaling example showed `autoscaling/v2beta2`, which Kubernetes stopped serving as of v1.26. Updated the example to show current stable autoscaling API versions.
- The Go client-go snippet imported `context` and `metav1` without using them, which would not compile. Removed the unused imports.
- The preferred API version explanation stated that the preferred version is what the API server uses internally for storage. Corrected this to say that it is the API server's recommended version for clients and is usually, but not guaranteed to be, the storage version.

## Review Notes
The shell snippets are intentionally simple and work for the examples shown. For production-grade manifest validation, a YAML-aware parser would be more reliable than `grep` for multi-document manifests or indented `apiVersion` fields.
