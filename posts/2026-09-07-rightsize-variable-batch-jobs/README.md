# Rightsizing Batch Jobs with Variable Resource Profiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rightsizing, Capacity Planning, Kubernetes, Performance

Description: Size heterogeneous batch runs by job class, input features, runtime objectives, and per-run peaks instead of one misleading fleet-wide percentile.

---

Batch history often mixes tiny incremental runs with full rebuilds, retries, and unusually large customer inputs. A single percentile across every sample hides which kind of run produced the demand. The result is either an expensive request for every job or an undersized limit that fails the rare jobs that matter.

The solution is to make the job the unit of analysis and divide jobs into explainable classes.

## Collect one record per attempt

Record both input and outcome for every job attempt:

```json
{
  "job_type": "daily-import",
  "input_bytes": 18790481920,
  "records": 142000000,
  "partitions": 64,
  "cpu_seconds": 3812,
  "peak_cpu_cores": 3.7,
  "peak_working_set_mib": 6120,
  "read_bytes": 25100000000,
  "write_bytes": 8400000000,
  "runtime_seconds": 1044,
  "exit_reason": "completed",
  "attempt": 1
}
```

Use a short sampling interval to observe memory and CPU phases, but remember that samples can miss brief memory peaks. Where available, also collect a kernel-maintained peak such as cgroup v2 `memory.peak`; it measures cgroup memory usage, not just the working set. Average memory across the run is unsafe when one aggregation phase determines whether the process is OOM-killed.

Keep failed attempts. Removing OOM and timeout runs makes the surviving sample look artificially efficient. Label failures so logical errors do not become capacity demand.

## Classify jobs by a causal feature

Useful classes include job type, input-size band, partition count, algorithm, tenant, and full versus incremental mode. Choose features known before scheduling so the submission logic can select a resource class and set requests and limits before Kubernetes schedules the pods.

```text
small:  input < 5 GiB
medium: 5 GiB <= input < 50 GiB
large:  input >= 50 GiB
full-rebuild: separate class regardless of size
```

If peak memory grows with input bytes, fit a conservative model and retain a floor:

```text
memory request = max(class floor, intercept + bytes * slope) + safety margin
```

Do not use a complex predictor unless it is monitored for error. Three stable classes are usually safer than an opaque model that occasionally assigns a huge job to a tiny worker.

## Optimize cost per completed job

More CPU can shorten runtime enough to reduce cost, while extra memory may only prevent failure. Benchmark representative inputs across candidate sizes:

```text
job cost = allocated resource price * runtime
effective cost = total attempt cost / successful completions
```

Include retries, checkpoint storage, data transfer, and queue delay. A cheap shape that times out twice is not a saving.

Set a completion objective. A nightly process that must finish by 06:00 may need more parallelism during a short window even if a slower configuration has a lower compute rate.

## Separate requests, limits, and parallelism

In Kubernetes, requests drive scheduling. Limits constrain containers. Parallelism controls how many pods compete at once. Tune them independently:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: import-medium
spec:
  parallelism: 4
  completions: 32
  backoffLimit: 2
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: importer
        image: example/importer:4.2.1
        resources:
          requests:
            cpu: "2"
            memory: 6Gi
          limits:
            memory: 8Gi
```

Replace `example/importer:4.2.1` with your own importer image. The importer must coordinate distinct work items, such as by claiming one item per pod from a queue; `completions: 32` counts successful pods and does not partition the input. This example omits a CPU limit so the worker can use idle CPU, subject to cluster policy. That is not universally correct. Multi-tenant isolation or predictable performance may require a tested CPU limit.

Kubernetes Jobs retry failed pods according to `backoffLimit`; retries use more capacity and can duplicate external effects unless the job is idempotent. Set a deliberate failure policy instead of allowing capacity errors to multiply unnoticed.

## Match the compute pool to the classes

Offer node or instance shapes that can fit the largest supported request after system and DaemonSet overhead. AWS Batch compute environments similarly need a compute resource able to satisfy each job's requirements; otherwise jobs remain unschedulable.

Route exceptional jobs to a large-memory or high-CPU pool. Keep the common class on less expensive general-purpose capacity. When work is interruption-tolerant, checkpointing can make Spot or preemptible capacity useful, but account for restart time and deadline risk.

## Guard against skew inside a run

Partitioned jobs can have one hot partition. Track per-task input size, runtime, and peak memory, not only the job average. Consider adaptive partitioning before raising every worker to accommodate one recurring skewed key. Work stealing can redistribute independent tasks, but cannot reduce the memory needed by a single indivisible task.

Also distinguish initialization from steady work. A large init download can determine ephemeral storage, while the transform phase determines CPU and the reduce phase determines memory.

## Roll out class changes safely

Shadow-score recent history using the new rules. Count how many completed runs would have exceeded each proposed request or limit. Then canary by job class:

- start with replayable, idempotent jobs;
- compare runtime and cost with the current class;
- stop on increased OOMs, retries, timeouts, or queue age;
- retain the old class for immediate resubmission;
- review model error after new data shapes arrive.

Attach the class and model version to every job so later incidents are explainable.

## Conclusion

Rightsize batch work per run and per known class. Preserve failed attempts and phase peaks, use input features available before scheduling, and optimize cost per successful completion under a runtime objective. Route exceptional work to a suitable pool instead of making every run pay for the worst case.

## Official Documentation

- [Kubernetes Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes resource requests and limits](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [AWS Batch compute environments](https://docs.aws.amazon.com/batch/latest/userguide/compute_environments.html)
- [AWS Batch job resource requirements](https://docs.aws.amazon.com/batch/latest/APIReference/API_ResourceRequirement.html)
