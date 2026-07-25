# Validation Summary: Why CDI Needs Scratch Space—and How to Choose Its StorageClass and Size

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes
- KubeVirt
- Containerized Data Importer (CDI) v1.65
- PersistentVolumeClaims and StorageClasses
- ResourceQuota and storage topology
- kubectl
- qemu-img and nbdkit

## Sources Consulted

- [CDI scratch-space behavior](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/scratch-space.md)
- [CDI configuration](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/cdi-config.md)
- [CDI DataVolume import sources](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [CDI registry import documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/image-from-registry.md)
- [CDI v1.65.0 release notes](https://github.com/kubevirt/containerized-data-importer/releases/tag/v1.65.0)
- [CDI v1.65 scratch PVC creation and sizing implementation](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/pkg/controller/util.go)
- [CDI v1.65 configuration reconciliation](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/pkg/controller/config-controller.go)
- [CDI v1.65 import controller scratch requirements](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/pkg/controller/import-controller.go)
- [CDI v1.65 upload controller](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/pkg/controller/upload-controller.go)
- [CDI v1.65 HTTP importer](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/pkg/importer/http-datasource.go)
- [Kubernetes StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [kubectl patch reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/)
- [kubectl JSONPath reference](https://kubernetes.io/docs/reference/kubectl/jsonpath/)

## Issues Found

- The post said every scratch PVC request equals the DataVolume size. CDI v1.65 calculates the request from the target PVC request and the configured filesystem overhead for both the target and scratch classes. The text now explains that requests are not guaranteed to match because of alignment rounding, different overhead values, or a block-mode target.
- The operations list reflected an older, narrower description of HTTP and upload behavior. CDI v1.65 provisions scratch for every upload, stages ordinary HTTP and HTTPS imports before conversion, and also requires scratch for archive and several source-specific paths. The list now distinguishes raw-upload handling, pod-pull registry imports, HTTP validation with nbdkit, and the additional scratch paths.
- The post said a blank scratch-class configuration could still put the system default into `CDIConfig.status.scratchSpaceStorageClass`. CDI v1.65 changed this behavior: a blank reconciled override makes the target PVC's StorageClass the scratch-class fallback. The selection description now states the v1.65 behavior and identifies the v1.64-and-earlier default-class behavior.
- The post stated that any scratch-requiring operation fails when no scratch StorageClass is available. A scratch PVC can also bind a suitable statically provisioned PV. The text now uses the accurate condition: the operation cannot complete until its scratch PVC binds.
- The PVC diagnostic command said it listed owners but did not output an owner field. An `OWNER` custom column was added, and the output expression was quoted so its array index is safe in shells such as zsh.
- The scratch test manifest used the `cdi-test` namespace without stating that it must already exist. The surrounding instruction now makes that prerequisite explicit.

## Review Notes

The upstream `main` versions of `doc/scratch-space.md` and `doc/cdi-config.md` still contain pre-v1.65 descriptions for parts of class selection and scratch behavior. The v1.65.0 release notes and tagged controller/importer implementation were used for the current-version corrections. The kubectl commands, JSON merge patch, JSONPath expressions, PVC manifest fields, access mode, volume mode, and linked URLs were otherwise valid.
