# Validation Summary: Detect Objects and Labels in Video Using Google Cloud Video Intelligence API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Video Intelligence API
- Google Cloud CLI
- Python
- Google Cloud Video Intelligence Python client library
- Google Cloud BigQuery Python client library
- BigQuery

## Sources Consulted
- Google Cloud Video Intelligence API RPC reference: https://docs.cloud.google.com/video-intelligence/docs/reference/rpc/google.cloud.videointelligence.v1
- Google Cloud Video Intelligence label detection guide: https://docs.cloud.google.com/video-intelligence/docs/analyze-labels
- Google Cloud Video Intelligence object tracking guide: https://docs.cloud.google.com/video-intelligence/docs/object-tracking
- Google Cloud Video Intelligence pricing: https://cloud.google.com/video-intelligence/pricing
- Google Cloud SDK `gcloud services enable` reference: https://docs.cloud.google.com/sdk/gcloud/reference/services/enable
- BigQuery Python client `insert_rows_json` reference: https://docs.cloud.google.com/python/docs/reference/bigquery/latest/summary_method

## Issues Found
- The introductory wording implied all detections include exact object locations. Updated it to clarify that location data applies to object tracking results.
- The install command only installed the Video Intelligence client library, but the BigQuery indexing example also uses `google-cloud-bigquery`. Added the BigQuery client library to the install command.
- The API enablement command only enabled Video Intelligence, but the post includes a BigQuery ingestion example. Added `bigquery.googleapis.com`.
- The label detection section described only shot and frame levels while the code also uses segment-level annotations. Updated the wording and docstring to cover segment, shot, and frame levels.
- The label detection sample configured `SHOT_AND_FRAME_MODE` but did not read `shot_label_annotations`. Added a shot-level output loop.
- The object tracking sample used `ObjectTrackingConfig.max_bounding_box_count`, which is not a supported field in the current v1 API. Removed the unsupported config field.
- The object tracking sample printed `track_id` for batch annotation results, but the v1 API documents `track_id` as streaming-mode-only. Removed the batch `track_id` output.
- The local-video and combined-analysis snippets used the Video Intelligence alias without importing it. Added the missing imports.
- The BigQuery indexing snippet used `datetime.utcnow()`, which is deprecated in modern Python. Replaced it with timezone-aware `datetime.now(timezone.utc)`.
- The cost tip said requesting multiple features in one call is cheaper than separate calls. Current pricing is per minute by feature, with shot detection free when used with label detection, so the tip was corrected.
- The processing-time tip claimed label detection takes roughly 50% of video duration. Replaced it with a non-specific statement because processing time varies and the reviewed official docs do not guarantee that ratio.

## Review Notes
The examples still use placeholder project, bucket, dataset, and table names, and assume Application Default Credentials or an equivalent Google Cloud authentication setup. BigQuery insertion also assumes that the destination table already exists with a compatible schema.
