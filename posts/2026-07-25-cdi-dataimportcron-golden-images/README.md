# How to Refresh Golden VM Images Automatically with CDI `DataImportCron`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, DataImportCron, Golden Images

Description: Poll a registry image with DataImportCron, publish the latest successful source through a DataSource, and retain controlled history.

---

CDI `DataImportCron` automates polling and importing an operating-system image. On the first scheduled import it creates a managed source. On later polls, a changed source digest triggers a new import, and CDI updates a managed `DataSource` to point to the new successful source.

Existing VM disks do not change in place. New DataVolumes that reference the managed DataSource resolve to the current source. That separation avoids silently changing a running VM's root disk.

## Create a Dedicated Image Namespace

Golden images are supply-chain assets. Keep them in a protected namespace:

```bash
kubectl create namespace golden-images
```

Limit who can update `DataImportCron`, `DataSource`, Secrets, and StorageProfiles there. Consumers can receive narrow cross-namespace clone permission rather than write access to the catalog.

## Define the DataImportCron

This example polls a ContainerDisk registry source every Monday:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataImportCron
metadata:
  name: fedora-golden
  namespace: golden-images
spec:
  schedule: "30 1 * * 1"
  managedDataSource: fedora
  garbageCollect: Outdated
  importsToKeep: 3
  template:
    spec:
      source:
        registry:
          url: docker://quay.io/containerdisks/fedora:latest
      contentType: kubevirt
      storage:
        storageClassName: golden-rwo
        accessModes:
          - ReadWriteOnce
        volumeMode: Filesystem
        resources:
          requests:
            storage: 40Gi
```

Apply it:

```bash
kubectl apply -f fedora-golden.yaml
kubectl get dataimportcron,datasource -n golden-images
kubectl describe dataimportcron fedora-golden -n golden-images
```

The registry source must be a valid ContainerDisk and uses `contentType: kubevirt`. For a private registry, use the supported credential and CA fields in the template.

Confirm how your installed CDI controller interprets schedule time and operationalize the cron expression in that context. Avoid putting many large imports on the same minute.

## Understand Digest-Based Updates

CDI polls the source and compares its digest. When the digest changes, it imports a new source and moves the managed DataSource pointer after successful processing.

This means a mutable tag such as `latest` can be polled safely from a controller perspective, but your image publication process still needs:

- signed or otherwise verified artifacts
- architecture control
- vulnerability and boot testing
- an auditable mapping from tag to digest
- a rollback policy

A tag that is republished with a different digest creates a new image event. A tag that never changes digest does not.

For multi-platform registry indexes, set the architecture when supported by the installed CDI version:

```yaml
source:
  registry:
    url: docker://registry.example.com/vm-images/fedora:stable
    platform:
      architecture: amd64
```

## Consume the Managed DataSource

After the first successful import, inspect the pointer:

```bash
kubectl get datasource fedora -n golden-images -o yaml
kubectl get dataimportcron fedora-golden -n golden-images -o yaml
```

Create a DataVolume from the DataSource in the same namespace:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataVolume
metadata:
  name: fedora-vm-root
  namespace: golden-images
spec:
  sourceRef:
    kind: DataSource
    name: fedora
  storage:
    storageClassName: golden-rwo
    accessModes:
      - ReadWriteOnce
    volumeMode: Filesystem
    resources:
      requests:
        storage: 40Gi
```

New DataVolumes resolve the latest managed source. A previously completed `fedora-vm-root` remains its own disk. To roll out an update, create a new target DataVolume and replace or rebuild VMs through a controlled process.

For tenant namespaces, combine DataSource usage with CDI's supported cross-namespace clone authorization. Do not grant tenants permission to edit the golden image objects.

## Control Retention and Source Format

With:

```yaml
garbageCollect: Outdated
importsToKeep: 3
```

CDI retains a limited number of imported sources and removes older ones. CDI documents `Outdated` and a default retention count of three. Set values deliberately based on rollback, capacity, and compliance requirements.

DataImportCron can maintain its source as a PVC or VolumeSnapshot. The StorageProfile field `dataImportCronSourceFormat` expresses the preferred form:

```bash
kubectl get storageprofile golden-rwo -o yaml
```

Some storage providers scale better with snapshot sources:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: StorageProfile
metadata:
  name: golden-rwo
spec:
  dataImportCronSourceFormat: snapshot
```

Only choose snapshot format when the CSI driver and snapshot infrastructure support it. A cluster-wide StorageProfile change affects more than one cron.

## Monitor the Refresh Pipeline

Watch all managed objects:

```bash
kubectl get dataimportcron,datasource,datavolume,pvc \
  -n golden-images -w
```

Inspect recent events:

```bash
kubectl get events -n golden-images \
  --sort-by=.metadata.creationTimestamp
```

Alert on:

- cron import conditions reporting failure
- managed DataSource not advancing after a published digest change
- importer or registry authentication failures
- scratch or target PVC Pending
- retained source count exceeding policy
- storage-capacity pressure
- architecture or boot-test failures in downstream qualification

Do not treat a successful import as a complete release signal. Boot the new image in an isolated validation VM, run health checks, and promote it through your own rollout controls.

## Avoid Surprising StorageClass Changes

CDI uses the explicitly configured class, otherwise the default virtualization or Kubernetes class. For golden images, set `storageClassName` explicitly. A cluster default change should not silently move a large image catalog onto a different cost, topology, or snapshot model.

CDI can clean up old sources after a class change, but the change should still be reviewed as a data migration.

## Official Documentation

- [CDI automated image polling and updates](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/os-image-poll-and-update.md)
- [CDI DataSource references](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [CDI StorageProfile source formats](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/storageprofile.md)
- [Kubernetes CronJob schedule syntax](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/#schedule-syntax)
