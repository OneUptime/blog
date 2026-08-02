# Argo CronWorkflow Missed a Run: Debugging Time Zones, Starting Deadlines, and Concurrency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, Kubernetes, CronWorkflow, Scheduling, Time Zones, Concurrency Policy, Debugging

Description: Diagnose missing Argo CronWorkflow runs by checking the resolved schedule, IANA time zone, suspension and expressions, recovery deadline, concurrency policy, and controller state.

---

When an Argo `CronWorkflow` appears to miss a run, first determine which event is missing:

- No child `Workflow` was created at the expected time. Investigate CronWorkflow scheduling.
- A child `Workflow` was created but its Pods did not start or it later failed. Investigate that Workflow, its Pods, quotas, locks, and templates.

The CronWorkflow controller's job is to create a normal Argo Workflow from `spec.workflowSpec`. It does not guarantee that the new Workflow's Pods will schedule immediately. Keeping those two layers separate prevents a Kubernetes scheduling problem from being mistaken for a cron problem.

## Start with the Effective CronWorkflow State

Use both the Argo CLI and Kubernetes resource output:

```bash
argo cron get -n batch nightly-reports
kubectl -n batch get cronworkflow nightly-reports -o yaml
kubectl -n batch describe cronworkflow nightly-reports
```

The CLI reports fields such as schedules, suspension, starting deadline, concurrency policy, last scheduled time, next scheduled time, and active Workflows. The CLI currently notes that its `NextScheduledTime` calculation assumes the workflow controller uses UTC, so do not rely on that field alone for a CronWorkflow configured with another time zone. The YAML is the authoritative stored object and exposes `.status.lastScheduledTime` and `.status.active` for closer inspection.

Then list child Workflows created by this CronWorkflow:

```bash
kubectl -n batch get workflows \
  -l workflows.argoproj.io/cron-workflow=nightly-reports \
  --sort-by=.metadata.creationTimestamp
```

If a child exists near the expected time, inspect it with `argo get` and `kubectl describe`. The CronWorkflow did schedule; the failure is downstream.

## Use the Current `schedules` Field

A production CronWorkflow should make all schedule behavior explicit:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: CronWorkflow
metadata:
  name: nightly-reports
  namespace: batch
spec:
  schedules:
    - "0 2 * * *"
  timezone: Europe/London
  suspend: false
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 900
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3

  workflowMetadata:
    labels:
      app.kubernetes.io/name: nightly-reports

  workflowSpec:
    entrypoint: report
    activeDeadlineSeconds: 7200
    templates:
      - name: report
        container:
          image: alpine:3.23
          command: [sh, -c]
          args: ["date -u; echo generating report"]
```

Current Argo documentation defines `schedules` as a required, non-empty list. It allows more than one schedule. The older singular `schedule` field was deprecated in v3.6 and removed in v4.0; use the schema supported by the installed controller and use `schedules` on v3.6 and later.

The five-field expression above means 02:00 every day in `Europe/London`, not necessarily 02:00 UTC.

## Verify the Time Zone Before the Cron Expression

`spec.timezone` accepts an IANA location such as `Europe/London`, `America/Los_Angeles`, or `Etc/UTC`. If it is omitted, Argo uses the controller machine's time zone. That default can change when the controller image or deployment changes, so explicitly setting the zone makes the schedule portable.

Do not use a fixed abbreviation such as `PST` when the business requirement is Los Angeles civil time. An IANA location includes daylight-saving rules. Conversely, use `Etc/UTC` when the requirement is a stable UTC instant throughout the year.

When an operator reports “the 02:00 run is missing,” record all of these values:

- The expected wall-clock time and IANA time zone.
- The equivalent UTC instant for that date.
- `.status.lastScheduledTime` and the child Workflow creation timestamps.
- The schedule and time zone currently stored in the cluster, not only in Git.

This catches the common case where the Workflow ran correctly but appeared under a different UTC date or hour in logs and dashboards.

## Account for Daylight Saving Time

Argo's scheduler applies the selected time zone's daylight-saving rules. A local time in the skipped spring-forward hour may not exist, and a local time in the repeated autumn hour may occur twice.

For a job that must run once per local day even when 02:30 is skipped, the official docs demonstrate two schedules plus a `when` guard:

```yaml
spec:
  schedules:
    - "30 2 * * *"
    - "0 3 * * *"
  timezone: America/Los_Angeles
  when: >-
    {{= cronworkflow.lastScheduledTime == nil ||
        (now() - cronworkflow.lastScheduledTime).Seconds() > 3600 }}
```

On ordinary days, the 02:30 schedule runs and the expression suppresses 03:00. On a spring-forward date where 02:30 does not occur, 03:00 acts as the fallback.

For a repeated autumn hour, the official pattern uses one schedule and a sufficiently long interval since `cronworkflow.lastScheduledTime` to suppress the second occurrence:

```yaml
spec:
  schedules:
    - "30 1 * * *"
  timezone: America/Los_Angeles
  when: >-
    {{= cronworkflow.lastScheduledTime == nil ||
        (now() - cronworkflow.lastScheduledTime).Seconds() > 7200 }}
