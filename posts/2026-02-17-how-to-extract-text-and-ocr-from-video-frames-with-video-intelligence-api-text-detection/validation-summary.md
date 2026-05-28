# Validation Summary: How to Extract Text and OCR from Video Frames with Video Intelligence API Text

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Video Intelligence API
- Video Intelligence API text detection
- Python
- Google Cloud client libraries
- Google Cloud CLI
- BigQuery
- Cloud Storage

## Sources Consulted
- Google Cloud Video Intelligence API text detection overview: https://docs.cloud.google.com/video-intelligence/docs/feature-text-detection
- Google Cloud Video Intelligence API text recognition guide and Python sample: https://docs.cloud.google.com/video-intelligence/docs/text-detection
- Google Cloud Video Intelligence API Python text detection sample: https://docs.cloud.google.com/video-intelligence/docs/samples/video-detect-text-gcs
- Google Cloud Python reference for TextDetectionConfig: https://docs.cloud.google.com/python/docs/reference/videointelligence/latest/google.cloud.videointelligence_v1.types.TextDetectionConfig
- Google Cloud SDK reference for `gcloud services enable`: https://docs.cloud.google.com/sdk/gcloud/reference/services/enable
- Google Cloud BigQuery Python Client reference for `insert_rows_json`: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client

## Issues Found
- Several standalone Python snippets used the `vi` alias without importing `google.cloud.videointelligence_v1`. Added the missing imports where needed.
- The text indexing example calculated segment duration using whole seconds only, dropping sub-second timestamp precision. Updated it to convert protobuf duration offsets to floating-point seconds.
- The text indexing example used `datetime.utcnow()`, which is deprecated in modern Python. Replaced it with `datetime.now(timezone.utc).isoformat()`.
- The movement tracking example estimated rotated bounding-box width and height using axis-aligned coordinate differences. Updated it to use edge lengths so the calculation remains meaningful for rotated boxes.
- The segment example assigned dictionaries directly to duration fields. Updated it to set `start_time_offset.seconds` and `end_time_offset.seconds` explicitly.
- The batch-processing example imported `ThreadPoolExecutor` and accepted `max_concurrent` but did not use either to limit concurrent processing. Reworked the snippet so `max_concurrent` controls parallel annotation jobs, and changed the surrounding wording from async to parallel.

## Review Notes
The main Video Intelligence API claims are consistent with the current official documentation: text detection performs OCR, returns text annotations with segment timestamps, confidence, frame-level timestamps, and rotated bounding-box vertices, and uses `TEXT_DETECTION` with optional BCP-47 language hints.
