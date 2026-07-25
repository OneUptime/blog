# Kubernetes CDI DataVolume vs PVC: When Should KubeVirt Use Each?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, DataVolume, Storage

Description: Learn when KubeVirt should use a CDI DataVolume instead of a plain PersistentVolumeClaim, with practical lifecycle and troubleshooting guidance.

---

A PersistentVolumeClaim (PVC) asks Kubernetes for storage. A Containerized Data Importer (CDI) DataVolume asks for storage and describes how that storage should be populated. That distinction is the useful decision rule.

Use a DataVolume when a disk must be imported, uploaded, cloned, or initialized before a KubeVirt virtual machine starts. Use a plain PVC when the storage already contains the required data, another controller owns its population, or the claim is ordinary application storage rather than a managed VM image.

## What a DataVolume Adds

A DataVolume is a CDI custom resource layered over a PVC. CDI creates the underlying claim, orchestrates the required import, upload, or clone operation, and exposes progress through `status.phase`.

For example, this DataVolume imports a cloud image over HTTPS:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataVolume
metadata:
  name: ubuntu-boot
  namespace: vm-lab
spec:
  source:
    http:
      url: https://images.example.com/ubuntu-24.04.qcow2
  contentType: kubevirt
  storage:
    storageClassName: fast-rwo
    accessModes:
      - ReadWriteOnce
    volumeMode: Filesystem
    resources:
      requests:
        storage: 30Gi
```

CDI converts a qcow2 virtual disk to raw as needed and writes it to the target volume. On a filesystem-mode PVC, the resulting image is stored as `disk.img`. A DataVolume also gives KubeVirt a lifecycle signal: a VM that references a DataVolume template is held until population succeeds.

Inspect both layers when troubleshooting:

```bash
kubectl get datavolume,pvc -n vm-lab
kubectl describe datavolume ubuntu-boot -n vm-lab
kubectl get datavolume ubuntu-boot -n vm-lab \
  -o jsonpath='{.status.phase}{"\n"}'
```

The DataVolume and its PVC normally share a name, but they are different API objects with different status information.

## When a Plain PVC Is the Better Fit

A plain PVC is appropriate in these cases:

- A storage administrator provisioned and populated the volume outside CDI.
- A CSI volume populator or another trusted controller owns data population.
- The VM needs a persistent data disk that the guest will format itself.
- An existing PVC must have a lifecycle independent of a VM or DataVolume.
- The claim is shared with non-KubeVirt Pods and no CDI operation is required.

KubeVirt can attach an existing claim directly:

```yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: database-vm
  namespace: vm-lab
spec:
  runStrategy: Always
  template:
    metadata:
      labels:
        kubevirt.io/domain: database-vm
    spec:
      domain:
        resources:
          requests:
            memory: 4Gi
        devices:
          disks:
            - name: data
              disk:
                bus: virtio
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: database-data
```

KubeVirt cannot infer whether arbitrary data in that PVC is complete or bootable. If an external process is filling it, that process must provide its own readiness gate before the VM is started.

## Use a DataVolume Template for a Managed Boot Disk

For a boot image owned by a VM, place the DataVolume specification in `spec.dataVolumeTemplates` and reference it from the VM volume:

```yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: web-vm
  namespace: vm-lab
spec:
  runStrategy: Always
  dataVolumeTemplates:
    - metadata:
        name: web-vm-root
      spec:
        source:
          http:
            url: https://images.example.com/web-vm.qcow2
        storage:
          storageClassName: fast-rwo
          accessModes:
            - ReadWriteOnce
          volumeMode: Filesystem
          resources:
            requests:
              storage: 30Gi
  template:
    metadata:
      labels:
        kubevirt.io/domain: web-vm
    spec:
      domain:
        resources:
          requests:
            memory: 2Gi
        devices:
          disks:
            - name: root
              disk:
                bus: virtio
      volumes:
        - name: root
          dataVolume:
            name: web-vm-root
```

This creates a clear ownership chain and prevents the VM from consuming a partially imported image. Review deletion behavior before relying on that ownership for long-lived data. A disk that must survive VM replacement is often better managed as an independent DataVolume or PVC.

## Choose the API Deliberately

Prefer a DataVolume for declarative image workflows because CDI documents DataVolumes as its preferred API and KubeVirt integrates with their status. Prefer a PVC when you only need Kubernetes storage semantics.

Also distinguish `spec.storage` from the older PVC-shaped `spec.pvc` field on a DataVolume. Both create a PVC, but `storage` can use StorageProfile defaults and accounts for filesystem overhead. Explicitly set the storage class, access mode, and volume mode when portability matters.

Before production use, confirm:

```bash
kubectl api-resources | grep -E 'datavolume|storageprofile'
kubectl get storageclass
kubectl get storageprofile
```

The right abstraction is the one whose controller owns the full operation. If CDI owns disk population, a DataVolume makes that ownership and readiness observable. If CDI has no work to do, a PVC is simpler.

## Official Documentation

- [CDI DataVolumes](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [Containerized Data Importer overview](https://github.com/kubevirt/containerized-data-importer/blob/main/README.md)
- [KubeVirt disks and volumes](https://kubevirt.io/user-guide/storage/disks_and_volumes/)
- [Kubernetes persistent volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
