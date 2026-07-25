# How to Use `dataVolumeTemplates` So a KubeVirt VM Waits for Its Boot Disk

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, DataVolume, Virtual Machine

Description: Define a VM-owned DataVolume template so KubeVirt creates, populates, and gates startup on a completed boot disk import.

---

A KubeVirt `VirtualMachine` can embed CDI DataVolume specifications in `spec.dataVolumeTemplates`. KubeVirt creates those DataVolumes and prevents the guest from starting until required population succeeds.

This closes a race that exists with a plain PVC: KubeVirt cannot know whether an external process has finished writing an arbitrary claim. A DataVolume exposes an explicit `Succeeded` phase that KubeVirt understands.

## Build a VM with an Imported Boot Disk

The DataVolume template name and the VM volume's `dataVolume.name` must match:

```yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: web-server
  namespace: vm-lab
spec:
  runStrategy: Always
  dataVolumeTemplates:
    - metadata:
        name: web-server-root
      spec:
        source:
          http:
            url: https://images.example.com/web-server.qcow2
        contentType: kubevirt
        storage:
          storageClassName: fast-rwo
          accessModes:
            - ReadWriteOnce
          volumeMode: Filesystem
          resources:
            requests:
              storage: 40Gi
  template:
    metadata:
      labels:
        kubevirt.io/domain: web-server
    spec:
      domain:
        resources:
          requests:
            memory: 4Gi
            cpu: "2"
        devices:
          disks:
            - name: root
              disk:
                bus: virtio
      volumes:
        - name: root
          dataVolume:
            name: web-server-root
```

The manifest assumes that CDI is installed, the `vm-lab` namespace and `fast-rwo` StorageClass already exist, and the example image URL has been replaced with a reachable boot image.

Apply the single manifest:

```bash
kubectl apply -f web-server.yaml
kubectl get vm,vmi,datavolume,pvc,pod -n vm-lab -w
```

With an immediately binding StorageClass, the expected control flow is:

```text
VirtualMachine created
DataVolume created from template
PVC created
CDI imports and converts image
DataVolume becomes Succeeded
VirtualMachineInstance is scheduled
guest boots from completed disk
```

Intermediate behavior varies with CDI and KubeVirt versions, storage topology, and `runStrategy`.

## Why `runStrategy` Still Matters

`dataVolumeTemplates` gates readiness; it does not replace VM start policy.

With:

```yaml
runStrategy: Always
```

KubeVirt intends to keep the VM running, but waits for the disk workflow. With:

```yaml
runStrategy: Manual
```

the DataVolume can be created and populated while the VM remains stopped until:

```bash
virtctl start web-server -n vm-lab
```

Choose the strategy based on rollout control. Manual start is useful when a separate acceptance check must run after import.

Do not set both legacy `running` and `runStrategy`.

## Handle WaitForFirstConsumer Correctly

A topology-aware StorageClass can put the DataVolume into `WaitForFirstConsumer`. This is expected when provisioning must consider the eventual VM's node placement.

KubeVirt handles this by creating the VMI and scheduling a temporary pod with the VM's placement constraints but no VM payload. This lets storage bind in a topology compatible with the eventual launcher; the guest still waits for population to complete. Keep VM node selectors and affinity in the template:

```yaml
template:
  spec:
    nodeSelector:
      workload.example.com/kubevirt: "true"
```

Do not force immediate binding merely to make the phase change. That can place a local or zonal boot disk where the VM cannot run.

Inspect:

```bash
kubectl describe datavolume web-server-root -n vm-lab
kubectl describe pvc web-server-root -n vm-lab
kubectl describe vm web-server -n vm-lab
```

## Add Cloud-Init as a Separate Volume

Keep guest initialization separate from the imported disk:

```yaml
domain:
  devices:
    disks:
      - name: root
        disk:
          bus: virtio
      - name: cloudinit
        disk:
          bus: virtio
volumes:
  - name: root
    dataVolume:
      name: web-server-root
  - name: cloudinit
    cloudInitNoCloud:
      userData: |
        #cloud-config
        users:
          - name: vmadmin
            ssh_authorized_keys:
              - REPLACE_WITH_PUBLIC_KEY
```

Use a Secret reference or another platform-supported mechanism for sensitive cloud-init data. Do not put passwords or private keys in a public repository.

## Diagnose a VM That Never Starts

Read both controllers' status:

```bash
kubectl get vm web-server -n vm-lab -o yaml
kubectl get datavolume web-server-root -n vm-lab -o yaml
kubectl get pvc web-server-root -n vm-lab -o yaml
kubectl get events -n vm-lab \
  --sort-by=.metadata.creationTimestamp
```

If the DataVolume is:

- `Pending`: inspect StorageClass, StorageProfile, quota, and PVC events.
- `WaitForFirstConsumer`: inspect VM scheduling constraints and volume topology.
- `ImportInProgress`: inspect importer logs and transfer throughput.
- `Failed`: fix endpoint, TLS, capacity, conversion, or worker-resource errors.
- `Succeeded`: move to VM and VMI scheduling, devices, networks, and image bootability.

A VM that has not launched while a required DataVolume is incomplete is the safety feature working as intended. With `WaitForFirstConsumer`, the VMI and a temporary provisioning pod can exist before the DataVolume reaches `Succeeded`.

## Understand Template Lifecycle

A `dataVolumeTemplate` is a template for creating a DataVolume, not a continuously synchronized object. Editing the source URL after a disk already exists does not safely replace that populated disk. For an image revision, use a new DataVolume name and a controlled VM rollout.

Review owner references:

```bash
kubectl get datavolume web-server-root -n vm-lab \
  -o jsonpath='{.metadata.ownerReferences}{"\n"}'
kubectl get pvc web-server-root -n vm-lab \
  -o jsonpath='{.metadata.ownerReferences}{"\n"}'
```

Do not assume a VM-owned boot disk will survive VM deletion. For data that must have an independent retention lifecycle, manage a standalone DataVolume or PVC and reference it from the VM.

## Use Templates for Reproducible VM Creation

Templates work well when each VM needs its own writable clone or import. For many VMs, avoid repeatedly downloading the same remote image. Maintain a golden image through a `DataImportCron` and let each VM template clone from the managed `DataSource`.

That separates image publication from VM rollout while preserving the DataVolume readiness gate.

## Official Documentation

- [CDI KubeVirt integration and DataVolume templates](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md#kubevirt-integration)
- [KubeVirt CDI user guide](https://kubevirt.io/user-guide/storage/containerized_data_importer/)
- [KubeVirt run strategies](https://kubevirt.io/user-guide/compute/run_strategies/)
- [KubeVirt disks and volumes](https://kubevirt.io/user-guide/storage/disks_and_volumes/)
