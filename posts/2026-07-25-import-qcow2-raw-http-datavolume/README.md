# How to Import a qcow2 or Raw VM Image into a KubeVirt DataVolume over HTTP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, DataVolume, HTTP

Description: Import qcow2 or raw VM disks over HTTP with CDI, size the target correctly, monitor conversion, and diagnose common server and storage failures.

---

CDI can populate a KubeVirt disk from an HTTP or HTTPS URL. The source may be raw or qcow2, optionally compressed with a supported compression format. With the default `kubevirt` content type, CDI detects the disk format, decompresses it when needed, converts qcow2 to raw, and expands the resulting virtual disk to the usable target size.

The target must fit the image's virtual size, not merely the downloaded file size. A 2 GiB qcow2 file can describe a 40 GiB disk.

## Inspect the Image Before Importing

Download metadata or inspect a trusted local copy:

```bash
qemu-img info --output=json ./server-image.qcow2
curl -I https://images.example.com/server-image.qcow2
```

Check `virtual-size`, the HTTP response status, `Content-Length`, redirect behavior, and whether the server supports `HEAD` and byte-range requests. CDI can handle several server behaviors, but some HTTP paths require scratch space when streaming is not possible.

Use HTTPS and publish a cryptographic checksum through a trusted channel. Recent CDI releases support the `checksum` field for HTTP and HTTPS sources. Confirm that the installed CRD contains that field before using it:

```bash
kubectl explain datavolume.spec.source.http.checksum
```

## Create the DataVolume

This manifest uses explicit storage choices so its result does not depend on cluster-wide StorageProfile defaults:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataVolume
metadata:
  name: server-image
  namespace: vm-images
spec:
  source:
    http:
      url: https://images.example.com/server-image.qcow2
      checksum: sha256:REPLACE_WITH_PUBLISHED_SHA256
  contentType: kubevirt
  storage:
    storageClassName: fast-rwo
    accessModes:
      - ReadWriteOnce
    volumeMode: Filesystem
    resources:
      requests:
        storage: 45Gi
```

Create the namespace if it does not already exist, then apply it:

```bash
kubectl create namespace vm-images
kubectl apply -f server-image-datavolume.yaml
kubectl get datavolume,pvc -n vm-images
kubectl get datavolume server-image -n vm-images -w
```

Replace the URL, checksum, class, and capacity with values appropriate for your environment. If the installed CDI version predates HTTP checksum support, remove that field and verify the artifact before publishing it.

For a raw source, only the URL changes:

```yaml
spec:
  source:
    http:
      url: https://images.example.com/server-image.raw.xz
  contentType: kubevirt
```

Do not set `contentType: archive` for qcow2, raw, or ISO images. `archive` means a tar archive whose files should be extracted into the volume. VM disk images use `kubevirt`.

## Understand the Import Phases

Typical phases include `Pending`, `ImportScheduled`, `ImportInProgress`, and `Succeeded`. A DataVolume can instead report `WaitForFirstConsumer` when its StorageClass delays binding for topology-aware scheduling.

Get the phase and conditions without guessing from the importer Pod alone:

```bash
kubectl get datavolume server-image -n vm-images \
  -o jsonpath='{.status.phase}{"\n"}'
kubectl describe datavolume server-image -n vm-images
kubectl describe pvc server-image -n vm-images
```

To find the CDI worker Pod:

```bash
kubectl get pods -n vm-images \
  -l cdi.kubevirt.io=importer \
  -o wide
```

If your CDI version uses different labels, list Pods and inspect their owners:

```bash
kubectl get pods -n vm-images --show-labels
kubectl get events -n vm-images --sort-by=.metadata.creationTimestamp
```

## Attach the Completed Disk to a VM

Reference the DataVolume by name:

```yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: imported-server
  namespace: vm-images
spec:
  runStrategy: Manual
  template:
    metadata:
      labels:
        kubevirt.io/domain: imported-server
    spec:
      domain:
        resources:
          requests:
            memory: 4Gi
        devices:
          disks:
            - name: root
              disk:
                bus: virtio
      volumes:
        - name: root
          dataVolume:
            name: server-image
```

With immediately bound storage, you can wait for `Succeeded` before starting the VM:

```bash
kubectl get datavolume server-image -n vm-images -w
virtctl start imported-server -n vm-images
```

KubeVirt gates VM startup until every referenced DataVolume is ready, including a separately created DataVolume. If the DataVolume reports `WaitForFirstConsumer`, start the VM while it is in that phase so KubeVirt can perform initial scheduling and trigger volume binding; KubeVirt then waits for the import to finish before launching the VM. `dataVolumeTemplates` additionally automate DataVolume creation and lifecycle when the DataVolume belongs to the VM.

## Diagnose Common Failures

For `404`, `403`, redirect, or TLS errors, test the URL from a network location equivalent to the cluster and inspect importer logs. HTTP basic authentication and custom CAs can be supplied with `secretRef` and `certConfigMap`, respectively; use `secretExtraHeaders` for sensitive credentials carried in HTTP headers. A successful browser download from your laptop does not prove the importer can reach the endpoint.

For `no space` or conversion failures, compare the qcow2 virtual size with the target's usable capacity. Filesystem metadata consumes part of a filesystem-mode PVC. `spec.storage` lets CDI inflate the claim for configured filesystem overhead, but storage backends can still differ.

For a Pending PVC, inspect the StorageClass:

```bash
kubectl get storageclass fast-rwo -o yaml
kubectl describe pvc server-image -n vm-images
```

If it uses `WaitForFirstConsumer`, let the intended VM drive topology selection. Force immediate binding only for topology-independent cases such as a deliberately placed golden image.

## Official Documentation

- [CDI DataVolume HTTP sources](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [CDI project overview and supported content](https://github.com/kubevirt/containerized-data-importer/blob/main/README.md)
- [KubeVirt CDI user guide](https://kubevirt.io/user-guide/storage/containerized_data_importer/)
- [Kubernetes StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/)
