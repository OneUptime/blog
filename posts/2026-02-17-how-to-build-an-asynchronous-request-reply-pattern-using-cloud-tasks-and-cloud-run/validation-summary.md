# Validation Summary: How to Build an Asynchronous Request-Reply Pattern Using Cloud Tasks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Tasks
- Google Cloud Run
- Google Cloud Storage
- Firestore
- Python
- Flask
- JavaScript Fetch API
- Google Cloud CLI

## Sources Consulted
- Google Cloud Tasks queue creation and configuration docs: https://docs.cloud.google.com/tasks/docs/creating-queues
- Google Cloud SDK reference for `gcloud tasks queues create`: https://docs.cloud.google.com/sdk/gcloud/reference/tasks/queues/create
- Google Cloud Run guide for executing asynchronous tasks with Cloud Tasks: https://cloud.google.com/run/docs/triggering/using-tasks
- Cloud Tasks HTTP target task authentication docs: https://docs.cloud.google.com/tasks/docs/creating-http-target-tasks
- Python Cloud Tasks `HttpRequest` reference: https://docs.cloud.google.com/python/docs/reference/cloudtasks/latest/google.cloud.tasks_v2.types.HttpRequest
- Python Cloud Tasks `Task` reference: https://docs.cloud.google.com/python/docs/reference/cloudtasks/latest/google.cloud.tasks_v2.types.Task
- Cloud Storage signed URL helper docs: https://docs.cloud.google.com/storage/docs/access-control/signing-urls-with-helpers
- Python Cloud Storage `Blob.generate_signed_url` reference: https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.blob.Blob

## Issues Found
- The private Cloud Run worker deployment would not be invokable by the original Cloud Tasks code because the task did not include an OIDC token. Added `oidc_token` configuration to the Cloud Tasks HTTP request, added `TASK_INVOKER_SERVICE_ACCOUNT`, and updated the deployment commands to create and grant the invoker service account correctly.
- The deployment command granted `roles/run.invoker` to the App Engine default service account, but the task code did not use that identity for authentication. Changed the binding to the dedicated Cloud Tasks invoker service account used in the task's OIDC token.
- The code described `schedule_time` as a deadline for when the task should not run after a certain time. Cloud Tasks `schedule_time` is the time when a task is scheduled to be attempted or retried, not an expiration deadline. Updated the variable and request field to `schedule_delay_seconds` and revised the comment.
- The worker generated a Cloud Storage signed URL using default Cloud Run credentials without passing signing parameters. In Cloud Run, default credentials do not include a private key, so signed URL generation needs service account signing support. Added `google.auth` credential refresh, `service_account_email`, `access_token`, and deployment commands to enable IAM Credentials and grant `roles/iam.serviceAccountTokenCreator`.

## Review Notes
The Cloud Tasks queue command flags and retry/rate-limit settings are current. The Python snippets parse successfully with `python3`. The examples still use placeholder project IDs, service URLs, bucket names, and project number values that must be replaced before deployment.
