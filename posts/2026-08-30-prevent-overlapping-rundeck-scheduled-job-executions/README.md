# How to Prevent Overlapping Rundeck Executions for Long-Running Scheduled Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, Automation, Job Scheduling, Reliability

Description: Keep long-running Rundeck schedules from overlapping by using single execution, timeouts, queues, and resource-level locking where job boundaries are not enough.

---

A job scheduled every ten minutes will eventually overlap if one run sometimes takes fifteen. Overlap can duplicate deployments, race database maintenance, or let two cleanup runs delete data based on different snapshots.

Rundeck's default single-execution setting solves the common case, but it is only a per-job guard. A reliable design also decides what should happen to triggers that arrive while a run is active and whether different jobs contend for the same external resource.

## Keep Multiple Executions Disabled

Rundeck jobs use **Single Execution** by default. In the job editor, leave **Multiple Executions** set to **No**. In an exported job definition, make the intent explicit:

```yaml
- name: Nightly inventory reconciliation
  group: maintenance
  multipleExecutions: false
  scheduleEnabled: true
  executionEnabled: true
  timeout: 45m
  schedule:
    crontab: "0 0 2 ? * * *"
  sequence:
    keepgoing: false
    strategy: node-first
    commands:
      - scriptfile: /opt/rundeck/jobs/reconcile-inventory.sh
```

With multiple executions disabled, Rundeck prevents another execution of that same job from running concurrently. This applies to manual and API starts as well as schedule triggers; it is not a reason to assume that every trigger is saved for later.

Monitor for prevented starts so missed work is visible. If every scheduled occurrence must eventually run, use a queue rather than treating single execution as a durable backlog.

## Choose Reject, Queue, or Coalesce

There are three useful policies:

- **Reject while busy:** Leave Multiple Executions disabled. This is usually right for periodic reconciliation because the active run should already converge the system.
- **Queue every trigger:** Rundeck's per-job Job Queue feature accepts starts and runs them sequentially. The official feature is commercial, persistent across restart, and overrides the Multiple Executions setting. The current Job Queue documentation also says jobs with secure options are not supported, so do not choose this policy until every required option is compatible. Confirm that queued duplicates make sense before enabling it.
- **Coalesce to one later run:** Record that another reconciliation is needed, then run once after the current execution finishes. Rundeck's basic single-execution switch does not itself implement this policy; use an external scheduler, event system, or an idempotent control job.

Do not enable Multiple Executions merely to stop rejected schedule events. That converts a visibility issue into an unsafe concurrency issue.

## Put a Bound on Runtime

A stuck execution can block every future start. Configure a realistic job timeout and make the workload respond safely to termination:

```yaml
timeout: 2h
```

Rundeck accepts seconds or unit-bearing values such as `2h 30m`. A timeout halts a directly invoked job as if it were killed. The official job documentation notes that a job's timeout and retry settings do not apply when that job is run as a Job Reference, so put the effective timeout on the directly invoked orchestration job as well.

Also give network calls and database operations their own shorter timeouts. A top-level two-hour timeout is not a substitute for bounded SSH, HTTP, or SQL operations.

## Protect Shared Resources Across Different Jobs

Single execution is keyed to one Rundeck job. It does not stop `Rebuild search index` and `Deploy search schema` from running together even if they mutate the same service.

Use a resource-scoped lock outside the per-job setting when several jobs share a critical section. Suitable choices include:

- a database advisory lock;
- a lease in a strongly consistent coordination system;
- a cloud-provider operation lock; or
- a purpose-built Rundeck locking plugin whose failure and lease behavior you have tested.

A simple database-backed worker should acquire the lock atomically, attach the Rundeck execution ID as owner metadata, renew a bounded lease if needed, and release it in a cleanup path. Never use an unbounded lock that survives a crashed worker forever.

File locks work only when all executions share one filesystem and host. They are not a distributed lock across Rundeck cluster members or remote runners.

## Make the Work Idempotent

Concurrency controls can fail during process crashes, network partitions, or operator intervention. Design the underlying operation so a replay is safe:

- use an operation or idempotency key derived from the intended change, not only the execution ID;
- write checkpoints after durable steps;
- compare current and desired state before mutating;
- make cleanup conditional on ownership; and
- ensure a retry cannot delete or overwrite a newer run's output.

For schedules that poll and reconcile state, prefer a job that converges the latest desired state. If three triggers arrive during one slow run, a single later reconciliation is usually more useful than replaying three identical snapshots.

## Observe the Guard

Create alerts for executions that approach the schedule interval, exceed their timeout, or are repeatedly prevented from starting. Record at least:

- scheduled fire time and actual start time;
- active execution ID;
- lock owner and acquisition duration;
- queue depth, when queuing is enabled; and
- last successful completion time.

Test the policy by starting a controlled long run and attempting a second manual or API execution. Then restart the Rundeck service in a staging environment and verify how active executions, locks, and any queue recover.

## Official Documentation

- [Rundeck: Creating Jobs — Multiple Executions, Timeout, and Retry](https://docs.rundeck.com/docs/manual/jobs/creating-jobs.html#multiple-executions)
- [Rundeck Job Queue](https://docs.rundeck.com/docs/manual/jobs/job-queue.html)
- [Rundeck Job YAML format](https://docs.rundeck.com/docs/manual/document-format-reference/job-yaml-v12.html)
- [Rundeck Job Workflows](https://docs.rundeck.com/docs/manual/jobs/job-workflows.html)

## Conclusion

Leave Multiple Executions disabled for the basic per-job guarantee, add a timeout so a stuck run cannot block forever, and decide explicitly whether later triggers should be rejected, queued, or coalesced. When different jobs touch the same resource, extend the protection with a bounded distributed lock and idempotent operations.
