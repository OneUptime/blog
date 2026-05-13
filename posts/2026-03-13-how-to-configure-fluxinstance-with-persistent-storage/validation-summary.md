# Validation Summary: How to Configure FluxInstance with Persistent Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Flux Operator
- FluxInstance custom resources
- Kubernetes PersistentVolumeClaims
- Helm
- kubectl
- Prometheus Operator PrometheusRule

## Sources Consulted
- Flux Operator FluxInstance API documentation: https://fluxoperator.dev/docs/crd/fluxinstance/
- Flux Operator installation documentation: https://fluxoperator.dev/docs/guides/install/
- Flux Operator upstream source templates for persistent storage: https://github.com/controlplaneio-fluxcd/flux-operator
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post stated that `spec.storage.class` could be omitted and the cluster default StorageClass would be used. The Flux Operator API marks both `storage.class` and `storage.size` as required when `spec.storage` is configured, so the field description was corrected.
- The expected PVC name was shown as `flux-source-artifacts`. The Flux Operator documentation and templates create the PVC as `source-controller`, so the example PVC output and PrometheusRule label selector were corrected.
- The example pod mount output used the volume name `source-artifacts`. The Flux Operator template mounts the PVC at `/data` using the volume name `persistent-data`, so the mount example was corrected.
- The prerequisite described a StorageClass as supporting ReadWriteOnce access. Kubernetes access modes are requested on PVCs and fulfilled by matching/provisioned volumes, so this was clarified as a StorageClass that can provision ReadWriteOnce volumes.
- The introduction implied every Flux controller pod restart causes source artifact re-downloads. The behavior is specific to source-controller artifact storage, so the wording was narrowed to source-controller restarts.

## Review Notes
The sizing recommendations are reasonable operational guidance but are not formal Flux Operator defaults. Actual storage needs should be validated against the cluster's source artifact sizes and retention behavior.
