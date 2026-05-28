# Validation Summary: How to Configure Task Parallelism and Ordering Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Batch
- Cloud Batch Python client library (`google-cloud-batch`)
- Cloud Storage / Cloud Storage FUSE volumes
- Batch task groups, task parallelism, scheduling policies, runnables, and environment variables
- Bash, Python, and container runnables

## Sources Consulted
- Google Cloud Batch job creation and execution overview: https://cloud.google.com/batch/docs/create-run-job
- Google Cloud Batch REST API `projects.locations.jobs` reference: https://cloud.google.com/batch/docs/reference/rest/v1/projects.locations.jobs
- Google Cloud Batch Python `TaskGroup` reference: https://cloud.google.com/python/docs/reference/batch/latest/google.cloud.batch_v1.types.TaskGroup
- Google Cloud Batch Python `TaskSpec` reference: https://cloud.google.com/python/docs/reference/batch/latest/google.cloud.batch_v1.types.TaskSpec
- Google Cloud Batch Python `Runnable` and `Runnable.Container` references: https://cloud.google.com/python/docs/reference/batch/latest/google.cloud.batch_v1.types.Runnable and https://cloud.google.com/python/docs/reference/batch/latest/google.cloud.batch_v1.types.Runnable.Container
- Google Cloud Batch storage volumes guide: https://cloud.google.com/batch/docs/create-run-job-storage
- Google Cloud Batch Python `Volume` and `GCS` references: https://cloud.google.com/python/docs/reference/batch/latest/google.cloud.batch_v1.types.Volume and https://cloud.google.com/python/docs/reference/batch/latest/google.cloud.batch_v1.types.GCS
- Google Cloud Batch basic Python script job sample: https://cloud.google.com/batch/docs/samples/batch-create-script-job

## Issues Found
- The post implied that multiple task groups can be used as groups of parallel tasks in sequence. The current Batch v1 REST API says `taskGroups[]` supports only one task group now, so the introduction and task group explanation were clarified to avoid suggesting unsupported multi-task-group orchestration.
- The sequential execution section said setting `parallelism = 1` was enough to run tasks one after another in order. Official Batch documentation defines `IN_ORDER` as the scheduling policy that runs tasks one at a time in increasing task-index order, and the REST reference states `parallelism` must be 1 when `schedulingPolicy` is `IN_ORDER`. The explanation and Python example now set `task_group.scheduling_policy = batch_v1.TaskGroup.SchedulingPolicy.IN_ORDER`.
- The Cloud Storage volume example used `gcs.remote_path = "pipeline-workspace/"`, but the Batch GCS volume reference requires a bucket name or bucket subdirectory such as `bucket_name/subdirectory/`. The example now uses `YOUR_BUCKET/pipeline-workspace/`.
- The multi-runnable download script extracted a tar archive into `/tmp/data/` without creating that directory. Added `mkdir -p /tmp/data` before extraction so the script can run as shown.
- The wrap-up described "sequential execution" generically; it now refers to `IN_ORDER` scheduling for dependent pipeline steps.

## Review Notes
The code examples use current `google.cloud.batch_v1` classes and field names, including `TaskGroup.parallelism`, `TaskGroup.scheduling_policy`, `TaskSpec.runnables`, `TaskSpec.compute_resource`, `TaskSpec.max_run_duration`, `Runnable.Script.text`, `Runnable.Container.image_uri`, `Runnable.Container.commands`, `Volume.gcs`, and `Volume.mount_path`. The placeholder bucket names, container image URIs, scripts, and project identifiers still need to be replaced by readers for a real deployment.
