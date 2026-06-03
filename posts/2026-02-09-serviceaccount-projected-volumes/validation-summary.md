# Validation Summary: How to Configure ServiceAccount Projected Volumes with Custom Paths

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes projected volumes
- Kubernetes ServiceAccount token projection
- Kubernetes ConfigMaps and Secrets
- kubectl
- Go
- Python

## Sources Consulted
- Kubernetes projected volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes projected volume task guide: https://kubernetes.io/docs/tasks/configure-pod-container/configure-projected-volume-storage/
- Kubernetes ServiceAccounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Go io/ioutil package documentation: https://pkg.go.dev/io/ioutil

## Issues Found
- The Go example used `io/ioutil.ReadFile`, but the `io/ioutil` package has been deprecated since Go 1.16. Updated the example to use `os.ReadFile`.
- The multi-tenant section said each tenant gets "isolated credentials" in its own directory. A projected volume directory layout separates paths but does not enforce tenant isolation inside a single container. Changed this to "separate credential paths."
- The permissions guidance recommended `0400` or `0600` without noting that the container user must be able to read those files. Updated the sentence to include that condition.

## Review Notes
The Kubernetes projected volume examples use valid `projected.sources`, `serviceAccountToken.path`, `expirationSeconds`, `audience`, `configMap`, `secret`, `items`, `path`, `mode`, and `defaultMode` fields. The `expirationSeconds` values meet Kubernetes' documented minimum of 600 seconds. The kubectl troubleshooting commands use current command forms.
