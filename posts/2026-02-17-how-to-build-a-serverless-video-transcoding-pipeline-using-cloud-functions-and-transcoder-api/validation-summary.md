# Validation Summary: How to Build a Serverless Video Transcoding Pipeline Using Cloud Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Functions / Cloud Run functions Gen2
- Cloud Storage
- Transcoder API
- Pub/Sub
- Firestore
- Google Cloud CLI
- Python Functions Framework
- Google Cloud Python client libraries

## Sources Consulted
- Google Cloud Transcoder API job creation and job retrieval documentation: https://docs.cloud.google.com/transcoder/docs/how-to/jobs
- Google Cloud Transcoder API Pub/Sub notifications documentation: https://docs.cloud.google.com/transcoder/docs/how-to/create-pub-sub
- Google Cloud Transcoder API JobConfig reference: https://docs.cloud.google.com/transcoder/docs/reference/rest/v1/JobConfig
- Google Cloud Transcoder API IAM documentation: https://docs.cloud.google.com/transcoder/docs/access-control
- Google Cloud Transcoder API pricing documentation: https://cloud.google.com/transcoder/pricing
- Google Cloud SDK `gcloud functions deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud SDK `gcloud transcoder templates create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/transcoder/templates/create
- Google Cloud SDK `gcloud transcoder jobs list` reference: https://cloud.google.com/sdk/gcloud/reference/transcoder/jobs/list
- Cloud Run functions Cloud Storage trigger documentation: https://docs.cloud.google.com/run/docs/triggering/storage-triggers
- Firestore IAM roles documentation: https://docs.cloud.google.com/iam/docs/roles-permissions/firestore

## Issues Found
- The prerequisite API list was incomplete for Gen2 Cloud Functions with Eventarc triggers and the Firestore code sample. Added Cloud Run, Eventarc, Cloud Build, Artifact Registry, and Firestore API enablement commands.
- The IAM setup granted only Cloud Storage permissions to the Transcoder service account. Added Pub/Sub Publisher on the notification topic for the Transcoder service account, plus Transcoder Admin and Datastore User grants for the default Cloud Functions runtime service account used by the sample.
- The completion handler assumed the Transcoder Pub/Sub message contained the full job, including `inputUri` and `config.output.uri`. Official documentation shows the Pub/Sub payload is a `JobResult` containing only job name, state, and error. Updated the handler to call `get_job(name=job_name)` before reading the job input and output configuration.
- The monitoring section claimed that Transcoder API sends progress updates through Pub/Sub. Official documentation says Pub/Sub status is reported only when a job succeeds or fails. Updated the text to recommend job status checks for pre-completion progress tracking.

## Review Notes
The Python snippets are syntactically valid. The local environment did not have `gcloud` or Google Cloud Python libraries installed, so CLI and API details were verified against current official Google Cloud documentation rather than local command execution.
