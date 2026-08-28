# How to Migrate a Workload from emptyDir to Generic Ephemeral Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, emptyDir, Generic Ephemeral Volumes, CSI, StorageClass, Deployment, Migration

Description: Replace a workload's node-local emptyDir with a CSI-provisioned generic ephemeral volume through a capacity-aware, reversible Pod-template rollout.

---

Both `emptyDir` and a generic ephemeral volume follow a Pod's lifetime, but they solve different infrastructure problems. A disk-backed `emptyDir` uses local ephemeral storage managed by the kubelet. A generic ephemeral volume embeds a PVC template in the Pod and can use dynamic provisioning, CSI topology, snapshots, cloning, and storage-class policy.

Migrating does not make scratch data persistent. When a Pod is replaced, its `emptyDir` is deleted; a generic ephemeral PVC is also deleted with its owning Pod. The replacement Pod receives a newly provisioned volume unless its claim template deliberately populates it from a supported data source.

Generic ephemeral volumes have been stable since Kubernetes 1.23. The storage driver does not need a special “ephemeral” mode; it must support ordinary persistent-volume dynamic provisioning for the requested StorageClass.

## Decide Whether Generic Ephemeral Storage Fits

Use a generic ephemeral volume when the data is disposable at Pod deletion but the workload needs one or more of these properties:

- storage capacity or performance distinct from node root storage;
- CSI-backed encryption or storage policy;
- topology-aware provisioning;
- a fixed provisioned size through a PVC request;
- snapshot or clone operations while the PVC exists, if supported;
- storage that can be attached according to the CSI driver's capabilities during that same Pod's lifetime.

Use an ordinary PVC instead when the data must survive Pod deletion, eviction, a rollout, or controller replacement. A generic ephemeral volume is not a shortcut to persistent application state.

## Inventory the Existing emptyDir Contract

Capture the live workload and determine what the application assumes:

```bash
namespace=processing
workload=sort-worker

kubectl get deployment "$workload" -n "$namespace" -o yaml > sort-worker-before.yaml
kubectl get pods -n "$namespace" -l app=sort-worker -o wide
kubectl describe deployment "$workload" -n "$namespace"
```

Record:

- the volume name and every container mount path;
- `emptyDir.medium` and `sizeLimit`;
- file ownership, `fsGroup`, SELinux, and read-only mount requirements;
- peak bytes, inodes, and I/O behavior;
- container `ephemeral-storage` requests and limits;
- node selectors, affinity, tolerations, and topology constraints;
- whether startup expects an empty directory or pre-populated content.

A memory-backed `emptyDir` (`medium: Memory`) is charged as memory use, not local ephemeral storage. Moving it to a filesystem PVC changes performance and accounting substantially.

Export any data needed beyond the current Pod before rollout. Neither volume type copies existing contents into a replacement Pod automatically.

## Prepare the StorageClass and Namespace

Choose a StorageClass whose provisioner and parameters are approved for transient workload data. For topology-constrained storage, Kubernetes recommends `WaitForFirstConsumer` so provisioning occurs after the scheduler considers the Pod's constraints:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: workload-scratch
provisioner: <csi-provisioner-name>
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
allowVolumeExpansion: true
parameters:
  # Use only parameters documented by this CSI driver.
```

The cluster storage administrator should create and validate the class. Do not copy provisioner names or parameters from another environment. `reclaimPolicy: Delete` matches ephemeral intent; `Retain` leaves PVs and backend volumes for separate cleanup after Pods disappear.

Confirm namespace policy allows the generated PVCs. Generic ephemeral claims count toward:

- `persistentvolumeclaims` quota;
- `requests.storage` quota;
- per-StorageClass PVC and storage quota;
- PVC minimum and maximum storage constraints in a `LimitRange`.

Plan for rollout surge. A Deployment can temporarily run old and new Pods together, and each new Pod creates a claim. Quota and backend capacity must cover the peak, not just steady-state replicas.

## Replace the Volume Source, Not the Mount

An existing template might use:

```yaml
spec:
  template:
    spec:
      containers:
        - name: worker
          image: example.com/sort-worker:3.2
          resources:
            requests:
              ephemeral-storage: 2Gi
            limits:
              ephemeral-storage: 12Gi
          volumeMounts:
            - name: work
              mountPath: /work
      volumes:
        - name: work
          emptyDir:
            sizeLimit: 10Gi
```

Change only the volume source while keeping the volume name and application mount path stable:

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  template:
    spec:
      containers:
        - name: worker
          image: example.com/sort-worker:3.2
          resources:
            requests:
              ephemeral-storage: 2Gi
            limits:
              ephemeral-storage: 12Gi
          volumeMounts:
            - name: work
              mountPath: /work
      volumes:
        - name: work
          ephemeral:
            volumeClaimTemplate:
              metadata:
                labels:
                  storage-purpose: sort-scratch
                  app.kubernetes.io/name: sort-worker
              spec:
                accessModes:
                  - ReadWriteOnce
                storageClassName: workload-scratch
                resources:
                  requests:
                    storage: 10Gi
```

The PVC request replaces the `emptyDir.sizeLimit` as the volume-capacity declaration, but the two fields are not identical enforcement mechanisms. Filesystem and storage-backend overhead can affect usable bytes.

