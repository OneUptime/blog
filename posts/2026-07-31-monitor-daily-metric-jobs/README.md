# How to Monitor Infrastructure Jobs That Produce Metrics Only Once per Day

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Batch Jobs, Node Exporter, Textfile Collector, Pushgateway, Alerting

Description: Persist last-run state from daily infrastructure jobs and alert on timestamp age, metric absence, exporter health, and stale Pushgateway groups.

---

Prometheus cannot reliably scrape a metric endpoint that exists for only a few seconds once per day. The job can start and finish between two scrapes, leaving no sample and no evidence that it ran.

Persist the latest job state somewhere Prometheus can scrape continuously. For machine-bound jobs, use Node Exporter's textfile collector. For a service-level batch job not tied to one machine, the Pushgateway is the limited, intended use case. In either design, export a last-success timestamp rather than trying to catch a transient `1`.

## Model the State You Need

For a daily backup, reconciliation, or maintenance job, useful gauges are:

```text
infra_backup_last_success_unixtime_seconds
infra_backup_last_completion_unixtime_seconds
infra_backup_last_duration_seconds
infra_backup_last_run_success
infra_backup_last_records_processed
```

The key metric is the last time the job succeeded. A last-completion timestamp distinguishes “not running at all” from “running and failing.” A `last_run_success` gauge describes the most recent attempt but cannot replace the success timestamp: one successful run after several failures sets it back to `1` without showing how late the success was.

Use a metric value containing Unix time in seconds. Do not attach an explicit exposition timestamp to the sample. Node Exporter's textfile collector does not support timestamps, and Prometheus guidance generally expects scrape time to be the sample timestamp.

## Use the Textfile Collector for Machine-Bound Jobs

Enable a dedicated directory:

```text
node_exporter \
  --collector.textfile.directory=/var/lib/node_exporter/textfile_collector
```

Node Exporter reads files ending in `.prom`. Write a temporary file in the same directory and rename it atomically so a scrape never sees a partial metric family.

On every completion, write the latest attempt state:

```bash
metric_dir=/var/lib/node_exporter/textfile_collector
finished_at=$(date +%s)
duration_seconds=183
success=0

tmp_file=$(mktemp "${metric_dir}/infra_backup_run.prom.XXXXXX")
trap 'rm -f "$tmp_file"' EXIT

printf '%s\n' \
  '# HELP infra_backup_last_completion_unixtime_seconds Last backup completion as Unix time in seconds.' \
  '# TYPE infra_backup_last_completion_unixtime_seconds gauge' \
  "infra_backup_last_completion_unixtime_seconds ${finished_at}" \
  '# HELP infra_backup_last_duration_seconds Duration of the most recent backup run.' \
  '# TYPE infra_backup_last_duration_seconds gauge' \
  "infra_backup_last_duration_seconds ${duration_seconds}" \
  '# HELP infra_backup_last_run_success Whether the most recent backup run succeeded.' \
  '# TYPE infra_backup_last_run_success gauge' \
  "infra_backup_last_run_success ${success}" \
  > "${tmp_file}"

mv "${tmp_file}" "${metric_dir}/infra_backup_run.prom"
trap - EXIT
```

On success, update a separate last-success file:

```bash
metric_dir=/var/lib/node_exporter/textfile_collector
succeeded_at=$(date +%s)

tmp_file=$(mktemp "${metric_dir}/infra_backup_success.prom.XXXXXX")
trap 'rm -f "$tmp_file"' EXIT

printf '%s\n' \
  '# HELP infra_backup_last_success_unixtime_seconds Last successful backup as Unix time in seconds.' \
  '# TYPE infra_backup_last_success_unixtime_seconds gauge' \
  "infra_backup_last_success_unixtime_seconds ${succeeded_at}" \
  > "${tmp_file}"

mv "${tmp_file}" "${metric_dir}/infra_backup_success.prom"
trap - EXIT
```

Keeping success in a separate file means a failed run updates completion and status without erasing the last known success. The files remain after the process exits and across Node Exporter scrapes.

Run the job and Node Exporter under identities that permit the job to create and rename files while preventing unrelated users from injecting metrics. Also ensure the Node Exporter identity can read the final file: `mktemp` commonly creates mode `0600`, so separate service users need deliberate group ownership and file permissions before the rename. The rename must stay on the same filesystem to be atomic.

## Alert on Age, Not on a Brief Event

For a job expected once every 24 hours:

```promql
time() - infra_backup_last_success_unixtime_seconds > 27 * 60 * 60
```

The three-hour margin is only an example. Calculate the threshold from:

```text
maximum schedule interval
+ maximum expected runtime
+ scheduler and scrape delay
+ operating tolerance
```

Local-time daily schedules can be 23 or 25 hours apart around daylight-saving changes. Use UTC schedules where appropriate or include the calendar variation.

Prometheus alerting guidance recommends allowing enough time for roughly two full runs for many batch jobs. For a daily job, a threshold around 51 hours may be quieter and tolerate one failed attempt. If the business cannot tolerate one missed daily run, run the job more frequently so one retry opportunity exists before paging.

Add a separate most-recent-failure alert:

```promql
infra_backup_last_run_success == 0
and
time() - infra_backup_last_completion_unixtime_seconds < 6 * 60 * 60
```

The age condition prevents a stale failure state from firing forever after the job stops running; the last-success age rule covers that case.

## Alert on Absence Without Calling It Zero

For each currently scrapeable Node Exporter target expected to have the job:

