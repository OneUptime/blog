# Validation Summary: How to Use Velero Restore Mapping to Change Namespaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Velero
- Velero Restore custom resources
- Velero restore CLI
- PersistentVolume and PersistentVolumeClaim storage class restore behavior
- Kubernetes ConfigMaps
- Kubernetes Services and DNS
- Bash
- Python subprocess automation

## Sources Consulted
- Velero Restore Reference v1.18: https://velero.io/docs/v1.18/restore-reference/
- Velero Restore API Type v1.18: https://velero.io/docs/v1.18/api-types/restore/
- Velero Resource Filtering documentation: https://velero.io/docs/main/resource-filtering/
- Velero Restore Hooks v1.18: https://velero.io/docs/v1.18/restore-hooks/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The post used a non-existent `--storage-class-mappings` flag on `velero restore create`. Velero documents storage class changes through a plugin configuration ConfigMap labeled `velero.io/plugin-config` and `velero.io/change-storage-class: RestoreItemAction`, so the storage class examples were updated to create and apply that ConfigMap before restore.
- The Restore custom resource examples used a non-existent `spec.storageClassMapping` field. The Velero Restore API documents `namespaceMapping` but not `storageClassMapping`, so those fields were removed and replaced with the documented ConfigMap-based approach where storage class mapping is needed.
- The "Using ConfigMaps for Complex Mappings" section actually showed a Restore manifest, not a ConfigMap. The heading and surrounding text were corrected to describe Restore manifests accurately.
- The post described a validation restore as a dry run, but the shown command creates a real restore. The comment was changed to "Test restore" and `--wait` was added so follow-up checks run after restore completion.
- The post showed a ConfigMap with `velero.io/restore-name` as a post-restore hook. Velero restore hooks are specified on pods or in `Restore.spec.hooks` and execute in restored pod containers, not from arbitrary ConfigMaps. The example was changed to a post-restore command sequence run after `velero restore create --wait`.
- The Python automation example generated the removed `--storage-class-mappings` CLI flag. It now applies a documented storage class mapping ConfigMap with `kubectl apply -f -` before creating the restore.
- The Python example imported `sys` without using it. The unused import was removed.

## Review Notes
- The namespace mapping examples are consistent with Velero's documented `--namespace-mappings` flag and `Restore.spec.namespaceMapping`.
- Storage class mapping via Velero's plugin ConfigMap is cluster-level Velero configuration in the Velero namespace, so operators should manage it carefully when running different restore scenarios concurrently.
- The service DNS and RBAC reference update examples are plausible remediation steps, but production use should prefer structured manifest patches or GitOps changes over broad `sed` transformations on exported YAML.
