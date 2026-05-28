# Validation Summary: Migrate a Cloud Function from Gen 1 to Gen 2 Without Breaking Existing Triggers

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Cloud Functions 1st gen and 2nd gen
- Eventarc
- Cloud Storage triggers
- Google Cloud CLI (`gcloud`)
- Node.js Functions Framework
- Cloud Run and serverless NEGs
- IAM roles for invocation and Eventarc triggers

## Sources Consulted
- Google Cloud Functions deploy documentation: https://cloud.google.com/functions/docs/deploy
- `gcloud functions deploy` reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Cloud Storage 2nd gen CloudEvent sample: https://cloud.google.com/functions/docs/samples/functions-cloudevent-storage
- Cloud Run concurrency documentation: https://cloud.google.com/run/docs/about-concurrency
- Cloud Run functions memory and vCPU limits: https://cloud.google.com/functions/docs/configuring/memory
- Cloud Functions 1st gen HTTP trigger documentation: https://cloud.google.com/functions/1stgendocs/calling/http
- Cloud Run functions comparison documentation: https://cloud.google.com/run/docs/functions/comparison
- Eventarc roles and permissions documentation: https://cloud.google.com/eventarc/docs/roles-permissions
- Eventarc trigger routing documentation: https://cloud.google.com/eventarc/standard/docs/run/route-trigger-cloud-functions
- Serverless NEG concepts documentation: https://cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts
- `gcloud functions logs read` reference: https://cloud.google.com/sdk/gcloud/reference/functions/logs/read

## Issues Found
- The post stated that Gen 2 functions support up to 16 GB memory and 4 vCPUs. Current Cloud Run functions documentation lists up to 32 GiB and 8 vCPUs, so the limits were corrected.
- The post stated that Gen 2 HTTP URLs simply change to `run.app` URLs. Current Google documentation says functions created with `gcloud functions` or the Cloud Functions v2 API get a `cloudfunctions.net` endpoint by default, while Cloud Run-managed functions can also have `run.app` URLs. The endpoint migration guidance was updated to reflect this.
- The traffic splitting claim was too broad. The wording now says Gen 2 functions run on Cloud Run and can use underlying Cloud Run revision traffic controls where appropriate.
- The IAM pitfall incorrectly implied the function runtime service account generally needs `run.invoker`. The text now distinguishes authenticated callers and trigger service accounts needing `roles/run.invoker`.
- The Eventarc permissions pitfall incorrectly referred to the Eventarc service agent needing `eventarc.eventReceiver` on the function service account. The text now says the service account associated with the Eventarc trigger needs `roles/eventarc.eventReceiver` on the project.

## Review Notes
The deployment, log-reading, CloudEvent Node.js handler, and serverless NEG command patterns are consistent with current official documentation. The local environment did not have `gcloud` installed, so CLI flags were verified against the official Google Cloud SDK reference rather than local `--help` output.
