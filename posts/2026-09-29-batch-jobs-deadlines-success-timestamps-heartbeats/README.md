# How to Monitor Batch Jobs with Deadlines, Last-Success Timestamps, and Heartbeats Instead of `up`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Prometheus, Batch Job, Pushgateway

Description: Monitor scheduled work with durable completion evidence, independent deadlines and meaningful progress heartbeats instead of exporter availability.

A batch process may start, finish and exit between two Prometheus scrapes. Meanwhile the Pushgateway holding its last result can remain perfectly healthy after the scheduler has stopped launching jobs. Neither process availability nor `up{job="pushgateway"}` answers whether today's required work completed.

Design batch monitoring around three questions: was the required run completed, did it finish before its deadline, and is an active run still making progress? These need durable state and an expectation that does not depend on the job running successfully.

## Persist success only after the business operation succeeds

Expose a gauge such as:

```text
batch_last_success_timestamp_seconds{job_name="daily-ledger"} 1790646000
```

Update it only after output is committed and the success criteria are satisfied. A process exit code can be useful evidence, but success may also require a complete manifest, verified row count or published object. Keep the previous successful timestamp when a later attempt fails.

Store state outside an ephemeral process, for example in a small status service, scheduler database or suitable Pushgateway deployment. Prometheus's [Pushgateway guidance](https://prometheus.io/docs/practices/pushing/) identifies service-level batch jobs as an appropriate use case while explaining the lifecycle limitations of pushed metrics.

Use a stable grouping key such as job name and environment. Creating a new metric label for every run accumulates identities and complicates cleanup. Keep run IDs in job history and logs.

## Encode the expected run independently

A daily “last success older than 24 hours” rule is simple, but it may page before today's normal finish time or miss a changed schedule. For deadline-sensitive work, have the scheduler or configuration exporter supply:

```text
batch_required_success_after_timestamp_seconds{job_name="daily-ledger"} 1790640000
batch_completion_deadline_timestamp_seconds{job_name="daily-ledger"} 1790647200
```

These are custom metrics. The first identifies the earliest completion time that can satisfy the required run; the second is its deadline. The illustrative values must be generated from the actual schedule, including timezone and daylight-saving rules.

A deadline failure expression can be:

```promql
(
  batch_last_success_timestamp_seconds
  < on (job_name)
  batch_required_success_after_timestamp_seconds
)
and on (job_name)
(
  batch_completion_deadline_timestamp_seconds < time()
)
```

Include environment, cluster or other uniqueness labels in every match where needed. This example assumes a single nonoverlapping run and that any success after the required boundary satisfies it. For overlapping runs, backfills or partition-specific requirements, a timestamp comparison alone is insufficient: the scheduler must export whether the exact required run or partition has succeeded.

## Alert when success evidence is missing

A newly configured job may have no success timestamp. The comparison above then returns no result. Add an explicit absence condition against the expected set:

```promql
(batch_completion_deadline_timestamp_seconds < time())
unless on (job_name)
batch_last_success_timestamp_seconds
```

Monitor the schedule exporter itself. If both expectation and observation vanish together, these rules have no basis for deciding anything. Show “expectation unavailable” rather than interpreting it as a job with no upcoming deadline.

The [PromQL operator documentation](https://prometheus.io/docs/prometheus/latest/querying/operators/) explains why unmatched vector elements disappear from arithmetic and comparisons, and why `unless` is useful for the missing-evidence branch.

## Use meaningful heartbeats during long runs

Export `batch_running` and `batch_last_progress_timestamp_seconds` from durable run state. Update progress only when a checkpoint, partition or committed output advances. A background thread that updates every minute while the worker is deadlocked measures the thread, not useful progress.

Alert on old progress only while the required run is active:

```promql
(time() - batch_last_progress_timestamp_seconds > 900)
and on (job_name)
(batch_running == 1)
```

Choose the threshold from the longest legitimate checkpoint interval. Some tasks perform long indivisible operations; use stage-specific expectations where a universal heartbeat would be misleading. Also alert on a running state that outlives the job's maximum duration, since a crash can leave stale `batch_running=1` state behind.

## Preserve failure evidence across retries

Track attempts and terminal failures separately from last success. A retry may still meet the deadline; one failed attempt need not page. Conversely, repeated retries must not renew the completion deadline automatically.

When using Pushgateway, old series persist until removed. A successful scrape proves the gateway is reachable, and its push-time metadata proves a push occurred, but neither proves the business operation succeeded. Own deletion explicitly when a job is decommissioned, and avoid replacing a metric group in a way that erases the previous last-success value during a failed attempt.

## Conclusion

Batch reliability is about required output by a deadline. Persist success after commit, publish expectations independently, handle missing evidence explicitly and tie progress heartbeats to meaningful checkpoints. That detects skipped runs and stuck work even when every metrics endpoint remains available.
