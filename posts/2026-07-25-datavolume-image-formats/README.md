# Raw vs qcow2 vs ISO: Choosing a DataVolume Image Format

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, qcow2, VM Images

Description: Choose raw, qcow2, or ISO sources for CDI, set the correct contentType, and size DataVolumes for conversion and filesystem overhead.

---

Raw, qcow2, and ISO describe the source image format. CDI's `contentType` describes how CDI should treat that source. All three VM image formats normally use `contentType: kubevirt`, which is also the default.

`contentType: archive` has a different meaning: CDI extracts a tar archive into a filesystem volume. It is not the right setting for a qcow2 file, a raw disk, an ISO, or a compressed VM disk.

## The Short Decision Table

| Source | Best use | CDI behavior | Main sizing risk |
| --- | --- | --- | --- |
| qcow2 | Efficient image distribution | Detects and converts to raw | Compressed file size hides virtual size |
| raw | Predictable disk bytes and simple conversion path | Writes raw disk data | Large transfer unless externally compressed |
| ISO | Installer or live boot media | Treats it like raw content | Attach as optical media when that is the intent |

CDI supports raw and qcow2 disk images and treats bootable ISO images as raw. Supported VM images may also be transported in supported compression formats such as gzip or xz.

## Choose qcow2 for Distribution Efficiency

qcow2 is sparse and can be much smaller than its virtual capacity. It is convenient for publishing cloud images:

```bash
qemu-img info --output=json ./ubuntu.qcow2
```

Relevant values are:

```json
{
  "format": "qcow2",
  "virtual-size": 42949672960,
  "actual-size": 2361393152
}
```

The 2.2 GiB artifact represents a 40 GiB virtual disk. Size the DataVolume for at least the virtual size plus applicable filesystem overhead. CDI converts qcow2 to raw for KubeVirt storage and grows the image to usable target capacity.

Example:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataVolume
metadata:
  name: ubuntu-root
  namespace: vm-images
spec:
  source:
    http:
      url: https://images.example.com/ubuntu.qcow2
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

Do not distribute qcow2 images with external backing-file dependencies. The published image must be self-contained and should come from a trusted build pipeline.

## Choose Raw for Predictable Layout

A raw image is a direct byte representation of the virtual disk. It avoids qcow2-to-raw conversion, but a sparse raw file can expand during ordinary transport if the protocol or tool does not preserve holes.

Inspect it:

```bash
qemu-img info --output=json ./appliance.raw
du -h ./appliance.raw
du -h --apparent-size ./appliance.raw
```

For HTTP distribution, external compression can reduce network transfer:

```text
https://images.example.com/appliance.raw.xz
```

The DataVolume still uses `kubevirt`:

```yaml
spec:
  source:
    http:
      url: https://images.example.com/appliance.raw.xz
  contentType: kubevirt
```

Do not confuse a compressed raw image with `contentType: archive`. Compression is a transport encoding CDI recognizes for a VM disk; archive content tells CDI to extract a tar filesystem payload.

## Choose ISO for Optical Boot Media

CDI treats a bootable ISO as raw image data. Import it with `contentType: kubevirt`:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataVolume
metadata:
  name: installer-iso
  namespace: vm-lab
spec:
  source:
    http:
      url: https://images.example.com/os-installer.iso
  contentType: kubevirt
  storage:
    storageClassName: standard
    accessModes:
      - ReadWriteOnce
    volumeMode: Filesystem
    resources:
      requests:
        storage: 8Gi
```

Attach installation media as a CD-ROM in KubeVirt:

```yaml
domain:
  devices:
    disks:
      - name: installer
        cdrom:
          bus: sata
          readonly: true
volumes:
  - name: installer
    dataVolume:
      name: installer-iso
```

An ISO is usually read-only installation media, not a writable root disk. Provide a separate blank or cloned DataVolume for the installed system.

## Understand `kubevirt` Versus `archive`

The default `kubevirt` content type tells CDI to:

- treat the source as a VM disk
- detect supported image and compression formats
- convert qcow2 to raw when necessary
- write the VM disk in the layout KubeVirt expects
- resize the virtual disk to usable target capacity

`archive` tells CDI to extract a tar payload into the volume. It is useful when a Pod or KubeVirt filesystem feature needs a populated filesystem tree:

```yaml
spec:
  source:
    http:
      url: https://artifacts.example.com/root-files.tar
  contentType: archive
```

Registry sources accept only `kubevirt` and require a ContainerDisk image. A generic OCI image layer archive is not an `archive` DataVolume source.

## Size for the Final Representation

For a filesystem-mode target, available bytes are less than nominal PVC capacity because of filesystem metadata and reserved overhead. CDI's `spec.storage` API accounts for configured filesystem overhead when rendering a PVC. The older `spec.pvc` shape uses direct PVC sizing semantics.

Check the cluster value:

```bash
kubectl get cdiconfig config \
  -o jsonpath='{.status.filesystemOverhead}{"\n"}'
```

For block mode, there is no target filesystem overhead, but scratch operations can still need a separate filesystem-mode PVC.

Never size from:

- the browser's downloaded byte count
- `ls -lh` alone on a sparse file
- the compressed registry layer size
- an ISO's current size if the same volume will later hold an installed OS

Use `qemu-img info`, image build metadata, and a deliberate growth margin.

## Verify the Result

Monitor CDI:

```bash
kubectl get datavolume ubuntu-root -n vm-images -w
kubectl describe datavolume ubuntu-root -n vm-images
```

For filesystem-mode volumes, CDI stores the KubeVirt disk as `disk.img` at the volume root. Do not mount and modify that file while a VM or CDI operation is using it.

## Official Documentation

- [CDI content types and conversion](https://github.com/kubevirt/containerized-data-importer/blob/main/README.md#content-types)
- [KubeVirt supported CDI image formats](https://kubevirt.io/user-guide/storage/containerized_data_importer/#supported-image-formats)
- [CDI DataVolume target storage](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [KubeVirt disks and volumes](https://kubevirt.io/user-guide/storage/disks_and_volumes/)