Keep container `ephemeral-storage` requests and limits unless measurement shows they should change. Container logs and writable layers still consume local ephemeral storage even after `/work` moves to CSI storage. The generic PVC's requested bytes are accounted as persistent storage quota, not as the container's local `ephemeral-storage` request.

Use only access modes and `volumeMode` values supported by the driver. The example assumes a filesystem volume mounted by one node.

## Test a Canary Before the Main Rollout

Create a separate one-replica canary workload with the same Pod constraints and claim template. Verify:

```bash
kubectl get pods,pvc -n "$namespace"
kubectl get events -n "$namespace" --sort-by=.metadata.creationTimestamp
```

The generated PVC name is `<Pod name>-<volume name>`. Confirm that it is owned by the canary Pod UID, becomes `Bound`, and provisions in topology compatible with the scheduled node.

Inside the canary, validate the mount and application permissions:

```bash
canary_pod=CANARY_POD_NAME  # Replace with the actual canary Pod name.
kubectl exec -n "$namespace" "$canary_pod" -c worker -- \
  sh -c 'mount | grep " /work "; df -h /work; touch /work/.write-test; rm /work/.write-test'
```

Use an application-specific check if the production image has no shell. Validate startup time, I/O latency, capacity, file ownership, graceful shutdown, and CSI cleanup after deleting only the canary Pod.

## Roll Out Through the Workload Controller

Pod volume specifications are effectively immutable. Do not patch the live Pod. Apply the updated Deployment and let its controller create replacement Pods:

```bash
kubectl apply -f sort-worker-generic-ephemeral.yaml
kubectl rollout status deployment/"$workload" -n "$namespace" --timeout=15m
```

Watch Pods, PVCs, events, and rollout state in parallel. With `maxUnavailable: 0`, the Deployment should retain old ready Pods while new Pods provision and pass readiness, subject to available surge capacity.

For other controllers:

- A DaemonSet follows its configured update strategy and needs capacity on each node or topology.
- A StatefulSet recreates stable Pod names. Its old generated PVC may still be terminating when the replacement Pod with the same name and a new UID appears, temporarily causing an ownership conflict. Verify claim deletion and CSI timing during a canary ordinal.
- An existing Job's Pod template is not a migration target; create a new Job with a new name. Updating a CronJob affects Jobs created after the template change, not already running Jobs.
- A bare Pod must be deleted and recreated, which destroys its `emptyDir`.

## Verify Lifecycle and Cleanup

For every migrated Pod, check the expected claim and owner:

```bash
kubectl get pods -n "$namespace" -l app=sort-worker -o wide
kubectl get pvc -n "$namespace" -l storage-purpose=sort-scratch -o wide
```

Select a Pod and claim, then inspect their events and owner UID. Verify application health and compare local ephemeral-storage pressure before and after the migration.

Delete only a canary or controlled test Pod. Confirm that:

1. the controller creates a replacement Pod;
2. the old Pod's generated PVC is garbage-collected;
3. a new PVC is provisioned for the replacement Pod;
4. the replacement volume starts with the expected empty state;
5. the old PV and backend volume are removed under the `Delete` reclaim policy.

This test proves lifecycle semantics. It does not prove that data survives replacement-it should not.

## Roll Back Safely

If new Pods remain Pending or fail readiness, pause the Deployment rollout while the old ready Pods still exist:

```bash
kubectl rollout pause deployment/"$workload" -n "$namespace"
new_pod=NEW_POD_NAME  # Replace with the actual new Pod name.
new_pvc=NEW_PVC_NAME  # Replace with the actual generated PVC name.
kubectl describe pod "$new_pod" -n "$namespace"
kubectl describe pvc "$new_pvc" -n "$namespace"
```

Resolve StorageClass, quota, topology, attach, mount, or permission errors. To abandon the migration, resume with `kubectl rollout resume deployment/"$workload" -n "$namespace"`, then restore the previous revision with `kubectl rollout undo deployment/"$workload" -n "$namespace"`; Kubernetes cannot roll back a paused Deployment. Monitor the rollback.

Rollback creates new Pods with new `emptyDir` volumes; it does not copy files back from generic ephemeral claims. Allow Kubernetes and the CSI driver to delete the failed rollout's PVCs. Do not strip finalizers or manually delete bound PVs during an active rollout.

## Limitations and Version Scope

CSI features, topology, capacity tracking, snapshots, mount options, expansion, and deletion timing depend on the installed driver. Generic ephemeral volumes let Pod creators indirectly create PVCs, so admission and RBAC designs must account for that behavior. Network-backed scratch can also have very different latency and failure behavior from node-local `emptyDir`; benchmark the real workload.

## Official Documentation

- [Generic ephemeral volume features, manifest, lifecycle, and scheduling](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/#generic-ephemeral-volumes)
- [`emptyDir` behavior and lifecycle](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [StorageClass binding mode and reclaim policy](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Pod templates, immutability, and replacement](https://kubernetes.io/docs/concepts/workloads/pods/#pod-update-and-replacement)
- [Deployment rolling updates and rollback](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Resource quotas for PVC storage](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Local ephemeral-storage accounting](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)

## Conclusion

Treat the migration as a Pod-template rollout, not an in-place disk conversion. Validate the CSI class and quota, replace the volume source while keeping the mount contract stable, canary provisioning and cleanup, and preserve old ready Pods until new ones pass readiness. Generic ephemeral storage improves provisioning options while intentionally retaining Pod-lifetime data semantics.
