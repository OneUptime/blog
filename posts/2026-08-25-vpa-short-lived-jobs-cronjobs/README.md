# How to Right-Size Short-Lived Jobs and CronJobs When VPA Lacks Enough History

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, Jobs, CronJobs, Resource Sizing

Description: Build useful VPA history across short Job runs, apply recommendations at Pod creation, and protect early executions with stable labels, conservative bounds, and external history.

---

Short-lived batch Pods can finish before VPA has enough live samples to form a confident recommendation or before the updater has any reason to resize them. The practical pattern is to aggregate comparable executions under a durable target, observe first, and apply the learned recommendation when future Pods are admitted.

## Target the Durable Controller

Current upstream VPA treats both `Job` and `CronJob` as well-known controllers. For a recurring CronJob, target the CronJob rather than each generated Job name:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-rollup
  namespace: data
spec:
  schedule: "15 1 * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            app: nightly-rollup
            workload-class: daily-rollup
        spec:
          restartPolicy: Never
          containers:
            - name: rollup
              image: registry.example.com/rollup:2026-08-25
              resources:
                requests:
                  cpu: "1"
                  memory: 2Gi
                limits:
                  memory: 4Gi
---
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: nightly-rollup
  namespace: data
spec:
  targetRef:
    apiVersion: batch/v1
    kind: CronJob
    name: nightly-rollup
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
      - containerName: rollup
        controlledValues: RequestsOnly
        minAllowed:
          cpu: 500m
          memory: 1Gi
        maxAllowed:
          cpu: "8"
          memory: 4Gi
```

The upstream selector fetcher derives a CronJob selector from labels on `jobTemplate.spec.template`. Use stable, unique labels there. If two unrelated batch shapes share the same selector labels, their history can be mixed; if those template labels change every run, useful history cannot aggregate.

## Observe Several Representative Runs

Keep `updateMode: Off` initially:

```bash
kubectl -n data get vpa nightly-rollup -w
kubectl -n data get jobs --sort-by=.metadata.creationTimestamp
kubectl -n data top pod -l workload-class=daily-rollup --containers
```

Run enough normal and peak inputs to cover the workload's real variation. VPA weights CPU samples and aggregates memory peaks; one tiny test run is not representative of month-end, backfill, or unusually large partitions.

The recommendation bounds become wide with short history by design. Current recommender logic widens the bounds using a confidence metric based on both the span and count of historical CPU samples, so the updater is less eager to force changes from sparse samples. Treat `target` as evidence to review, not proof that the next unseen input fits.

## Apply at Creation, Not Mid-Run

Once history and bounds are credible, `Initial` is usually safer for batch work:

```yaml
spec:
  updatePolicy:
    updateMode: Initial
```

The VPA admission webhook applies the current target when a new Job Pod is created, and the updater does not evict it later. That avoids turning a rightsizing action into a failed or duplicated batch attempt.

`Recreate` can evict a running Job Pod when the updater's eviction checks permit it. An eviction can cause the Job controller to create a replacement Pod and, by default, count the disruption toward `.spec.backoffLimit`; `.spec.podFailurePolicy` can ignore the `DisruptionTarget` condition, and Indexed Jobs can use `.spec.backoffLimitPerIndex`. Use it only after proving the job is idempotent and the retry behavior is intentional.

Because Job Pods commonly use `restartPolicy: Never`, they cannot declare a container `resizePolicy` of `RestartContainer`. This limits memory resize choices. A short Job also often finishes before an in-place update is useful, making creation-time mutation the clearer mechanism.

## Protect the First Runs

VPA cannot learn a workload it has never observed. Use conservative initial requests and `minAllowed` based on testing, known dataset size, or a previous environment. Set `maxAllowed` below the schedulable envelope of eligible nodes, but high enough to cover representative peaks.

For jobs whose demand scales with input size, split them into workload classes with separate CronJobs and VPAs, or calculate resources from input metadata before Pod creation. A single historical percentile may be inappropriate when one target covers 1 GiB and 1 TiB inputs.

Keep application-level safeguards:

- checkpoint work so a retry does not start from zero;
- make output commits idempotent;
- use `activeDeadlineSeconds` and failure policy deliberately;
- alert on `OOMKilled`, deadline, and backoff exhaustion; and
- retain completed Job diagnostics long enough to investigate.

## Retain History Across Gaps and Restarts

The default recommender stores aggregate state in `VerticalPodAutoscalerCheckpoint` objects. Do not delete and recreate the VPA for every run if you want continuity.

For clusters that retain compatible cAdvisor metrics, `--storage=prometheus` can load history when the recommender starts. Configure `--prometheus-address`, set `--history-resolution` fine enough to sample these short runs (the upstream default is `1h`), and use a historical range-vector query for `--metric-for-pod-labels` whose Pod identity labels and label prefix match your Prometheus schema. The provider needs completed-Pod CPU and memory series plus Pod-label history containing the stable CronJob template labels. Metrics Server exposes only the latest resource samples and is not a historical database.

The `checkpoint` and `prometheus` storage modes are alternatives: Prometheus mode does not maintain `VerticalPodAutoscalerCheckpoint` objects.

```bash
kubectl -n data get verticalpodautoscalercheckpoints.autoscaling.k8s.io
kubectl -n kube-system logs deploy/vpa-recommender --since=20m
```

In checkpoint mode, aggressive `ttlSecondsAfterFinished` does not erase samples already serialized into a healthy checkpoint, but it can reduce forensic data. Short Prometheus retention reduces the history available for Prometheus-based reloads. Verify the storage mode you actually use.

## Official Documentation

- [VPA target selector support for Job and CronJob](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/target/fetcher.go)
- [VPA update modes](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md#example-vpa-configuration)
- [VPA recommender and checkpoint architecture](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/components.md)
- [VPA recommendation algorithm source](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/recommender/logic/recommender.go)
- [Kubernetes Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes CronJobs](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)

## Conclusion

Right-size recurring batch Pods across executions, not during one brief execution. Target the durable CronJob, keep stable template labels, preserve checkpoints or compatible Prometheus history, and use `Initial` after representative observation. Conservative first-run bounds and idempotent job design remain necessary because no autoscaler can infer an unseen input spike.
