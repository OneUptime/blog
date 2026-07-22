# How to Install the CSI Snapshot Controller and CRDs on a kubeadm Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubeadm, CSI, Volume Snapshot, Cluster Administration

Description: Install and verify the cluster-wide CSI snapshot CRDs and snapshot controller on a kubeadm-managed Kubernetes cluster.

---

Kubernetes volume snapshot support has two cluster-wide pieces: the `snapshot.storage.k8s.io/v1` CRDs and the common snapshot controller. A kubeadm-built cluster does not gain them merely because the snapshot API is stable. Kubernetes assigns their installation to the distribution or cluster administrator.

The storage driver supplies a different component: a `csi-snapshotter` sidecar that runs with that driver's controller. Installing the common controller is necessary, but it cannot make an unsupported CSI driver create snapshots.

This guide installs only the three GA volume snapshot CRDs and the common controller. It deliberately excludes the separate volume group snapshot CRDs and conversion webhook.

## Check what is already installed

Do not install a second controller over a distribution-managed one. Inspect the API and workloads first:

```bash
kubectl get crd \
  volumesnapshots.snapshot.storage.k8s.io \
  volumesnapshotcontents.snapshot.storage.k8s.io \
  volumesnapshotclasses.snapshot.storage.k8s.io

kubectl get deployment --all-namespaces | grep snapshot-controller
kubectl api-resources --api-group=snapshot.storage.k8s.io
```

If the resources and a healthy controller already exist, identify their owner through labels, annotations, package manifests, or your cluster lifecycle tooling. Upgrade them through that same mechanism.

Also record the cluster version:

```bash
kubectl version
```

The external-snapshotter project publishes compatibility information for its releases. Select a release compatible with your Kubernetes and CSI versions. Do not use `master`, `latest`, or a mixture of manifests from different tags in production.

## Choose and pin an upstream release

At the time of writing, the upstream release page is the authoritative place to identify a published tag and its minimum Kubernetes version. The commands below use `v8.5.0` as a concrete, published example; replace it with the release you selected after reading its release notes.

```bash
CSI_SNAPSHOT_RELEASE=v8.5.0
CSI_SNAPSHOT_BASE="https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/${CSI_SNAPSHOT_RELEASE}"
```

Pinning matters because CRD schemas, controller validation, RBAC, and feature flags evolve together. Store the selected tag in cluster configuration so a later rebuild is reproducible.

For a controlled environment, download and review these manifests into your infrastructure repository before applying them. The direct commands below are useful for showing exactly which upstream files are required.

## Install the three volume snapshot CRDs

Apply the CRDs before starting the controller:

```bash
kubectl apply -f "${CSI_SNAPSHOT_BASE}/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml"
kubectl apply -f "${CSI_SNAPSHOT_BASE}/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml"
kubectl apply -f "${CSI_SNAPSHOT_BASE}/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml"
```

Wait until all three are established:

```bash
kubectl wait --for=condition=Established \
  crd/volumesnapshotclasses.snapshot.storage.k8s.io \
  crd/volumesnapshotcontents.snapshot.storage.k8s.io \
  crd/volumesnapshots.snapshot.storage.k8s.io \
  --timeout=90s
```

Confirm that the served and storage API is `v1`:

```bash
kubectl get crd volumesnapshots.snapshot.storage.k8s.io \
  -o jsonpath='{range .spec.versions[*]}{.name}{" served="}{.served}{" storage="}{.storage}{"\n"}{end}'
```

Do not use old `v1alpha1` or `v1beta1` examples with current CRDs.

## Install RBAC and the common controller

The release's controller manifests target `kube-system`, which is appropriate for a kubeadm cluster:

```bash
kubectl apply -f "${CSI_SNAPSHOT_BASE}/deploy/kubernetes/snapshot-controller/rbac-snapshot-controller.yaml"
kubectl apply -f "${CSI_SNAPSHOT_BASE}/deploy/kubernetes/snapshot-controller/setup-snapshot-controller.yaml"
```

Review the rendered controller image before applying in a production change. A release tag can intentionally refer to the component image tested by that release; do not perform an unreviewed search-and-replace simply to make every version string look identical.

Wait for the deployment:

```bash
kubectl rollout status deployment/snapshot-controller \
  --namespace kube-system \
  --timeout=3m

kubectl get pods --namespace kube-system \
  --selector=app.kubernetes.io/name=snapshot-controller \
  -o wide
```

The upstream manifest uses two replicas and leader election. Only the elected leader reconciles objects, while the other replica provides failover.

## Understand the validation webhook version boundary

Older snapshotter releases shipped a validating webhook. Current CRDs use Common Expression Language (CEL) rules for `VolumeSnapshot` and `VolumeSnapshotContent` validation, and the external-snapshotter documentation marks the old webhook as deprecated. Recent release manifests no longer publish it as part of the normal volume snapshot installation.

