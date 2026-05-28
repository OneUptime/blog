# Validation Summary: How to Migrate AWS Lambda Functions to Google Cloud Functions Gen2

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- AWS Lambda
- Amazon API Gateway
- Amazon SQS
- Amazon S3
- Google Cloud Functions Gen2 / Cloud Run functions
- Google Cloud Pub/Sub
- Google Cloud Storage
- Eventarc
- Secret Manager
- gcloud CLI
- Terraform Google provider
- Python Functions Framework

## Sources Consulted
- Google Cloud Functions quotas: https://cloud.google.com/functions/quotas
- Google Cloud SDK `gcloud functions deploy` reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Functions / Cloud Run functions Python HTTP and CloudEvent docs: https://cloud.google.com/run/docs/write-functions
- Google Cloud Pub/Sub Eventarc trigger tutorial: https://cloud.google.com/run/docs/tutorials/pubsub-eventdriven
- Google Cloud Pub/Sub `PubsubMessage` reference: https://cloud.google.com/pubsub/docs/reference/rest/v1/PubsubMessage
- Google Cloud Storage CloudEvent sample: https://cloud.google.com/functions/docs/samples/functions-cloudevent-storage
- Google Cloud runtime support: https://cloud.google.com/functions/docs/runtime-support
- Google Auth Library for Python: https://google-auth.readthedocs.io/en/stable/reference/google.auth.html
- Terraform `google_cloudfunctions2_function` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function
- AWS Lambda quotas: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS Lambda scaling and concurrency: https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html
- AWS API Gateway Lambda proxy integration: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html

## Issues Found
- The timeout comparison used the vague label "event" for the 9-minute Cloud Functions Gen2 limit. Current Google Cloud quotas list event-driven functions at 540 seconds, so the text was changed to "9 minutes (event-driven)".
- The Lambda concurrency row said "1 per instance (unless provisioned)", which incorrectly implied provisioned concurrency changes per-environment request concurrency. It was changed to "One invocation per execution environment."
- The Pub/Sub CloudEvent code read `message_id`, but the Pub/Sub payload uses `messageId`. The code was updated to read `cloud_event.data["message"]["messageId"]`.
- The Secret Manager code used `GCP_PROJECT`, which is not a reliable Cloud Run functions runtime variable in the cited docs. It now uses `google.auth.default()` to derive the active Application Default Credentials project, and the Terraform environment variable example was changed to a generic non-secret setting.

## Review Notes
The post remains technically sound after these corrections. Python 3.11 is currently supported for Cloud Run functions, but newer Python runtimes are also available; future updates could consider moving examples to a newer runtime.
