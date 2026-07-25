# Fix disk.img Not Enough Space Errors in CDI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, DataVolume, Storage

Description: Diagnose CDI disk.img capacity failures by comparing virtual image size, usable filesystem space, scratch claims, and overhead settings.

---

A PVC can be Bound at the requested capacity and still lack enough usable space for CDI's `disk.img`. On a filesystem-mode DataVolume, the filesystem consumes part of the volume. A qcow2 file's virtual size can also be far larger than its downloaded size. Scratch space introduces a second filesystem that can fail independently.

The fix starts by identifying which filesystem is full and sizing for the final raw virtual disk, not the source artifact's compressed bytes.

## Distinguish Target from Scratch Failure

Inspect the DataVolume, target PVC, all temporary claims, and importer or upload Pod:

```bash
kubectl describe datavolume vm-root -n vm-images
kubectl describe pvc vm-root -n vm-images
kubectl get pvc,pod -n vm-images -o wide
kubectl get events -n vm-images \
  --sort-by=.metadata.creationTimestamp
```

Find the worker:

```bash
kubectl get pods -n vm-images --show-labels
kubectl logs importer-vm-root -n vm-images \
  -c importer \
  --timestamps
```

Use the actual Pod and container names.

Paths or messages involving the final `disk.img` usually point to the filesystem-mode target. Messages mentioning scratch, temporary downloads, layer extraction, or conversion inputs can point to the scratch PVC.

Do not assume the PVC's `STATUS=Bound` proves sufficient capacity. Bound only means Kubernetes matched or provisioned the claim.

## Inspect qcow2 Virtual Size

Run:

```bash
qemu-img info --output=json ./vm-root.qcow2
```

Example:

```json
{
  "format": "qcow2",
  "virtual-size": 85899345920,
  "actual-size": 5368709120
}
```

This 5 GiB file represents an 80 GiB disk. CDI converts qcow2 to raw and needs capacity based on the 80 GiB virtual size. Creating a 10 GiB DataVolume because the download is 5 GiB must fail.

For a remote image, obtain signed build metadata or inspect a trusted downloaded copy. `Content-Length` is not virtual capacity.

## Understand Filesystem Overhead

CDI stores a filesystem-mode KubeVirt disk as `disk.img` at the volume root. Filesystem metadata and reserved blocks make usable space lower than nominal PVC capacity.

CDI exposes effective overhead:

```bash
kubectl get cdiconfig config \
  -o jsonpath='{.status.filesystemOverhead}{"\n"}'
```

The documented global default is 0.06, or 6 percent, unless a per-StorageClass value overrides it.

When a DataVolume uses `spec.storage`, CDI accounts for configured filesystem overhead while rendering the PVC:

```yaml
spec:
  storage:
    storageClassName: vm-storage
    accessModes:
      - ReadWriteOnce
    volumeMode: Filesystem
    resources:
      requests:
        storage: 90Gi
```

The older `spec.pvc` form follows direct PVC sizing semantics and does not provide the same convenience. Migrating a manifest from `storage` to `pvc` without revisiting capacity can expose an error.

## Compare Requested and Provisioned Capacity

Inspect:

```bash
kubectl get pvc vm-root -n vm-images \
  -o jsonpath='request={.spec.resources.requests.storage} capacity={.status.capacity.storage} mode={.spec.volumeMode}{"\n"}'
```

CSI provisioners can round capacity to allocation units or enforce a minimum size. Filesystem formatting options can change actual usable bytes. For small volumes, fixed metadata costs can be proportionally larger than a percentage model.

If policy permits a controlled diagnostic mount of an unused test claim, compare `df` output with the nominal claim. Never mount a PVC concurrently with a VM or CDI worker when its access mode and consistency model do not allow that.

## Check Scratch Capacity

CDI derives the scratch request from the target PVC's requested size and always uses `ReadWriteOnce`, `Filesystem`. Pod-pull registry imports, uploads, and some HTTP paths require it. Registry imports that use `pullMethod: node` do not create a scratch PVC.

Check the configured class:

```bash
kubectl get cdiconfig config \
  -o jsonpath='{.status.scratchSpaceStorageClass}{"\n"}'
kubectl get pvc -n vm-images
```

The scratch class can have a different filesystem overhead from the target class. CDI includes overhead-aware scratch sizing logic, but an inaccurate backend profile, quota, thin-provisioning exhaustion, or minimum allocation can still cause failure.

Describe the scratch claim and inspect backend capacity:

```bash
kubectl describe pvc SCRATCH_PVC_NAME -n vm-images
```

Do not delete it while the worker is active.

## Use the Safest Recovery

For a failed new import with no valuable target data, create a new, larger DataVolume:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataVolume
metadata:
  name: vm-root-v2
spec:
  source:
    http:
      url: https://images.example.com/vm-root.qcow2
  storage:
    storageClassName: vm-storage
    accessModes:
      - ReadWriteOnce
    volumeMode: Filesystem
    resources:
      requests:
        storage: 100Gi
```

Wait for `Succeeded`, validate the disk, and then update the VM reference. A new name avoids assuming that an immutable or partially populated claim can be safely retried.

PVC expansion may be possible when the StorageClass has:

```yaml
allowVolumeExpansion: true
```

Expansion behavior depends on storage driver support, filesystem resize rules, DataVolume state, and whether the worker retries. Do not patch a production claim until the storage provider's procedure and CDI recovery behavior are understood.

## Correct an Inaccurate Overhead Setting

If measured usable space consistently differs from CDI's configured value for one class, an administrator can set a per-class overhead:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: CDI
metadata:
  name: cdi
spec:
  config:
    filesystemOverhead:
      global: "0.06"
      storageClass:
        vm-storage: "0.10"
```

Manage the complete CDI configuration declaratively so an update does not discard unrelated settings. Values are fractions from 0 to 1.

Do not set overhead to zero merely to make the requested PVC look smaller. That reduces safety margin and can reproduce the `disk.img` error.

## Do Not Switch to Block Mode Blindly

Block mode has no target filesystem overhead, but it requires the storage backend or provisioner, KubeVirt, CDI, and CRI to support raw block volumes. It can change snapshot, clone, migration, and operational behavior. Scratch remains filesystem mode.

Choose block mode as an architectural storage decision:

```yaml
storage:
  volumeMode: Block
```

It is not a generic repair for an undersized image workflow.

## Prevent the Error

For every published image:

1. Record format, virtual size, architecture, and checksum.
2. Size for virtual capacity plus expected guest growth.
3. Use DataVolume `spec.storage` for overhead-aware rendering.
4. Validate target and scratch classes.
5. Include concurrent target and scratch claims in quota planning.
6. Run a complete import and boot test before broad rollout.

This turns a vague `disk.img` failure into a capacity value controlled by the image build and storage profiles.

## Official Documentation

- [CDI DataVolume storage and filesystem overhead](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md#storage)
- [CDI filesystemOverhead configuration](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/cdi-config.md)
- [CDI scratch-space sizing](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/scratch-space.md)
- [KubeVirt disks and volumes](https://kubevirt.io/user-guide/storage/disks_and_volumes/)
