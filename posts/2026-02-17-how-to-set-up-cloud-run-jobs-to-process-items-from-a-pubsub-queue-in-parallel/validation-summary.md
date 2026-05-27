# Validation Summary: How to Set Up Cloud Run Jobs to Process Items from a Pub/Sub Queue in Parallel

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run Jobs
- Google Cloud Pub/Sub
- Google Cloud Scheduler
- Google Cloud Build
- Artifact Registry
- Python
- Docker
- gcloud CLI

## Sources Consulted
- Cloud Run Jobs creation documentation: https://cloud.google.com/run/docs/create-jobs
- Cloud Run Jobs execution documentation: https://cloud.google.com/run/docs/execute/jobs
- Cloud Run Jobs scheduling documentation: https://cloud.google.com/run/docs/execute/jobs-on-schedule
- Cloud Run Jobs service identity documentation: https://cloud.google.com/run/docs/configuring/jobs/service-identity
- Cloud Run logging documentation: https://cloud.google.com/run/docs/logging
- gcloud run jobs create reference: https://cloud.google.com/sdk/gcloud/reference/run/jobs/create
- gcloud run jobs execute reference: https://cloud.google.com/sdk/gcloud/reference/run/jobs/execute
- Pub/Sub synchronous pull sample: https://cloud.google.com/pubsub/docs/samples/pubsub-subscriber-sync-pull
- Pub/Sub pull subscriptions documentation: https://cloud.google.com/pubsub/docs/pull
- Pub/Sub IAM roles documentation: https://cloud.google.com/iam/docs/roles-permissions/pubsub
- Pub/Sub dead-letter topics documentation: https://cloud.google.com/pubsub/docs/dead-letter-topics
- Pub/Sub quotas and limits documentation: https://cloud.google.com/pubsub/quotas
- gcloud Pub/Sub subscriptions create reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- gcloud Pub/Sub subscriptions update reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update
- Artifact Registry repository creation documentation: https://cloud.google.com/artifact-registry/docs/repositories/create-repos
- gcloud builds submit reference: https://cloud.google.com/sdk/gcloud/reference/builds/submit
- Python Pub/Sub client reference: https://cloud.google.com/python/docs/reference/pubsub/latest

## Issues Found
- Removed an unused `google.api_core.retry` import from the Python example because the code does not use it.
- Updated the pinned `google-cloud-pubsub` dependency from `2.19.0` to `2.33.0` to match the current official Python Pub/Sub client documentation.
- Added an Artifact Registry repository creation command before `gcloud builds submit` because the image push target assumes the `cloud-run-images` Docker repository exists.
- Added a dedicated Cloud Run job service account, granted it `roles/pubsub.subscriber` on the subscription, and attached it with `--service-account` so the worker can pull, acknowledge, and modify acknowledgment deadlines under least privilege.
- Corrected the Cloud Logging table format from `labels.run_googleapis_com/task_index` to `labels.task_index`, which matches Cloud Run job log entry fields.
- Updated the Cloud Scheduler target URI to the documented Cloud Run v2 `jobs:run` endpoint.
- Replaced the unsupported `gcloud run jobs execute --parallelism` example with `gcloud run jobs update --tasks --parallelism` followed by `gcloud run jobs execute`, because `execute` supports overriding task count but not parallelism.
- Corrected the Pub/Sub throughput claim to reflect current regional pull subscriber throughput quotas instead of an inaccurate single-subscription 100 MB/s figure.
- Added the required Pub/Sub service agent IAM bindings for the dead-letter topic configuration so Pub/Sub can publish dead-letter messages and acknowledge forwarded messages.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against the official Google Cloud SDK reference pages and product documentation.
