# Filesystem vs Block DataVolumes: Which `volumeMode` Works Best for KubeVirt?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, DataVolume, Storage

Description: Compare Filesystem and Block DataVolumes for KubeVirt, including performance, capacity, migration, clone, and runtime compatibility.

---

`volumeMode` controls how Kubernetes exposes a PersistentVolume. `Filesystem` mounts a filesystem, while `Block` presents a raw block device. CDI supports importing, uploading, and cloning KubeVirt disks to both modes when the storage driver and container runtime support them.

There is no universally best mode. Block removes a filesystem layer and can offer a more direct I/O path. Filesystem is widely supported and operationally familiar. Storage backend behavior, KubeVirt migration requirements, snapshot support, and measured workload performance matter more than a generic rule.

## How KubeVirt Uses Each Mode

For a filesystem-mode DataVolume, CDI writes a raw VM disk file named `disk.img` at the root of the mounted volume. KubeVirt opens that file as the guest disk.

For block mode, CDI and KubeVirt use the volume's block device directly. There is no target filesystem and no `disk.img` file.

The DataVolume forms differ only in storage mode:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataVolume
metadata:
  name: filesystem-root
  namespace: vm-lab
spec:
  source:
    http:
      url: https://images.example.com/server.qcow2
  storage:
    storageClassName: vm-storage
    accessModes:
      - ReadWriteOnce
    volumeMode: Filesystem
    resources:
      requests:
        storage: 40Gi
---
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataVolume
metadata:
  name: block-root
  namespace: vm-lab
spec:
  source:
    http:
      url: https://images.example.com/server.qcow2
  storage:
    storageClassName: vm-block
    accessModes:
      - ReadWriteOnce
    volumeMode: Block
    resources:
      requests:
        storage: 40Gi
```

Do not assume one StorageClass supports both. Check its CSI driver and CDI StorageProfile:

```bash
kubectl get storageclass vm-storage -o yaml
kubectl get storageprofile vm-storage -o yaml
```

## Why Block Can Be Attractive

Block mode has fewer host-side layers between QEMU and the storage device. CDI's StorageProfile documentation notes a preference for block mode for performance reasons when compatible capabilities exist.

Potential benefits include:

- no host filesystem metadata overhead on the target
- direct block semantics for storage designed around RBD or similar devices
- fewer host filesystem tuning variables
- good alignment with some CSI snapshot and clone implementations

These are potential benefits, not guarantees. QEMU cache settings, CSI implementation, backend replication, network latency, guest filesystem, I/O pattern, and queue configuration can dominate performance. Benchmark the actual storage path with a representative VM.

Block mode also places more requirements on the container runtime. CDI documents that some CRIs need configuration so rootless CDI worker Pods can use block-device ownership from the security context. A block PVC that attaches to a normal Pod is not proof that CDI conversion will have the required device permissions.

## Why Filesystem Is Often Simpler

Filesystem mode is a practical default when:

- the CSI driver primarily supports filesystem claims
- administrators need conventional mount-level diagnostics
- platform security policy is not configured for raw block devices
- snapshot and clone support is stronger for filesystem volumes
- operational tooling expects a file-backed KubeVirt disk

Its main capacity caveat is overhead. A nominal 40 GiB PVC does not provide a 40 GiB file because the filesystem consumes space. CDI's `spec.storage` API accounts for the configured `CDIConfig.filesystemOverhead` when it renders the PVC.

Inspect that configuration:

```bash
kubectl get cdiconfig config \
  -o jsonpath='{.status.filesystemOverhead}{"\n"}'
```

Using the older DataVolume `spec.pvc` shape requests PVC capacity directly and does not provide the same storage-API inflation behavior.

## Do Not Confuse Volume Mode with Access Mode

These are independent:

```yaml
accessModes:
  - ReadWriteOnce
volumeMode: Block
```

`ReadWriteOnce` means read-write use from one node, not one Pod. `ReadWriteMany` means multiple nodes can mount the claim when the driver supports it. Neither value says whether the claim is a filesystem or block device.

Live migration usually needs storage available to both the source and destination nodes, but a particular `ReadWriteMany` plus `Block` or `Filesystem` combination must be supported by the CSI driver and KubeVirt environment. Do not choose RWX based on its name alone.

List the StorageProfile's advertised combinations:

```bash
kubectl get storageprofile vm-storage \
  -o jsonpath='{.status.claimPropertySets}{"\n"}'
```

## Consider Cloning and Snapshots

CDI's efficient CSI and snapshot clone paths normally require source and target to use the same StorageClass and volume mode. Changing from block to filesystem, or the reverse, can force a host-assisted copy.

Before standardizing a mode, test:

```bash
kubectl get volumesnapshotclass
kubectl get storageprofile vm-storage -o yaml
```

Ask the storage vendor:

- Does the driver support CSI clone for this mode?
- Does it support snapshots and restores for this mode?
- Which access-mode combinations are supported?
- Can restored volumes be expanded?
- Are there topology limitations?

A mode with slightly better synthetic I/O but no efficient golden-image cloning may be slower for the complete operational workflow.

## Remember Scratch Space

Block target volumes do not eliminate every filesystem requirement. CDI scratch space is always a `ReadWriteOnce`, `Filesystem` PVC. Pod-pull registry imports, uploads, and some HTTP paths need scratch even when the target is block mode. Registry imports that use `pullMethod: node` follow a different path and do not create a scratch PVC.

Check:

```bash
kubectl get cdiconfig config \
  -o jsonpath='{.status.scratchSpaceStorageClass}{"\n"}'
```

The scratch StorageClass must therefore provision filesystem claims.

## Make a Measured Choice

Use this starting point:

- Choose Filesystem for maximum compatibility and straightforward operations.
- Choose Block when the CSI driver, CRI security configuration, clone workflow, and benchmarks show a benefit.
- Keep source and target modes consistent when efficient cloning matters.
- Set modes explicitly in portable manifests instead of relying on different cluster defaults.

Verify the rendered PVC:

```bash
kubectl get pvc block-root -n vm-lab \
  -o custom-columns=NAME:.metadata.name,CLASS:.spec.storageClassName,ACCESS:.spec.accessModes,MODE:.spec.volumeMode,STATUS:.status.phase
```

The best mode is the one validated across the full lifecycle: import, boot, snapshot, clone, migrate, expand, back up, and recover.

## Official Documentation

- [CDI DataVolume block mode](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md#block-volume-mode)
- [CDI StorageProfile preferences](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/storageprofile.md)
- [CDI block-device ownership configuration](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/block_cri_ownership_config.md)
- [Kubernetes raw block volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#raw-block-volume-support)
