# Validation Summary: How to Prevent Overlapping Rundeck Executions for Long-Running Scheduled Jobs

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Rundeck job execution, scheduling, Job References, and commercial Job Queue
- Rundeck YAML job definitions
- Quartz cron expressions
- Database advisory locks and distributed leases
- Linux file locking on local and shared filesystems
- Idempotent automation, timeouts, and operational observability

## Sources Consulted

- [Rundeck: Creating Jobs — Multiple Executions, Timeout, Retry, and Scheduled Jobs](https://docs.rundeck.com/docs/manual/jobs/creating-jobs.html)
- [Rundeck Job Queue (Commercial)](https://docs.rundeck.com/docs/manual/jobs/job-queue.html)
- [Rundeck JOB-YAML format](https://docs.rundeck.com/docs/manual/document-format-reference/job-yaml-v12.html)
- [Rundeck Job Workflows](https://docs.rundeck.com/docs/manual/jobs/job-workflows.html)
- [Rundeck Job Variables Reference](https://docs.rundeck.com/docs/manual/jobs/job-variables.html)
- [Rundeck API Reference — Running a Job and Executions](https://docs.rundeck.com/docs/api/)
- [Rundeck Remote Job Execution](https://docs.rundeck.com/docs/administration/configuration/remote-job-execution.html)
- [Quartz CronTrigger Tutorial](https://www.quartz-scheduler.org/documentation/quartz-2.3.0/tutorials/crontrigger.html)
- [etcd Concurrency API Reference](https://etcd.io/docs/v3.6/dev-guide/api_concurrency_reference_v3/)
- [PostgreSQL Explicit Locking — Advisory Locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS)
- [Linux `flock(2)` manual page](https://man7.org/linux/man-pages/man2/flock.2.html)

## Issues Found

- The opening said that a ten-minute schedule would eventually overlap when a run took fifteen minutes, without conditioning that statement on concurrent executions being allowed. It now states that overlap can occur when concurrency is allowed, which is consistent with Rundeck's default Single Execution behavior.
- The YAML job example omitted `description` and `loglevel`, both required by the documented JOB-YAML job map. Added a blank `description` and `loglevel: INFO`; the remaining fields, Quartz cron expression, workflow structure, `scriptfile`, and timeout value were valid.
- The Job Queue policy implied that every start would be accepted without mentioning the per-job queue-size limit. Added the documented behavior that an empty or `0` limit is unlimited and that a full finite queue rejects additional executions. Also clarified that persistence applies to queued executions across restart and stated the documented secure-option limitation precisely.
- The lease guidance did not explain how to prevent an expired owner from continuing to mutate the protected resource. Added ownership-loss handling plus fencing tokens or conditional writes for work that can outlive its lease.
- The file-lock statement required the same host in all cases, which was too absolute because `flock` propagation over NFS or SMB depends on protocol, server, kernel, and mount behavior. Reframed host-local locks accurately and required validation before relying on shared-filesystem locking across Rundeck hosts.

## Review Notes

- The post does not target a specific Rundeck release. It was checked against the current official documentation available on 2026-08-30.
- All four documentation links in the post resolve to the intended official Rundeck pages. The `job-yaml-v12.html` URL is a live legacy slug whose current page identifies the format as `job-yaml-v13`.
- The current Job Queue documentation labels the feature commercial and continues to state that jobs with secure options do not support queuing as of Rundeck 3.4.0.
