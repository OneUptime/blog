# Validation Summary: How to Build a Serverless Image Processing Pipeline Using Cloud Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Google Cloud Storage
- Cloud Vision API
- Cloud Firestore
- Google Cloud CLI
- Python
- Pillow

## Sources Consulted
- Google Cloud Functions 1st gen Cloud Storage tutorial: https://cloud.google.com/functions/1stgendocs/tutorials/storage-1st-gen
- Google Cloud Functions / Cloud Run functions Cloud Storage CloudEvent sample: https://cloud.google.com/functions/docs/samples/functions-cloudevent-storage
- Google Cloud SDK `gcloud functions deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/beta/functions/deploy
- Google Cloud SDK `gcloud functions logs read` reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/logs/read
- Cloud Vision API Python `Feature.Type` reference: https://cloud.google.com/python/docs/reference/vision/latest/google.cloud.vision_v1.types.Feature.Type
- Cloud Vision API Python `AnnotateImageResponse` reference: https://cloud.google.com/python/docs/reference/vision/latest/google.cloud.vision_v1.types.AnnotateImageResponse
- Cloud Firestore query documentation for Python `FieldFilter`: https://cloud.google.com/firestore/docs/query-data/queries
- Google Cloud SDK `gcloud firestore databases create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/firestore/databases/create
- Cloud Storage Python client `Blob` reference: https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.blob.Blob
- Cloud Run functions HTTP functions documentation: https://docs.cloud.google.com/run/docs/write-http-functions
- Pillow documentation: https://pillow.readthedocs.io/

## Issues Found
- The storage-triggered Python function used the 1st gen `event, context` signature, but the deploy command did not explicitly pin 1st gen. Added `--no-gen2` to the deploy and log commands so the trigger model matches the code.
- The resizer was described as a second Cloud Function even though the orchestrator calls `resize_image()` as a local helper and no inter-function invocation is implemented. Updated the architecture and section label to make it a helper in the same deployed source.
- The deploy command did not indicate the source directory for the orchestrator. Added `--source=orchestrator` so the command matches the file layout shown in the snippets.
- The post enabled Vision API only, but the tutorial also deploys Cloud Functions, builds functions, and writes to Firestore. Added required API enablement for Cloud Functions, Cloud Build, and Firestore, plus a Firestore database creation command for projects without an existing database.
- The resizer could upload `.jpg` files with `image/jpg`, which is not the standard MIME type. Changed upload content type selection to use Pillow's MIME mapping, falling back to the source blob content type.
- The Firestore query used positional `where()` arguments. Updated it to the current documented `FieldFilter` form.
- The query API was used later in a `curl` example but had no deploy command. Added an HTTP deployment command for `search-images`.
- The batch processing snippet returned `jsonify()` without importing it in that snippet. Added the missing import.

## Review Notes
The tutorial is now internally consistent for a 1st gen Cloud Functions workflow. A future update could migrate the storage trigger to the current CloudEvents-style gen2 function signature and Eventarc trigger flags, but that would require a larger rewrite than was necessary for validation.
