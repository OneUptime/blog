# How Generic Ephemeral Volumes Are Cleaned Up After Jobs and CronJobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Generic Ephemeral Volumes, Job, CronJob, PersistentVolumeClaim, Garbage Collection, Storage

Description: Trace the Job-to-Pod-to-PVC ownership chain and configure TTL, history limits, and reclaim policy so batch scratch volumes are cleaned up predictably.

---

The generated PVC for a generic ephemeral volume is garbage-collected when its Pod is deleted, not when the container exits and not merely when a Job reaches `Complete` or `Failed`. Whether the bound PV and backend volume are also deleted depends on the PV's reclaim policy and the storage driver. Kubernetes creates a real PVC for each inline generic ephemeral volume and records the Pod as its owner. As long as the completed or failed Pod remains, its PVC normally remains too.

For batch workloads, cleanup is therefore a chain:

```text
CronJob -> Job -> Pod -> generated PVC -> bound PV (often dynamically provisioned) -> backend volume
```

Job TTL or CronJob history policy deletes the Job. Cascading garbage collection deletes dependent Pods. Deleting each Pod makes its generated PVC eligible for garbage collection. What happens to the PV and backend storage then depends on the bound PV's reclaim policy, which dynamically provisioned PVs inherit from their StorageClass, and the storage driver.

Generic ephemeral volumes have been stable since Kubernetes 1.23, and the TTL controller for finished Jobs has been stable since 1.23.

## Understand Completion Versus Deletion

When a Job's work finishes, the Job gets a terminal condition and its Pods enter `Succeeded` or `Failed`. Kubernetes intentionally retains those API objects for status, logs, and debugging. The generated PVCs remain owned by those retained Pods.

This means all of the following can be true at once:

- the Job is `Complete`;
- no application container is running;
- the Pod still exists;
- the generic ephemeral PVC is still `Bound`;
- the storage backend is still charging for the volume.

`activeDeadlineSeconds`, `backoffLimit`, and a CronJob's schedule control execution. They are not storage-retention settings.

## Inspect the Ownership Chain

For a Job named `daily-report`, find its Pods:

```bash
namespace=reports
job=daily-report

kubectl get job "$job" -n "$namespace" -o wide
kubectl get pods -n "$namespace" -l batch.kubernetes.io/job-name="$job" -o wide
```

Select one Pod and inspect its UID and owner:

```bash
pod="$(kubectl get pods -n "$namespace" \
  -l batch.kubernetes.io/job-name="$job" \
  -o jsonpath='{.items[0].metadata.name}')"

kubectl get pod "$pod" -n "$namespace" \
  -o jsonpath='{.metadata.uid}{" phase="}{.status.phase}{" owner="}{.metadata.ownerReferences[0].kind}{"/"}{.metadata.ownerReferences[0].name}{"\n"}'
```

If the inline volume is named `work`, its generated claim is `<Pod name>-work`:

```bash
claim="${pod}-work"

kubectl get pvc "$claim" -n "$namespace" \
  -o jsonpath='{.metadata.name}{" phase="}{.status.phase}{" pv="}{.spec.volumeName}{" owner="}{.metadata.ownerReferences[0].kind}{"/"}{.metadata.ownerReferences[0].name}{" uid="}{.metadata.ownerReferences[0].uid}{"\n"}'
```

The PVC owner UID should match the Pod UID. Capture the PV name and StorageClass before cleanup begins:

```bash
pv="$(kubectl get pvc "$claim" -n "$namespace" -o jsonpath='{.spec.volumeName}')"

kubectl get pvc "$claim" -n "$namespace" \
  -o custom-columns=CLAIM:.metadata.name,CLASS:.spec.storageClassName,PV:.spec.volumeName,DELETING:.metadata.deletionTimestamp
```

For parallel, indexed, or retried Jobs, repeat this for every retained Pod. Each Pod gets its own deterministic claim per generic ephemeral volume, so storage usage can grow with parallelism and failed attempts.

## Give Standalone Jobs a TTL

Set `.spec.ttlSecondsAfterFinished` on the Job. The countdown begins after the Job reaches `Complete` or `Failed`:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: daily-report
  namespace: reports
spec:
  ttlSecondsAfterFinished: 1800
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: report
          image: example.com/report:2.4
          volumeMounts:
            - name: work
              mountPath: /work
      volumes:
        - name: work
          ephemeral:
            volumeClaimTemplate:
              metadata:
                labels:
                  storage-purpose: batch-scratch
              spec:
                accessModes:
                  - ReadWriteOnce
                storageClassName: batch-scratch
                resources:
                  requests:
                    storage: 10Gi
```

After 30 minutes, the Job becomes eligible for cascading deletion by the TTL controller, which honors lifecycle guarantees such as finalizers. Once the controller deletes the Job, dependent Pod deletion allows the generic ephemeral PVC to be garbage-collected.

Choose a TTL long enough for log collection, metrics scraping, incident response, and any output copy. A short TTL is not a backup policy. If an admission controller sets TTLs automatically, document its value so operators know the actual recovery window.

## Configure CronJob History and Job TTL Together

CronJobs can retain a fixed number of successful and failed Jobs:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: hourly-report
  namespace: reports
spec:
  schedule: "15 * * * *"
  successfulJobsHistoryLimit: 2
  failedJobsHistoryLimit: 2
  jobTemplate:
    spec:
      ttlSecondsAfterFinished: 21600
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: report
              image: example.com/report:2.4
              volumeMounts:
                - name: work
                  mountPath: /work
          volumes:
            - name: work
              ephemeral:
                volumeClaimTemplate:
                  spec:
                    accessModes:
                      - ReadWriteOnce
                    storageClassName: batch-scratch
                    resources:
                      requests:
                        storage: 10Gi
```