Follow the exact documentation for the release line you selected. Do not combine an older webhook deployment with newer CRDs, and do not install the group snapshot conversion webhook unless you are deliberately enabling the separate group snapshot API.

## Verify the CSI driver's sidecar

The common controller watches all snapshot objects, but a driver-specific external-snapshotter must make the CSI calls. Locate the controller workload for the driver behind your PVC:

```bash
kubectl get pvc app-data --namespace app \
  -o jsonpath='{.spec.volumeName}{"\n"}'

kubectl get pv PV_NAME \
  -o jsonpath='{.spec.csi.driver}{"\n"}'
```

Replace `PV_NAME` with the first command's result. Then inspect the vendor's controller deployment or StatefulSet:

```bash
kubectl get deployment,statefulset --all-namespaces
kubectl get deployment DRIVER_CONTROLLER \
  --namespace DRIVER_NAMESPACE \
  -o jsonpath='{.spec.template.spec.containers[*].name}{"\n"}'
```

You should see the CSI driver and, for snapshot-capable installations, an external snapshotter container-often named `csi-snapshotter`. The exact workload name and installation method are vendor-specific. Upgrade or enable the sidecar using the driver's official chart or manifests instead of grafting a random sidecar into the pod: it needs the correct socket, RBAC, arguments, and a version compatible with the driver.

## Create a driver-matched VolumeSnapshotClass

The upstream common components do not create a `VolumeSnapshotClass`. Use the driver's official documentation for its driver name and parameters. This example shows the API shape only:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: production-snapshots
driver: csi.example.com
deletionPolicy: Retain
parameters: {}
```

`driver` must exactly match `.spec.csi.driver` on the source PV. Replace `csi.example.com`; it is intentionally not a real driver. Choose `Retain` or `Delete` deliberately, and add only parameters documented by your vendor.

## Run a reversible smoke test

Use a disposable, bound PVC supported by the chosen driver. Create a snapshot in the same namespace:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: snapshot-smoke-test
  namespace: app
spec:
  volumeSnapshotClassName: production-snapshots
  source:
    persistentVolumeClaimName: app-data
```

```bash
kubectl apply -f snapshot-smoke-test.yaml

kubectl wait \
  --for=jsonpath='{.status.readyToUse}'=true \
  volumesnapshot/snapshot-smoke-test \
  --namespace app \
  --timeout=10m

kubectl get volumesnapshot snapshot-smoke-test \
  --namespace app \
  -o yaml
```

A useful readiness check includes all of the following:

- `status.boundVolumeSnapshotContentName` is present;
- `status.readyToUse` is `true`;
- the bound content has a `status.snapshotHandle`;
- the backend console or API shows the corresponding snapshot; and
- a new PVC can be restored from it and its test data verified.

Snapshot creation alone does not prove restore works. Exercise both directions before declaring the driver ready for backups.

## Troubleshoot installation by layer

If no content object is created, inspect the namespaced snapshot events and common controller:

```bash
kubectl describe volumesnapshot snapshot-smoke-test --namespace app
kubectl logs deployment/snapshot-controller \
  --namespace kube-system \
  --all-containers=true \
  --tail=200
```

If a content object exists but never receives a snapshot handle or readiness status, inspect the external-snapshotter and CSI driver containers in the vendor controller pod. Common causes are a missing snapshot sidecar, a class/driver mismatch, missing class credentials, an incompatible sidecar, or a backend operation that is failing or still running.

Check RBAC without broadening it blindly:

```bash
kubectl auth can-i list volumesnapshots.snapshot.storage.k8s.io \
  --as=system:serviceaccount:kube-system:snapshot-controller

kubectl auth can-i update volumesnapshotcontents.snapshot.storage.k8s.io \
  --as=system:serviceaccount:kube-system:snapshot-controller
```

Finally, ensure your firewall, proxy, and registry policy permit pulling `registry.k8s.io/sig-storage/snapshot-controller` on control-plane or worker nodes where the deployment can schedule.

## Plan upgrades as one compatibility change

Before upgrading Kubernetes, review the external-snapshotter matrix and the CSI vendor's supported sidecar versions. Back up the snapshot API objects and inventory backend snapshot handles. Apply CRD schema updates before rolling the common controller when the release notes specify that order, then upgrade each driver through its supported packaging.

Never remove snapshot CRDs casually. Deleting a CRD deletes its custom resources from the Kubernetes API, which can sever lifecycle tracking even if backend snapshots still exist. Test an upgrade and restore in a non-production cluster first.

## Official Documentation

- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [External Snapshotter repository](https://github.com/kubernetes-csi/external-snapshotter)
- [External Snapshotter releases](https://github.com/kubernetes-csi/external-snapshotter/releases)
- [External Snapshotter compatibility and deployment](https://kubernetes-csi.github.io/docs/external-snapshotter.html)
- [Kubernetes CSI Snapshot and Restore feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)
- [Kubernetes CSI versioning and compatibility policy](https://kubernetes-csi.github.io/docs/project-policies.html)
