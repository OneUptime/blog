# Validation Summary: Set Up a Cloud Function to Automatically Resize Images Uploaded to Cloud Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run functions / Cloud Functions gen 2
- Google Cloud Storage
- Eventarc Cloud Storage finalized events
- Google Cloud CLI
- Node.js
- Functions Framework for Node.js
- @google-cloud/storage
- sharp image processing library

## Sources Consulted
- Google Cloud SDK `gcloud functions deploy` reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud SDK `gcloud storage buckets create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Google Cloud SDK `gcloud storage buckets update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- Cloud Run functions runtime support: https://cloud.google.com/functions/docs/runtime-support
- Cloud Run / Eventarc Cloud Storage triggers: https://cloud.google.com/run/docs/triggering/storage-triggers
- Cloud Run functions Cloud Storage CloudEvent sample: https://cloud.google.com/functions/docs/samples/functions-cloudevent-storage
- Cloud Storage object metadata documentation: https://cloud.google.com/storage/docs/metadata
- Cloud Storage Node.js `FileMetadata` reference: https://cloud.google.com/nodejs/docs/reference/storage/latest/storage/filemetadata
- Cloud Run memory limits documentation: https://cloud.google.com/run/docs/configuring/services/memory-limits
- sharp resize API: https://sharp.pixelplumbing.com/api-resize/
- sharp output API: https://sharp.pixelplumbing.com/api-output/
- sharp image operation API: https://sharp.pixelplumbing.com/api-operation/

## Issues Found
- The deployment command used `--runtime=nodejs20`, which is deprecated as of 2026-04-30 in Google Cloud's runtime support table. Changed it to `--runtime=nodejs22`, which is currently supported.
- The post said sharp handles AVIF, but the sample function did not include `image/avif` in `SUPPORTED_TYPES`. Added `image/avif`.
- Root-level object uploads would generate output paths such as `./image-thumb.webp` because `path.dirname('image.jpg')` returns `.`. Added a `buildOutputPath()` helper that omits the `./` prefix for root-level objects.
- The large-image streaming snippet referenced `buildOutputPath(filePath, config)`, which did not match the helper signature and was not previously defined. Updated it to `buildOutputPath(filePath, config.suffix, 'webp')`.
- The large-image streaming snippet only attached error handling to the final write stream. Replaced the manual pipe chain with Node.js `stream/promises` `pipeline()` so read, transform, and write errors reject correctly.
- The EXIF section incorrectly said sharp auto-rotates by default with `autoOrient`. Updated the explanation to state that sharp does not auto-rotate by default and that `rotate()` should be called with no arguments before resizing.
- The monitoring section said memory pressure usually means the function is swapping. Cloud Run instances that exceed their memory limit are terminated, so the text now refers to terminated instances and suggests increasing memory or using streaming.

## Review Notes
The sample remains intentionally focused and omits production IAM setup, CDN configuration, lifecycle JSON content, and retry/idempotency hardening. Those are useful future additions but were not technical errors in the existing tutorial.
