# Validation Summary: How to Build an Image Classification Pipeline Using the Cloud Vision API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vision API
- Cloud Run functions / Cloud Functions gen 2
- Cloud Storage
- Eventarc
- Firestore
- Pub/Sub
- Google Cloud CLI
- Python

## Sources Consulted
- Cloud Run functions Cloud Storage CloudEvent sample: https://docs.cloud.google.com/functions/docs/samples/functions-cloudevent-storage
- Cloud Run tutorial for Cloud Storage-triggered functions with Eventarc: https://docs.cloud.google.com/run/docs/tutorials/trigger-functions-storage
- gcloud functions deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Cloud Functions / Cloud Run functions retry behavior: https://docs.cloud.google.com/functions/docs/bestpractices/retries
- Cloud Vision API label detection documentation: https://docs.cloud.google.com/vision/docs/labels
- Cloud Vision API SafeSearch documentation: https://docs.cloud.google.com/vision/docs/detecting-safe-search
- Firestore database creation CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/firestore/databases/create
- Firestore Python query ordering sample: https://docs.cloud.google.com/firestore/docs/samples/firestore-query-order-desc-limit-async
- Cloud Storage Python Bucket reference: https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.bucket.Bucket
- Pub/Sub publisher documentation: https://docs.cloud.google.com/pubsub/docs/publisher

## Issues Found
- The architecture diagram said the function moves images into category folders, but the code copies them. Changed the diagram label to "Copy Image to Category Folder" to match the implementation.
- The API enablement command was incomplete for a gen 2 Cloud Storage-triggered function and the later Pub/Sub snippet. Added Artifact Registry, Eventarc, Cloud Run, Cloud Storage, and Pub/Sub APIs.
- The function copied images back into the same bucket under `classified/`, which would generate another Cloud Storage finalize event and reprocess its own output. Added a guard to skip files under `classified/`.
- The SafeSearch code used `.name` on likelihood values. Google Cloud's Python samples index the returned likelihood integer into a likelihood name tuple. Updated the code to use that documented pattern.
- The notification snippet imports `google.cloud.pubsub_v1`, but the requirements file did not include `google-cloud-pubsub`. Added the dependency.
- The post claimed Cloud Functions automatically retry event-driven functions on failure. For Cloud Functions v2 API deployments, retries are disabled by default and must be enabled. Added `--retry` to the deploy command and corrected the explanation.

## Review Notes
- Python code blocks were syntax-checked after edits.
- The post still uses `gsutil`, which remains valid, although newer Google Cloud docs increasingly use `gcloud storage` commands.