```promql
up{job="node"} == 1
unless on (job, instance)
infra_backup_last_success_unixtime_seconds{job="node"}
```

Use a `for` period to allow initial deployment and atomic file replacement:

```yaml
- alert: InfrastructureBackupMetricMissing
  expr: |
    up{job="node"} == 1
    unless on (job, instance)
    infra_backup_last_success_unixtime_seconds{job="node"}
  for: 15m
```

Also alert separately on:

```promql
up{job="node"} == 0
```

A new host may never have succeeded and therefore have no success file. Maintain an expected-job inventory or create an explicit initialization state during provisioning so the missing-series rule preserves the intended host labels.

Do not use:

```promql
infra_backup_last_success_unixtime_seconds or vector(0)
```

Unix time zero looks extremely old, but `vector(0)` creates one unlabeled series rather than one result for every missing host.

## Use Pushgateway Only for Service-Level Batch Jobs

Prometheus recommends Pushgateway for a narrow case: a service-level batch job whose lifecycle is not tied to one specific machine. Examples include a global directory reconciliation or a daily tenant billing rollup.

Push the latest state to a stable grouping key:

```bash
finished_at=$(date +%s)
duration_seconds=412

printf '%s\n' \
  '# TYPE tenant_reconcile_last_success_unixtime_seconds gauge' \
  "tenant_reconcile_last_success_unixtime_seconds ${finished_at}" \
  '# TYPE tenant_reconcile_last_duration_seconds gauge' \
  "tenant_reconcile_last_duration_seconds ${duration_seconds}" \
  | curl --request PUT --fail --show-error \
      --data-binary @- \
      https://pushgateway.example.internal:9091/metrics/job/tenant_reconcile
```

`PUT` replaces all metrics in that grouping key, which makes the payload the complete current state. A `POST`—the method curl otherwise chooses for `--data-binary`—replaces only metric families present in the request and can leave removed metric families behind.

Do not add a machine `instance` grouping label for a service-level job unless machine identity is semantically required. Changing instance labels creates persistent groups that must be deleted later.

The Pushgateway automatically exposes `push_time_seconds` for the last successful change to a group. It measures successful delivery to the gateway, not successful business work. If a failed job pushes a failure metric, `push_time_seconds` becomes fresh. Use your own last-success gauge for job outcome.

Scrape the Pushgateway with label preservation enabled:

```yaml
scrape_configs:
  - job_name: pushgateway
    scheme: https
    honor_labels: true
    static_configs:
      - targets:
          - pushgateway.example.internal:9091
```

Without `honor_labels: true`, Prometheus renames pushed `job` and `instance` labels to `exported_job` and `exported_instance` when they conflict with target labels. That changes the label set used by grouping-key alerts and dashboards.

## Respect Pushgateway Lifecycle Semantics

The Pushgateway is a metrics cache:

- it does not create per-job `up` semantics;
- it keeps the last pushed series until they are replaced or explicitly deleted;
- retired grouping keys can remain forever; and
- a shared gateway is a failure domain and bottleneck.

Scrape the gateway itself and monitor its `up` series. Delete a grouping key through the Pushgateway API when the job is permanently retired or its grouping labels change. Do not delete the group after every successful recurring run; doing so recreates the gap the gateway was meant to bridge.

Secure both push and scrape paths. Anyone allowed to write to the gateway can create or change exposed metrics for grouping keys they can reach under the gateway's access model.

## Do Not Alert on `increase()` Alone

This looks attractive:

```promql
increase(infra_backup_runs_total[24h]) == 0
```

It has edge cases:

- one daily increment can fall just outside the moving range;
- a reset needs enough samples for correct interpretation;
- no series produces no alert element;
- scrape gaps reduce evidence; and
- the expression does not say when the last success occurred.

A persistent last-success timestamp maps directly to the operational question. Keep a counter as additional history if useful, but do not make it the only liveness signal.

## Validate the Full Daily Cycle

Test:

1. a successful run updates completion, success, duration, and business counts;
2. a failed run updates completion and failure but preserves the prior success timestamp;
3. a partial file is never visible during a scrape;
4. Node Exporter restart preserves textfile state;
5. a host reboot preserves or deliberately reinitializes state;
6. a missing file triggers a presence alert;
7. a stopped exporter triggers target health rather than a fake job failure;
8. clock synchronization keeps `time() - last_success` meaningful;
9. a Pushgateway grouping-key change deletes the retired group; and
10. the threshold behaves correctly around schedule delay and daylight-saving transitions.

The job runs once per day, but its monitoring state must be continuously scrapeable.

## Official Documentation

- [Prometheus instrumentation guidance for batch jobs](https://prometheus.io/docs/practices/instrumentation/#batch-jobs)
- [Node Exporter textfile collector and atomic-write example](https://github.com/prometheus/node_exporter#textfile-collector)
- [Prometheus guidance on when to use the Pushgateway](https://prometheus.io/docs/practices/pushing/)
- [Prometheus Pushgateway API and `push_time_seconds`](https://github.com/prometheus/pushgateway)
- [Prometheus pushing metrics](https://prometheus.io/docs/instrumenting/pushing/)
- [Prometheus alerting guidance for batch jobs](https://prometheus.io/docs/practices/alerting/#batch-jobs)
- [Prometheus `time()` function](https://prometheus.io/docs/prometheus/latest/querying/functions/#time)
- [Prometheus `absent_over_time()`](https://prometheus.io/docs/prometheus/latest/querying/functions/#absent_over_time)
- [Prometheus text exposition format](https://prometheus.io/docs/instrumenting/exposition_formats/)
