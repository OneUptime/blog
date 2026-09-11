# Correlate Scheduled Jobs and Batch Runs Without HTTP Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation ID, Kubernetes, CronJob, Logging, Observability

Description: Create correlation at the scheduler boundary, distinguish scheduled occurrences from execution attempts, and join batch shards and backfills without HTTP context.

---

Scheduled work has no incoming request to supply a correlation ID. That is not a missing prerequisite: the scheduler or job launcher is an execution boundary and can assign identity itself.

Separate the scheduled occurrence, the execution attempt, and any batch partition. A scheduled occurrence may be attempted more than once, and one batch may run across several Pods. A single random ID generated independently by every process cannot express those relationships.

## Choose identities by what they represent

| Field | Meaning |
| --- | --- |
| `job_name` | stable job definition, such as nightly-ledger |
| `run_id` | one scheduled occurrence or manually launched run |
| `attempt_id` | one process execution of that run |
| `partition_id` | a bounded shard or partition identifier |
| `backfill_id` | a deliberate group of historical runs |

Generate `run_id` in the launcher and persist it with the job record. Reuse it for retries of that run. Generate a fresh `attempt_id` whenever a worker execution starts. For backfills, retain a separate run ID per logical date or partition set and use `backfill_id` to group the campaign.

Do not use the machine hostname as the run identity. Workers are reused, and a restarted execution may move to another machine.

## Use Kubernetes Job identity for practical correlation

For Kubernetes CronJobs, the created Job is a useful run boundary. Its Pods share the Job name, while each Pod has its own UID. Inject both using the downward API:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-ledger
spec:
  schedule: "0 2 * * *"
  timeZone: "Etc/UTC"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: ledger
              image: registry.example.com/ledger:1.0.0
              env:
                - name: JOB_NAME
                  valueFrom:
                    fieldRef:
                      fieldPath: metadata.labels['batch.kubernetes.io/job-name']
                - name: POD_UID
                  valueFrom:
                    fieldRef:
                      fieldPath: metadata.uid
                - name: POD_NAMESPACE
                  valueFrom:
                    fieldRef:
                      fieldPath: metadata.namespace
```

Replace the illustrative image with your built job image. Combine a cluster identifier, namespace, and Job name when logs from several clusters share a backend. A Job name alone is not globally unique across all clusters or time.

`restartPolicy: Never` makes failed Pod executions visible as distinct Pods for this example. Still generate an application attempt ID at process startup, since deployment changes and other launchers may allow multiple executions within a Pod.

The [CronJob documentation](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/) covers concurrency and scheduling behavior. A CronJob is not an exactly-once execution guarantee; application effects must tolerate duplicate or missed execution according to the workload's recovery design.

## Initialize logging at process startup

A Python batch entry point can establish a consistent record shape:

```python
import json
import os
from datetime import datetime, timezone
from uuid import uuid4

cluster = os.environ.get("CLUSTER_ID", "local")
namespace = os.environ.get("POD_NAMESPACE", "default")
job = os.environ.get("JOB_NAME")
run_id = os.environ.get("RUN_ID") or (
    f"{cluster}/{namespace}/{job}" if job else uuid4().hex
)
attempt_id = uuid4().hex


def log(event, **fields):
    print(json.dumps({
        **fields,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        "run_id": run_id,
        "correlation_id": run_id,
        "attempt_id": attempt_id,
        "pod_uid": os.environ.get("POD_UID"),
    }), flush=True)


log("batch.started")
try:
    for partition in range(4):
        log("partition.completed", partition_id=partition)
except Exception:
    log("batch.failed")
    raise
else:
    log("batch.completed")
```

For an external scheduler, set `RUN_ID` explicitly to an opaque durable value. The slash-separated Kubernetes value is for local logs; if you propagate it through a header with a narrower format contract, use a stored opaque ID or a defined bounded encoding.

Keep large input manifests and credentials out of the context fields. Store a durable manifest reference and version if you need to reproduce the batch later.

## Preserve the intended schedule time separately

Execution start time is not necessarily scheduled time. A delayed controller or unavailable cluster can start a job well after its intended occurrence.

Kubernetes v1.32 and later annotate created Jobs with `batch.kubernetes.io/cronjob-scheduled-timestamp`. That annotation belongs to the Job, not automatically to every Pod. A Pod downward-API field reference cannot directly read its owner's annotation. Use an authorized launcher/controller or a narrowly permitted Job lookup to record it when needed.

Store both scheduled time and actual start time. This lets you distinguish scheduling delay from slow processing and avoids accidentally labeling a delayed run with the wrong business date.

## Propagate context to partitions and downstream work

When a coordinator sends partition work to a queue, include `run_id`, `partition_id`, and the relevant trace context in each envelope. Each worker creates a new attempt ID and a processing span.

For a short batch, child spans can share one trace. For very large or delayed batches, separate traces with links and a durable run ID may be easier to retain and inspect. A log search by run ID should still work if some traces were not sampled.

Keep metric labels bounded: job type, outcome, and partition category are appropriate candidates. A unique run ID per occurrence would create a continuously growing metric series set.

## Verify retries, overlap, and backfills

Force a Pod failure and confirm the replacement retains the run ID but receives a new attempt ID. Launch a second Job and confirm it has a different run ID. Test a backfill with several logical dates and verify the campaign identifier groups them without collapsing their individual runs.

Also test the case where the worker crashes before writing its final log. The scheduler's Job status and durable run record should explain the missing completion event; an application log alone cannot prove the run finished.

## Conclusion

Generate correlation at the scheduler or launcher, preserve it for one logical run, and assign fresh attempt IDs to executions. Record schedule time, partition identity, and durable run state separately so retries and backfills remain understandable without any HTTP request context.

## Official Documentation

- [Kubernetes CronJobs](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)
- [Kubernetes downward API](https://kubernetes.io/docs/tasks/inject-data-application/downward-api-volume-expose-pod-information/)
- [OpenTelemetry span links](https://opentelemetry.io/docs/specs/otel/trace/api/#link)
