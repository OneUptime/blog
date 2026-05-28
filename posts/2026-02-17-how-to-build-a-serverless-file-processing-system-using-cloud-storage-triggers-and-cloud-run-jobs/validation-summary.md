# Validation Summary: How to Build a Serverless File Processing System Using Cloud Storage Triggers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run Jobs
- Google Cloud Run services
- Eventarc
- Cloud Storage
- Artifact Registry
- BigQuery
- Firestore
- Python
- Google Cloud CLI

## Sources Consulted
- Cloud Run Jobs creation and task environment variables: https://cloud.google.com/run/docs/create-jobs
- Cloud Run Jobs task timeout: https://cloud.google.com/run/docs/configuring/task-timeout
- Cloud Run Jobs memory limits: https://cloud.google.com/run/docs/configuring/jobs/memory-limits
- Cloud Run Jobs execution and overrides: https://cloud.google.com/run/docs/execute/jobs
- Cloud Run Jobs service identity: https://cloud.google.com/run/docs/configuring/jobs/service-identity
- Cloud Run IAM roles: https://cloud.google.com/run/docs/reference/iam/roles
- Eventarc Cloud Storage to Cloud Run trigger setup: https://cloud.google.com/eventarc/standard/docs/run/route-trigger-cloud-storage
- Eventarc roles and permissions: https://cloud.google.com/eventarc/docs/roles-permissions
- Cloud Run services log command: https://cloud.google.com/sdk/gcloud/reference/run/services/logs/read
- Cloud Run jobs log command: https://cloud.google.com/sdk/gcloud/reference/run/jobs/logs
- Cloud Run Python client RunJobRequest overrides: https://cloud.google.com/python/docs/reference/run/latest/google.cloud.run_v2.types.RunJobRequest.Overrides.ContainerOverride
- Cloud Functions quotas: https://cloud.google.com/functions/quotas
- Artifact Registry transition from Container Registry: https://cloud.google.com/artifact-registry/docs/transition/transition-from-gcr

## Issues Found
- The post stated Cloud Run Jobs can run for up to 24 hours. Current Cloud Run Jobs documentation allows task timeouts up to 168 hours, so the post now says 7 days.
- The post said Cloud Functions Gen 1 has a 10-minute timeout. Official quotas list 540 seconds, so the post now says 9 minutes.
- The post used `gcr.io` image tags for new container builds. Container Registry is deprecated and writes to Container Registry are unavailable unless using Artifact Registry-backed `gcr.io` repositories, so the example now uses an Artifact Registry Docker repository and `us-central1-docker.pkg.dev` image paths.
- The dispatcher could launch multiple tasks for JSON and Parquet files, but those processors do not partition the input. This would duplicate writes. The dispatcher now only uses multiple tasks for CSV files.
- The dispatcher code needed its own Python dependencies for source deployment. Added a dispatcher `requirements.txt` snippet with Flask, gunicorn, and `google-cloud-run`.
- The Eventarc trigger setup granted `roles/run.invoker` but omitted `roles/eventarc.eventReceiver` for the trigger service account and `roles/pubsub.publisher` for the Cloud Storage service agent. Added both required bindings.
- The dispatcher was granted broad `roles/run.developer`. Replaced it with `roles/run.jobsExecutorWithOverrides`, which is the specific role for executing Cloud Run Jobs with overrides.
- The processor job used Google Cloud APIs but did not define or grant permissions to a job service account. Added a dedicated job service account and IAM bindings for Cloud Storage object access, BigQuery writes/jobs, and Firestore status updates.
- The job log command used `gcloud run jobs executions logs read`, which is not the stable command form. Replaced it with `gcloud run jobs logs read file-processor`.
- The claim that Cloud Run Jobs can process multi-gigabyte files without worrying about timeouts was too broad for the included sample, which downloads CSV and JSON inputs into memory. Reworded it to state that larger files require streaming or partitioning the input appropriately.

## Review Notes
The Python snippets parse successfully. The CSV example still downloads the whole file into each task before splitting rows, so it remains a simple tutorial implementation rather than a production-scale streaming CSV processor.