```

Choose the interval for the actual schedules and business rule. Test upcoming daylight-saving transitions in the selected location rather than assuming a fixed UTC offset.

## Understand `startingDeadlineSeconds`

`startingDeadlineSeconds` is recovery grace for a schedule the controller could not create on time. It is measured from the missed scheduled time.

Suppose a CronWorkflow should run at 02:00 and the controller becomes available at 02:07:

- With `startingDeadlineSeconds: 900`, the run is seven minutes late but within the 15-minute grace, so Argo may create a recovery Workflow.
- With `startingDeadlineSeconds: 300`, the five-minute grace has expired, so that occurrence is not created.
- With the default `0`, late-run recovery is disabled.

Argo's current documentation states that only a single instance is executed as a result of this setting, even if more than one schedule was missed. It is not a general historical backfill mechanism.

Select a value from data freshness and duplicate-processing requirements. A frequent idempotent reconciliation job can usually tolerate a longer grace. A market-window action or non-idempotent charge may need a short deadline and an explicit operator-controlled backfill.

This field does **not** limit the runtime of a child Workflow. Use `workflowSpec.activeDeadlineSeconds` or template timeout fields for execution deadlines.

## Check `concurrencyPolicy`

The concurrency policy decides what happens when a scheduled time arrives while an older child Workflow is still active:

- `Allow` permits overlapping Workflows and is the default.
- `Forbid` does not create the new Workflow while an older one is active.
- `Replace` terminates old active Workflows before scheduling the new one.

With `Forbid`, an absent child Workflow can be intentional. Inspect `.status.active`, then inspect the referenced Workflow. It may be legitimately long-running, suspended, waiting for a lock, stuck on an unschedulable Pod, or retrying.

Do not switch blindly to `Allow`. Overlap can cause duplicate writes or overload a dependency. Fix the duration or stuck run, make processing idempotent, or choose a policy that reflects the job's semantics. Use `Replace` only when aborting the previous run is safe; external side effects may already have happened before it is terminated.

## Look for Other Scheduling Gates

Several fields can deliberately suppress creation even when the cron expression matches:

### Suspension

`spec.suspend: true` stops new scheduling. It can be set through GitOps, directly, or with `argo cron suspend`. Check the live object for drift and resume it intentionally:

```bash
argo cron resume -n batch nightly-reports
```

Do not assume every occurrence during a long suspension will be replayed. Use Argo's explicit Cron backfill workflow when historical dates must be processed.

### `when`

`spec.when` is evaluated on each schedule hit, and Argo creates the Workflow only when it evaluates to true. Review the expression, `cronworkflow.lastScheduledTime`, and time arithmetic. An expression used for DST suppression or a business calendar can be the direct reason a run is absent.

### Stop strategy

`spec.stopStrategy.expression` stops future scheduling when its expression becomes true. Current Argo supports the `cronworkflow.succeeded` and `cronworkflow.failed` counters in this expression. Inspect it if scheduling stopped after a particular number of completions.

### Invalid or rejected updates

Check `kubectl describe` events, GitOps sync status, and the stored resource generation. The YAML in a repository does not prove that the API server accepted it or that the intended namespace received it.

## Inspect the Workflow Controller

If the resource is valid and no policy explains the missing child, inspect the controller responsible for the CronWorkflow namespace:

```bash
kubectl -n argo get pods -l app.kubernetes.io/name=workflow-controller
kubectl -n argo logs deployment/workflow-controller --since=2h
kubectl -n argo get events --sort-by=.lastTimestamp
```

Adjust the namespace and labels for the installation. Look for restarts, failed leader election, authorization errors, malformed schedules, time-zone loading errors, and failure to create a Workflow.

The documented `CRON_SYNC_PERIOD` environment variable defaults to 10 seconds and controls how often CronWorkflows are synchronized. A small reconciliation delay is not the same as a missed run. Before changing this controller setting, establish that the scheduler is consistently late beyond the required tolerance and that controller health is otherwise normal.

Also verify:

- The controller watches the CronWorkflow's namespace.
- Its service account has the verbs required by the installed release. Current v4 manifests include get, list, watch, update, and patch for CronWorkflows, plus create, get, list, watch, update, patch, and delete for Workflows.
- High-availability controller replicas agree on time and leader election is healthy.
- Cluster clock synchronization is working.

## A Reliable Triage Order

Use this order to minimize guesswork:

1. Convert the expected local schedule to UTC for the date in question.
2. Read the live `schedules`, `timezone`, `suspend`, `when`, `stopStrategy`, `startingDeadlineSeconds`, and `concurrencyPolicy` fields.
3. Check `.status.lastScheduledTime` and `.status.active`.
4. Search for a child Workflow by the CronWorkflow label.
5. If a child exists, debug that Workflow instead of the CronWorkflow.
6. If no child exists, decide whether DST, suspension, an expression, `Forbid`, or an expired starting deadline explains it.
7. Check resource events and controller logs for the exact scheduled window.
8. Backfill deliberately only after making the job idempotent and confirming which logical dates are missing.

Alert on both sides of the boundary: “no Workflow created within the expected window” detects scheduling failures, while Workflow phase and duration alerts detect failed or stuck runs. A dashboard that only shows successful completions cannot distinguish the two.

## Official Documentation

- [Argo Workflows: Cron Workflows](https://argo-workflows.readthedocs.io/en/latest/cron-workflows/)
- [Argo Workflows: Cron Backfill](https://argo-workflows.readthedocs.io/en/latest/cron-backfill/)
- [Argo Workflows: Workflow Variables](https://argo-workflows.readthedocs.io/en/latest/variables/)
- [Argo Workflows: Environment Variables](https://argo-workflows.readthedocs.io/en/latest/environment-variables/)
- [Argo Workflows: Field Reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
