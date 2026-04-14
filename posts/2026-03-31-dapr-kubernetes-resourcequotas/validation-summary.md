# Validation Summary: How to Use Dapr with Kubernetes ResourceQuotas

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar injection and resource annotations)
- Kubernetes ResourceQuota
- kubectl CLI

## Sources Consulted
- Kubernetes official documentation on ResourceQuotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes API reference for ResourceQuota spec, including scopeSelector and matchExpressions
- Dapr documentation on sidecar annotations (dapr.io/sidecar-cpu-request, dapr.io/sidecar-memory-limit, etc.): https://docs.dapr.io/reference/arguments-annotations-overview/
- JSON Patch specification (RFC 6902) for kubectl patch --type=json syntax
- JSON Pointer specification (RFC 6901) for ~1 encoding of forward slashes in annotation paths

## Issues Found
- **Incorrect memory calculation**: In the "Accounting for Dapr Sidecars in Quota Planning" section, the total memory for 20 pods was stated as `3.84Gi`. The correct value is `3.75Gi` (20 pods × 192Mi = 3840Mi = 3840/1024 Gi = 3.75Gi). Fixed in place.

## Review Notes
- The ResourceQuota YAML uses `apiVersion: v1` which is correct; ResourceQuota is a core API resource.
- All resource field names (`requests.cpu`, `requests.memory`, `limits.cpu`, `limits.memory`, `pods`, `services`, `persistentvolumeclaims`) are valid quota resource names.
- The scoped ResourceQuota using `scopeSelector` with `PriorityClass` is valid Kubernetes syntax.
- The `kubectl patch` command correctly uses `~1` JSON Pointer encoding for the `/` in the Dapr annotation `dapr.io/sidecar-memory-limit`.
- The Dapr annotation `dapr.io/sidecar-memory-limit` is a valid annotation for controlling sidecar resource limits.
- Note: when a ResourceQuota is active in a namespace, all pods must specify resource requests/limits for the constrained resources, or they will be rejected. The post could mention this in a future revision, but it is not an error.
