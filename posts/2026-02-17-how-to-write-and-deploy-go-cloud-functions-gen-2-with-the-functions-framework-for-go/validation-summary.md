# Validation Summary: How to Write and Deploy Go Cloud Functions Gen 2 with the Functions Framework

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Google Cloud Run functions / Cloud Functions Gen 2
- Functions Framework for Go
- CloudEvents
- Cloud Storage triggers
- Pub/Sub triggers
- Google Cloud CLI
- Secret Manager environment bindings

## Sources Consulted
- GoogleCloudPlatform/functions-framework-go README: https://github.com/GoogleCloudPlatform/functions-framework-go
- Google Cloud gcloud functions deploy reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Run functions runtimes: https://docs.cloud.google.com/run/docs/runtimes/function-runtimes
- Google Cloud Storage CloudEvent Go sample: https://docs.cloud.google.com/functions/docs/samples/functions-cloudevent-storage
- Google Cloud Pub/Sub Eventarc function tutorial: https://docs.cloud.google.com/run/docs/tutorials/pubsub-eventdriven
- Google Cloud Storage Eventarc trigger documentation: https://docs.cloud.google.com/run/docs/triggering/storage-triggers

## Issues Found
- The deployment commands used `--runtime go121`. Go 1.21 is decommissioned for Cloud Run functions as of 2026-03-03, so the commands were updated to `--runtime go125`.
- The local run command omitted `FUNCTION_TARGET`. The Functions Framework serves the function named by `FUNCTION_TARGET`, so the command was updated to `FUNCTION_TARGET=HandleRequest go run cmd/main.go`.
- The Pub/Sub example comment said it was decoding base64 message data at the `json.Unmarshal` call. In the Go CloudEvent sample pattern, unmarshalling into `[]byte` decodes the Pub/Sub `data` field from base64 first, so the comment and error message were corrected.

## Review Notes
- The current Google Cloud docs also show the newer `gcloud run deploy --source . --function ... --base-image ...` path for Cloud Run functions, but `gcloud functions deploy --gen2` remains documented for compatibility and the post's commands are valid.
