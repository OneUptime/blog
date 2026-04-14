# Validation Summary: How to Mount Volumes in Dapr Pods on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar injection, volume mount annotations)
- Kubernetes (Deployments, Secrets, ConfigMaps, PersistentVolumeClaims, emptyDir volumes)
- kubectl CLI

## Sources Consulted
- Dapr Kubernetes annotations reference: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-annotations/
- Dapr Kubernetes volume mounts documentation: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-volume-mounts/
- Kubernetes Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes Secrets as volumes: https://kubernetes.io/docs/concepts/configuration/secret/#using-secrets-as-files-from-a-pod
- Kubernetes ConfigMaps: https://kubernetes.io/docs/concepts/configuration/configmap/

## Issues Found
1. **Missing read-only vs read-write distinction for `dapr.io/volume-mounts`**: The post used `dapr.io/volume-mounts` without mentioning that this annotation mounts volumes as **read-only** in the daprd sidecar. The separate `dapr.io/volume-mounts-rw` annotation exists for read-write access. For a shared `emptyDir` volume where bi-directional file sharing may be the goal, this omission could mislead readers. **Fix:** Added clarification that `dapr.io/volume-mounts` is read-only and mentioned `dapr.io/volume-mounts-rw` as the read-write alternative, with a commented-out example in the YAML block.

## Review Notes
- The Deployment YAML in "Mounting a Secret as a Volume" omits `spec.selector` and `spec.replicas`, which are required/common for a full `apps/v1` Deployment. This is acceptable for a blog post focused on volume configuration, as it is clearly a partial snippet showing the relevant portions.
- All Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`, `dapr.io/volume-mounts`) use correct names and value formats.
- The daprd sidecar container name used in `kubectl exec -c daprd` is correct.
- All Kubernetes volume types (Secret with items projection, ConfigMap, emptyDir, PersistentVolumeClaim) use correct YAML syntax and field names.