The history limits default to three successful Jobs and one failed Job when omitted. Setting either limit to `0` asks the CronJob controller not to retain Jobs in that category. The Job TTL is time-based; history limits are count-based. Whichever policy deletes a Job first starts its cascading cleanup.

Suspending a CronJob stops future Job creation but does not delete Jobs that already started. `concurrencyPolicy` controls overlapping execution, not how long completed volumes remain.

## Account for the StorageClass Reclaim Policy

Inspect the class used by the generated claim and the reclaim policy recorded on the bound PV:

```bash
storage_class=batch-scratch
kubectl get storageclass "$storage_class" \
  -o custom-columns=NAME:.metadata.name,PROVISIONER:.provisioner,BINDING:.volumeBindingMode,RECLAIM:.reclaimPolicy

kubectl get pv "$pv" \
  -o custom-columns=NAME:.metadata.name,CLASS:.spec.storageClassName,RECLAIM:.spec.persistentVolumeReclaimPolicy
```

For dynamically provisioned volumes, the PV inherits the StorageClass reclaim policy when it is provisioned, and that policy defaults to `Delete`. The policy recorded on the bound PV is authoritative. Deleting the PVC then normally causes deletion of the PV object and backend volume. Backend deletion is asynchronous and can be delayed by an unavailable storage driver or backend; PV deletion finalizers can keep the PV object in `Terminating` until the backing volume has been deleted.

With reclaim policy `Retain`, Pod and PVC cleanup does not erase the storage asset. The PV and backend data require a separate, audited recovery or destruction workflow. This can support forensics, but it is not automatic ephemeral cleanup and can accumulate cost quickly.

Do not manually delete the PVC before the Pod. PVC protection may delay the request while the claim is in use, and bypassing protection or finalizers can race a mounted workload and the CSI driver.

## Observe Cleanup End to End

Watch the related resources during a test Job:

```bash
kubectl get jobs,pods,pvc -n "$namespace" -w
```

Before the claim disappears, record its PV as shown above. Then verify both API and backend outcomes:

```bash
kubectl get job "$job" -n "$namespace"
kubectl get pod "$pod" -n "$namespace"
kubectl get pvc "$claim" -n "$namespace"
kubectl get pv "$pv"
```

`NotFound` is expected only after the configured controller has deleted that layer. Check control-plane events, object deletion timestamps, and finalizers if one layer stalls. Confirm backend deletion through the storage driver's supported monitoring rather than assuming that removal of the Kubernetes object instantly reclaimed storage.

## Preserve Data Before Cleanup Starts

While the Pod and generated PVC still exist, the claim can be used like another PVC. If the CSI driver and cluster snapshot components support snapshots, you can create a `VolumeSnapshot` from the claim. Cloning requires a bound source PVC that is not in use, a CSI dynamic provisioner, and a driver that supports cloning. You can also copy data through a running or debug container that mounts the volume.

Finish and validate that preservation before deleting the Pod. Once Pod deletion starts, the generated claim can enter garbage collection, and a snapshot or clone request may be too late.

For authoritative batch output, write directly to durable storage. A generic ephemeral volume should hold recomputable scratch data, not the only copy of the result.

## Rollback and Recovery Cautions

Increasing TTL or history limits affects objects that have not already been deleted. It cannot restore a removed Pod, PVC, or backend volume. Deleting a CronJob can also cascade to owned Jobs depending on deletion propagation, so inspect and preserve dependent work before removing the CronJob itself.

Do not strip `kubernetes.io/pvc-protection`, CSI, or garbage-collector finalizers simply to make a dashboard look clean. A stuck finalizer is evidence that a controller has not completed its safety or backend operation.

## Limitations and Version Scope

Exact deletion timing is eventually consistent and depends on controller health, API finalizers, CSI behavior, and reclaim policy. Pod garbage collection can also remove excess terminated Pods independently. Custom operators may use different ownership or deletion propagation. Verify the live owner references rather than inferring them solely from object names.

## Official Documentation

- [Generic ephemeral volume lifecycle and PVC ownership](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/#lifecycle-and-persistentvolumeclaim)
- [Clean up finished Jobs with the TTL controller](https://kubernetes.io/docs/concepts/workloads/controllers/job/#clean-up-finished-jobs-automatically)
- [CronJob history limits](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/#jobs-history-limits)
- [Owners, dependents, finalizers, and cascading deletion](https://kubernetes.io/docs/concepts/architecture/garbage-collection/)
- [StorageClass reclaim policy](https://kubernetes.io/docs/concepts/storage/storage-classes/#reclaim-policy)
- [PersistentVolume reclaiming and protection](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Volume snapshots and PVC source protection](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)

## Conclusion

Batch completion does not itself delete a generic ephemeral volume. Configure Job TTLs and CronJob history limits to delete finished Jobs, verify that garbage collection removes their Pods and PVCs, and choose the StorageClass reclaim policy intentionally. Test the full chain through the storage backend before relying on it for cost or data-retention guarantees.
