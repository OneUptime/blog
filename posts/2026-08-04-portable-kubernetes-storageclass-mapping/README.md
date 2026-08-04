# Portable Kubernetes Storage Without Cloud Disks in App Manifests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, StorageClass, CSI, Persistent Volume, Cloud Portability, Stateful Workloads, Platform Engineering

Description: Keep application PVCs stable while cluster operators map storage intent to AWS EBS, Azure Disk, or Google Persistent Disk through provider-specific StorageClasses.

---

A Kubernetes `PersistentVolumeClaim` can express capacity, access mode, volume mode, and a StorageClass name. It cannot make AWS EBS, Azure Disk, and Google Persistent Disk operationally identical.

The portable pattern is to keep cloud provisioner details out of application manifests and let each cluster provide a StorageClass with the same intent-based name. The name is a platform contract, backed by a different CSI driver in each cloud.

## Keep the Claim About Workload Needs

An application claim should look like this:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-data
spec:
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  storageClassName: block-general
  resources:
    requests:
      storage: 100Gi
```

It should not contain a CSI driver, disk SKU, zone, cloud resource ID, or encryption key ARN. Those belong to the cluster's storage configuration.

Do not omit `storageClassName` solely for portability. An omitted name delegates to whichever default class a cluster currently has; defaults can differ in price, topology, reclaim behavior, and performance. A stable intent name is easier to audit.

## Define the Intent Contract

Before writing provider classes, define what `block-general` promises:

| Property | Contract |
| --- | --- |
| Media | General-purpose durable block storage |
| Access | Read-write mount by one node at a time; filesystem mode |
| Topology | Provision in the selected workload zone |
| Expansion | Online or documented filesystem expansion supported |
| Reclaim | Retain for production; explicit cleanup |
| Encryption | Platform-managed encryption at minimum |
| Snapshot | CSI snapshot capability installed and tested |
| Performance | Stated minimum measured with the workload profile |

Kubernetes access modes describe attachment or mounting constraints; they are not throughput, durability, or availability guarantees. Record those separately.

`ReadWriteOnce` is not strict single-Pod access: multiple Pods on the same node can still use the volume. Use `ReadWriteOncePod` when the CSI driver supports it and the contract requires one Pod to have read-write access.

## Map the Contract per Cluster

An EKS cluster using the Amazon EBS CSI driver might provide:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: block-general
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

An AKS cluster using Azure Disk CSI might provide:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: block-general
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

A GKE cluster using the Compute Engine persistent disk CSI driver might provide:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: block-general
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-balanced
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

These examples deliberately do not claim equal IOPS or durability. Validate current driver parameters and supported features for the selected cluster version and region before applying them.

The EKS example uses the standard Amazon EBS CSI driver. EKS Auto Mode uses the distinct `ebs.csi.eks.amazonaws.com` provisioner, and AWS documents that the two provisioners manage separate volume sets. Select the manifest for the cluster mode you actually run.

## Prefer `WaitForFirstConsumer` for Zoned Block Storage

With `Immediate` binding, a volume can be provisioned before Kubernetes knows where its consuming Pod can run. For topology-constrained storage, that may create an unschedulable combination.

`WaitForFirstConsumer` delays provisioning and binding until scheduling considers the Pod's node selector, affinity, tolerations, resource needs, and topology, together with node taints. Kubernetes recommends this approach for topology-aware provisioning.

Do not set `spec.nodeName` directly on a Pod that relies on `WaitForFirstConsumer`; doing so bypasses scheduler selection and can leave the claim pending. Use node affinity when placement is required.

## Separate Classes When Intent Differs

One generic class cannot honestly represent every storage need. Establish a small catalog such as:

```text
block-general
block-high-iops
block-retained
shared-filesystem
local-scratch
```

Only publish a class in a cluster when the platform can meet its contract. `shared-filesystem`, for example, requires a compatible file service and CSI driver; it should not be emulated with single-node block storage.

If an application needs a provider-only feature, use a clearly provider-specific class such as `aws-block-gp3-tuned`. This makes the portability exception searchable rather than hiding it behind `block-general`.

## Treat Snapshots as Provider-Local Unless Proven Otherwise

Kubernetes `VolumeSnapshot`, `VolumeSnapshotContent`, and `VolumeSnapshotClass` standardize the request and lifecycle around a CSI snapshot. Snapshot classes still contain driver-specific behavior, and the resulting `snapshotHandle` identifies data in the storage backend.

A claim restored from a snapshot uses a standard data source:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-data-restored
spec:
  storageClassName: block-general
  dataSource:
    name: database-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
```

That does not imply an EBS snapshot can be referenced by an Azure Disk or Google PD CSI driver. Use application-native backup, filesystem copy, or a supported data-transfer tool to cross provider boundaries.

## Test the Storage Contract

For each cluster and class, automate a disposable test:

1. create a PVC and wait for it to bind;
2. schedule a Pod and record its zone;
3. write deterministic data and a checksum;
4. restart and reschedule within supported topology;
5. expand the claim and filesystem;
6. create a snapshot and wait for `readyToUse`;
7. restore to a new claim and compare checksums;
8. delete the test claim and verify the documented reclaim behavior.

Also load-test the application pattern. A sequential bandwidth test does not represent database fsync latency, and a single-zone test does not demonstrate zone-failure recovery.

Inspect the cluster's real inventory before declaring support:

```bash
kubectl get csidriver
kubectl get storageclass -o wide
kubectl get volumesnapshotclass
```

Snapshot CRDs, the snapshot controller, and a capable CSI driver must all be available. Kubernetes distributions and managed services package these components differently.

## Protect the Naming Contract

Manage StorageClasses in the platform repository, not application charts. Admission policy can restrict production PVCs to approved intent names. Version a materially changed promise instead of silently replacing it-for example, introduce `block-general-v2`, migrate claims, and then retire the old class.

Keep a machine-readable catalog with owner, supported clusters, driver, performance target, backup method, and last contract-test result. The shared name becomes useful only when its meaning is governed.

## Official Documentation

- [Kubernetes StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes volume snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Amazon EBS CSI driver on EKS](https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html)
- [EKS Auto Mode StorageClasses](https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html)
- [Azure Disk CSI driver on AKS](https://learn.microsoft.com/en-us/azure/aks/azure-disk-csi)
- [Compute Engine persistent disk CSI driver on GKE](https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver)

## Conclusion

Portable Kubernetes storage is a mapping, not a universal disk. Keep PVCs focused on workload intent, implement that intent with provider-specific CSI StorageClasses, use topology-aware binding, and test the full lifecycle. Move data through an explicit cross-provider mechanism because CSI snapshots normally remain tied to their backend.
