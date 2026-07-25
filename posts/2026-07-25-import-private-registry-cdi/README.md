# How to Import a VM Disk from a Private Container Registry with CDI Credentials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, Container Registry, Security

Description: Import a ContainerDisk from a private registry with CDI credentials, optional private CA trust, and the correct registry pull mode.

---

A CDI registry source imports a VM disk packaged as a ContainerDisk image. It does not copy an arbitrary application container filesystem into a VM disk. The container image must contain a supported disk image under `/disk`, and registry sources accept only the `kubevirt` content type.

For CDI's default `pod` pull method, reference endpoint credentials with `secretRef`. For `node` pull, the node container runtime performs the pull and CDI can use a ServiceAccount with standard Kubernetes image pull secrets. Keep these two credential mechanisms distinct.

## Validate the ContainerDisk Artifact

The registry image should contain one VM disk file under `/disk`. Pin production imports by digest where your publication workflow supports it:

```text
docker://registry.example.com/vm-images/rhel9@sha256:REPLACE_WITH_DIGEST
```

Inspect the image using approved registry tooling:

```bash
skopeo inspect \
  docker://registry.example.com/vm-images/rhel9:2026-07
```

Check architecture, digest, media types, and provenance. With the `pod` pull method, CDI extracts the ContainerDisk layers to scratch space, finds the disk, and converts it to raw for the target volume as needed. Node pull uses the node container runtime instead.

Do not use `contentType: archive`. Registry sources support `kubevirt`, and a tar archive is not a substitute for the ContainerDisk layout.

## Create CDI Endpoint Credentials

For the default pod pull method, CDI's endpoint Secret uses `accessKeyId` and `secretKey`. Create those values from protected files:

```bash
kubectl create secret generic private-registry-credentials \
  --namespace vm-images \
  --from-file=accessKeyId=./credentials/registry-user \
  --from-file=secretKey=./credentials/registry-password
```

The Secret must be in the same namespace as the DataVolume. Use a robot account scoped to pull only the required repository. Avoid printing or committing the Secret.

If the registry uses a private CA, create a separate ConfigMap:

```bash
kubectl create configmap private-registry-ca \
  --namespace vm-images \
  --from-file=registry-ca.pem=./registry-ca.pem
```

The key should end in `.crt` or `.pem`, and the value should contain the PEM trust chain.

## Create the Registry DataVolume

Use:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataVolume
metadata:
  name: rhel9-registry-disk
  namespace: vm-images
spec:
  source:
    registry:
      url: docker://registry.example.com/vm-images/rhel9@sha256:REPLACE_WITH_DIGEST
      secretRef: private-registry-credentials
      certConfigMap: private-registry-ca
      pullMethod: pod
  contentType: kubevirt
  storage:
    storageClassName: golden-images
    accessModes:
      - ReadWriteOnce
    volumeMode: Filesystem
    resources:
      requests:
        storage: 40Gi
```

Apply and monitor:

```bash
kubectl apply -f rhel9-registry-disk.yaml
kubectl get datavolume,pvc,pod -n vm-images -w
kubectl describe datavolume rhel9-registry-disk -n vm-images
```

Registry imports that use the `pod` pull method require scratch space. CDI requests a temporary `ReadWriteOnce`, `Filesystem` PVC sized for the DataVolume and removes it after successful processing. Check `CDIConfig.status.scratchSpaceStorageClass` and quota before importing large disks. The `node` pull path uses the node runtime and does not create that scratch PVC.

## Use Node Pull Only When It Fits the Platform

With node pull, the node's container runtime pulls the image. Current CDI supports setting `serviceAccountName` on the DataVolume, which is useful when that ServiceAccount carries Kubernetes `imagePullSecrets`:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cdi-registry-import
  namespace: vm-images
imagePullSecrets:
  - name: registry-dockerconfig
---
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataVolume
metadata:
  name: rhel9-node-pull
  namespace: vm-images
spec:
  serviceAccountName: cdi-registry-import
  source:
    registry:
      url: docker://registry.example.com/vm-images/rhel9:2026-07
      pullMethod: node
  contentType: kubevirt
  storage:
    storageClassName: golden-images
    accessModes:
      - ReadWriteOnce
    volumeMode: Filesystem
    resources:
      requests:
        storage: 40Gi
```

Create `registry-dockerconfig` using your platform's supported credential flow. A Secret referenced by `imagePullSecrets` is normally type `kubernetes.io/dockerconfigjson`; it is not the same schema as CDI's endpoint `secretRef`.

Node pull depends on runtime and node configuration. The pod method gives CDI direct endpoint control and is easier to combine with `secretRef` and `certConfigMap`.

## Select the Correct Architecture

For a multi-platform OCI index, current CDI supports a registry `platform.architecture` selector:

```yaml
source:
  registry:
    url: docker://registry.example.com/vm-images/rhel9:2026-07
    platform:
      architecture: amd64
```

With node pull, CDI adds a node selector matching the requested architecture. Still verify that the disk inside the chosen image contains an operating system for that architecture.

## Diagnose Failures

Inspect all three storage objects:

```bash
kubectl get datavolume,pvc,pod -n vm-images
kubectl get pvc -n vm-images
kubectl get events -n vm-images \
  --sort-by=.metadata.creationTimestamp
```

Common causes are:

- `unauthorized`: wrong credential mechanism, repository scope, or expired token
- unknown authority: incomplete `certConfigMap` or node-runtime trust for node pull
- manifest or architecture mismatch: wrong index variant
- no disk under `/disk`: invalid ContainerDisk packaging
- scratch PVC Pending or too small in pod mode: scratch class, quota, or capacity failure
- `ImagePullBackOff` in node mode: inspect ServiceAccount `imagePullSecrets` and node runtime events
- target too small: size for the disk's virtual size, not compressed layer size

Do not mark a registry globally insecure to work around a certificate error unless that exception is explicitly accepted by cluster security owners. A trusted CA is the safer fix.

## Official Documentation

- [CDI registry image imports](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/image-from-registry.md)
- [CDI registry source and content-type rules](https://github.com/kubevirt/containerized-data-importer/blob/main/README.md)
- [CDI DataVolume service accounts](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md#service-account)
- [Kubernetes private registry authentication](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/)
