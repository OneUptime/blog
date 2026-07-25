# Validation Summary: How to Import a VM Disk from a Private Container Registry with CDI Credentials

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes
- KubeVirt
- Containerized Data Importer (CDI)
- OCI and Docker container registries
- ContainerDisk images
- Kubernetes Secrets, ConfigMaps, ServiceAccounts, PersistentVolumeClaims, and DataVolumes
- `kubectl`
- `skopeo`

## Sources Consulted

- [CDI registry image imports](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/image-from-registry.md)
- [CDI registry source and content-type rules](https://github.com/kubevirt/containerized-data-importer/blob/main/README.md)
- [CDI scratch-space documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/scratch-space.md)
- [CDI DataVolume service accounts](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md#service-account)
- [CDI v1.65.0 DataVolume API types](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/staging/src/kubevirt.io/containerized-data-importer-api/pkg/apis/core/v1beta1/types.go)
- [CDI endpoint Secret example](https://github.com/kubevirt/containerized-data-importer/blob/main/manifests/example/endpoint-secret.yaml)
- [CDI v1.65.0 release notes](https://github.com/kubevirt/containerized-data-importer/releases/tag/v1.65.0)
- [KubeVirt ContainerDisk registry format](https://github.com/kubevirt/kubevirt/blob/main/docs/container-register-disks.md)
- [Kubernetes private registry authentication](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/)
- [Kubernetes ServiceAccount configuration](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)
- [Kubernetes `kubectl create secret generic` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/)
- [Kubernetes `kubectl create configmap` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/)
- [`skopeo inspect` reference](https://github.com/containers/skopeo/blob/main/docs/skopeo-inspect.1.md)

## Issues Found

- The post implied that `skopeo inspect` verifies image provenance. It reports registry and image metadata, including the digest, architecture, and layer media types, but does not verify signatures or attestations. The text now directs readers to verify provenance separately with approved signature or attestation tooling.
- The diagnostics section called a DataVolume, PVC, and Pod “three storage objects.” A Pod is a workload object, so the wording was changed to “related objects.”

## Review Notes

- The examples were validated against CDI v1.65.0 and current upstream documentation. The `spec.serviceAccountName` field is current in CDI v1.65.0; older CDI installations may not support it.
- The `platform.architecture` selector, `pod` and `node` pull methods, `accessKeyId`/`secretKey` endpoint Secret schema, `certConfigMap` filename requirements, and registry-only `kubevirt` content-type restriction are technically correct.
- The credential files passed to `kubectl --from-file` must contain the exact username and password values; unintended trailing newline characters become part of the Secret data and can cause authentication failures.
