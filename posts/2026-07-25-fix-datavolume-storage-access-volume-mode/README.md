# How to Fix “DataVolume.storage Spec Is Missing accessMode and volumeMode”

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, DataVolume, StorageProfile

Description: Fix CDI storage rendering errors by setting valid access and volume modes or correcting an incomplete StorageProfile safely.

---

This error means CDI received a DataVolume `spec.storage` request without enough information to render the underlying PVC. CDI tried to obtain the missing values from the StorageProfile associated with the chosen StorageClass, but that profile did not contain a usable `claimPropertySets` entry.

The fastest scoped fix is to set `accessModes` and `volumeMode` when creating the DataVolume. The broader administrative fix is to configure accurate defaults on the StorageProfile.

## Confirm the Actual Event

Inspect the DataVolume rather than relying on a UI summary:

```bash
kubectl describe datavolume vm-root -n vm-lab
kubectl get datavolume vm-root -n vm-lab -o yaml
kubectl get pvc vm-root -n vm-lab -o yaml
```

A typical event is:

```text
Warning  ErrClaimNotValid  datavolume-controller
DataVolume.storage spec is missing accessMode and cannot get access mode
from StorageProfile fast-storage
```

The DataVolume field is plural, `accessModes`, even when an event uses the singular term. Valid common values include `ReadWriteOnce`, `ReadWriteMany`, and `ReadOnlyMany`. `volumeMode` is `Filesystem` or `Block`.

Check the relevant objects:

```bash
kubectl get storageclass fast-storage -o yaml
kubectl get storageprofile fast-storage -o yaml
```

CDI creates one StorageProfile for each StorageClass. An unrecognized provisioner can result in a profile whose status has no `claimPropertySets`:

```yaml
status:
  storageClass: fast-storage
  provisioner: storage.example.com/csi
```

## Fix One DataVolume Explicitly

Specify a combination that the storage driver supports:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataVolume
metadata:
  name: vm-root
  namespace: vm-lab
spec:
  source:
    http:
      url: https://images.example.com/vm-root.qcow2
  storage:
    storageClassName: fast-storage
    accessModes:
      - ReadWriteOnce
    volumeMode: Filesystem
    resources:
      requests:
        storage: 30Gi
```

Apply it and follow events:

```bash
kubectl apply -f vm-root.yaml
kubectl get datavolume,pvc -n vm-lab -w
```

A DataVolume's `spec` is immutable after creation, so `kubectl apply` can create this corrected object but cannot add the modes to an existing DataVolume, even if no PVC was created. Do not delete a DataVolume or claim that contains valuable data just to change a mode. For a failed import with no useful data, create a new DataVolume name with the corrected specification and switch the VM only after the new import succeeds.

Verify the selected combination against the CSI driver and StorageClass. CDI cannot make a block-only backend provide filesystem volumes, or make a ReadWriteOnce backend support ReadWriteMany.

## Configure a StorageProfile Default

Cluster storage administrators can make future `spec.storage` requests concise by setting ordered claim property sets:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: StorageProfile
metadata:
  name: fast-storage
spec:
  claimPropertySets:
    - accessModes:
        - ReadWriteOnce
      volumeMode: Block
    - accessModes:
        - ReadWriteOnce
      volumeMode: Filesystem
```

Apply and wait for status to reflect the desired values:

```bash
kubectl apply -f fast-storage-profile.yaml
kubectl get storageprofile fast-storage -o yaml
```

Every supplied property set must contain both `accessModes` and `volumeMode`. The order expresses preference. Changing a StorageProfile affects future CDI rendering across the cluster, so test imports, clones, live migration requirements, and driver capabilities before making it a shared default.

If most workloads need filesystem mode, put that entry first:

```yaml
spec:
  claimPropertySets:
    - accessModes:
        - ReadWriteOnce
      volumeMode: Filesystem
```

## Check Default StorageClass Selection

The same symptom can occur when CDI cannot determine which profile to consult. Name the StorageClass explicitly or verify default annotations:

```bash
kubectl get storageclass \
  -o custom-columns=NAME:.metadata.name,DEFAULT:.metadata.annotations.storageclass\\.kubernetes\\.io/is-default-class,VIRT_DEFAULT:.metadata.annotations.storageclass\\.kubevirt\\.io/is-default-virt-class
```

For a DataVolume with the default `kubevirt` content type used here, omitting `storageClassName` makes CDI's `spec.storage` logic prioritize a default virtualization StorageClass, then the Kubernetes default. Multiple conflicting defaults make behavior harder to predict.

An explicit class is preferable in reusable manifests:

```yaml
storage:
  storageClassName: fast-storage
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
```

## Do Not Switch to `spec.pvc` as a Blind Workaround

A DataVolume can use either `spec.storage` or the older PVC-shaped `spec.pvc`. With `spec.pvc`, omitted `volumeMode` follows the Kubernetes default of `Filesystem`, but access modes still need valid PVC semantics. More importantly, `spec.storage` adds CDI conveniences such as StorageProfile rendering and filesystem-overhead sizing.

Keep `spec.storage` and provide the missing values unless you specifically need exact PVC request semantics:

```yaml
spec:
  pvc:
    storageClassName: fast-storage
    accessModes:
      - ReadWriteOnce
    volumeMode: Filesystem
    resources:
      requests:
        storage: 30Gi
```

Both forms ultimately create a PVC. They do not change what the underlying driver supports.

## Validate Before Retrying

Use server-side dry run to catch schema and admission errors without creating storage:

```bash
kubectl apply --server-side --dry-run=server -f vm-root.yaml
kubectl auth can-i get storageprofiles.cdi.kubevirt.io
```

Then verify that CDI rendered the intended PVC:

```bash
kubectl get pvc vm-root -n vm-lab \
  -o custom-columns=NAME:.metadata.name,CLASS:.spec.storageClassName,ACCESS:.spec.accessModes,MODE:.spec.volumeMode,STATUS:.status.phase
```

The durable fix is not merely to silence the event. It is to choose a storage combination that the provisioner supports and that matches the VM's access and migration requirements.

## Official Documentation

- [CDI StorageProfiles](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/storageprofile.md)
- [CDI DataVolume storage and PVC fields](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [Kubernetes persistent volume access modes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes)
- [Kubernetes volume modes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#volume-mode)
