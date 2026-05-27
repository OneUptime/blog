# Validation Summary: How to Use Spot VMs with Google Cloud Batch to Reduce Batch Processing Costs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Batch
- Google Compute Engine Spot VMs
- gcloud CLI
- Python
- Google Cloud Python Batch client
- Google Cloud Storage
- Cloud Logging

## Sources Consulted
- Google Cloud Batch: Create and run a basic job: https://cloud.google.com/batch/docs/create-run-basic-job
- Google Cloud Batch: Job creation and execution overview: https://cloud.google.com/batch/docs/create-run-job
- Google Cloud Batch: Automate task retries: https://cloud.google.com/batch/docs/automate-task-retries
- Google Cloud Batch troubleshooting / reserved exit codes: https://cloud.google.com/batch/docs/troubleshooting
- Google Cloud Batch Python client reference, AllocationPolicy: https://cloud.google.com/python/docs/reference/batch/latest/google.cloud.batch_v1.types.AllocationPolicy
- Google Cloud Batch Python client reference, TaskSpec: https://cloud.google.com/python/docs/reference/batch/latest/google.cloud.batch_v1.types.TaskSpec
- gcloud batch jobs submit reference: https://cloud.google.com/sdk/gcloud/reference/batch/jobs/submit
- Compute Engine Spot VMs documentation: https://cloud.google.com/compute/docs/instances/spot
- Compute Engine create and use Spot VMs documentation: https://cloud.google.com/compute/docs/instances/create-use-spot

## Issues Found
- The post said Spot VMs are typically 60-91% cheaper and described a 30-second notice as unconditional. Updated this to match Google documentation: Spot VMs can be discounted up to 91%, and the shutdown period is best effort and up to 30 seconds.
- The introduction and Python section said the example set up fallback to on-demand VMs. The code did not implement fallback, and current Batch `AllocationPolicy.instances` only supports `instances[0]`. Removed the fallback claim.
- The prerequisites said Spot VM quota is always separate from on-demand quota. Updated the wording to reflect current Compute Engine behavior: Spot VMs require CPU quota and use preemptible quota only where granted; otherwise they can consume standard quota, with additional quota considerations for GPUs and Local SSDs.
- The preemption-aware Python example exited with status code `0` after saving a checkpoint. That would mark the task as successful and could skip unprocessed work. Changed it to exit with status code `1` so Batch can retry when retries are configured.
- The best practices section suggested allowing Cloud Batch to choose from a set of equivalent machine types. Since only the first instance policy is currently supported, changed this to suggest omitting a specific machine type so Batch can select compatible VMs, or submitting separate jobs for equivalent machine types.

## Review Notes
- The `gcloud batch jobs submit --config=-` HereDoc pattern is supported by the official gcloud reference.
- The Batch JSON fields `provisioningModel`, `maxRetryCount`, `maxRunDuration`, `allowedLocations`, `logsPolicy.destination`, and container `imageUri` / `commands` are consistent with the official Batch examples and references.
- The Python client code uses the current `google.cloud.batch_v1` classes and field names. I could not run it locally because the Google Cloud Python libraries are not installed in this workspace.
