# Validation Summary: How to Project Volumes from Secrets on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Projected Volumes (`projected` volume source)
- Kubernetes Secrets
- Kubernetes ConfigMaps
- Kubernetes Downward API (`fieldRef`, `resourceFieldRef`)
- Kubernetes ServiceAccount Token Projection
- Talos Linux (context platform)
- `kubectl` CLI

## Sources Consulted
- Kubernetes Projected Volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes API reference for `ProjectedVolumeSource`, `VolumeProjection`, `ServiceAccountTokenProjection`
- Kubernetes source code: `pkg/apis/core/validation/validation.go` — `validateProjectionSources` function
- ServiceAccount token volume projection details (kubelet rotation, audience, expirationSeconds bounds)

## Issues Found

**1. "Handling Conflicts" section — incorrect claim about behavior.**

The original text claimed: *"If two sources project files with the same path, the last source in the list wins."*

This is incorrect. Verified against the Kubernetes source code in `pkg/apis/core/validation/validation.go` (`validateProjectionSources`), which maintains an `allPaths` set across all projection sources and emits a `"conflicting duplicate paths"` validation error if any path is reused. The API server rejects the Pod at admission time — there is no "last one wins" runtime behavior because the Pod never reaches the kubelet.

**Fix applied:** Rewrote the section to state that the API server rejects the Pod with a `conflicting duplicate paths` validation error, and updated the inline YAML comment from "gets overwritten by this one" to "conflicts with this one".

## Review Notes

- **Supported sources list** — The post lists the four core/stable sources (`secret`, `configMap`, `downwardAPI`, `serviceAccountToken`). Two newer sources exist but are not core/stable: `clusterTrustBundle` (beta in v1.33, disabled by default) and `podCertificate`. The omission is reasonable for a stable-feature tutorial and was not corrected.
- **`defaultMode` default** — When unspecified, projected volume files default to `0644` (world-readable). The post's recommendation to set `defaultMode: 0400` for sensitive data is sound.
- **`expirationSeconds: 3600`** — Valid. Kubelet enforces a minimum of 600 seconds (10 minutes); the cluster `--service-account-max-token-expiration` sets the upper bound (default 1 hour).
- **`resourceFieldRef` with `containerName` and `resource: limits.cpu`** — Correct syntax for the volume form of the Downward API. `containerName` is required in volume context.
- **`metadata.labels` via `fieldRef`** — Valid for downwardAPI volumes (not env vars). Produces one `key="value"` pair per line.
- All YAML manifests (Secrets, ConfigMaps, Pods, Deployments) are syntactically valid and use current, non-deprecated `apiVersion` values (`v1`, `apps/v1`).
- All `kubectl` commands (`apply -f`, `exec`) use correct syntax.
- The Talos Linux framing is contextual — none of the projected-volume mechanics differ on Talos versus other Kubernetes distributions, which the post implicitly acknowledges.
