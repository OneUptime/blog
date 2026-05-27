# Validation Summary: How to Transcode Video Files for Adaptive Bitrate Streaming

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Transcoder API
- Cloud Storage
- Google Cloud CLI
- Pub/Sub notifications for Cloud Storage
- Cloud Run functions / Functions Framework for Python
- HLS adaptive bitrate streaming
- Python

## Sources Consulted
- Google Cloud Transcoder API jobs guide: https://docs.cloud.google.com/transcoder/docs/how-to/jobs
- Google Cloud Transcoder API JobConfig REST reference: https://docs.cloud.google.com/transcoder/docs/reference/rest/v1/JobConfig
- Google Cloud Transcoder API Python client reference for Job and SegmentSettings: https://cloud.google.com/python/docs/reference/transcoder/latest/google.cloud.video.transcoder_v1.types.Job and https://docs.cloud.google.com/python/docs/reference/transcoder/latest/google.cloud.video.transcoder_v1.types.SegmentSettings
- Google Cloud Transcoder API pricing: https://cloud.google.com/transcoder/pricing
- Google Cloud Storage Pub/Sub notifications guide: https://docs.cloud.google.com/storage/docs/reporting-changes
- Google Cloud CLI notification command reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/notifications/create
- Google Cloud Storage public access guide: https://cloud.google.com/storage/docs/access-control/making-data-public
- Cloud Run functions Cloud Storage and Pub/Sub CloudEvent samples: https://cloud.google.com/functions/docs/samples/functions-cloudevent-storage and https://cloud.google.com/run/docs/tutorials/pubsub-eventdriven
- Google Cloud Storage gsutil guidance: https://docs.cloud.google.com/storage/docs/gsutil

## Issues Found
- HLS mux streams set `segment_duration` but did not set `individual_segments`. Google documents `individualSegments` as the field that creates individual segment files for `ts`, `fmp4`, and `vtt`, and official examples set it for segmented outputs. Added `individual_segments = True` to each HLS mux stream.
- Storage commands used legacy `gsutil` examples. Google Cloud currently recommends `gcloud storage` for Cloud Storage operations, so bucket creation, uploads, listing, and notification setup were updated to current `gcloud storage` commands.
- The public-read command used object ACLs. ACL commands can fail or be unsuitable with uniform bucket-level access, and Google documents IAM as the current way to make a bucket public. Replaced the ACL command with `gcloud storage buckets add-iam-policy-binding ... --member=allUsers --role=roles/storage.objectViewer`.
- The Pub/Sub-triggered Cloud Function treated the CloudEvent as a direct Cloud Storage event. Pub/Sub CloudEvents wrap the payload in `cloud_event.data["message"]["data"]` as base64. Updated the function to decode the Pub/Sub message JSON before reading `bucket` and `name`.
- The Cloud Function snippet called `create_abr_job` without importing it. Added `from transcode import create_abr_job`.
- The install command did not include `functions-framework`, even though the automation snippet imports it. Added it to the pip install command.
- Pricing described SD as "up to 720p"; Google classifies SD as less than 1280x720 and HD as 1280x720 through 1920x1080. Corrected the tier wording.
- The conclusion said the API handles codec selection and bitrate optimization, but the example explicitly selects H.264 profiles and bitrates. Reworded this to encoding, packaging, and manifest generation.

## Review Notes
The Python snippets parse successfully, and the Transcoder client object graph was instantiated locally with the current `google-cloud-video-transcoder` package to verify field names. The examples still assume the Pub/Sub-triggered function is deployed with `transcode.py` included alongside `auto_transcode/main.py`, and public buckets may still be blocked by public access prevention policies in some organizations.
