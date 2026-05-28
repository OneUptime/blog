# Validation Summary: How to Detect Explicit Content in Uploaded Videos

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Video Intelligence API
- Explicit content detection
- Cloud Storage
- Cloud Run functions / Cloud Functions gen2
- Firestore
- Pub/Sub
- Python
- Google Cloud CLI

## Sources Consulted
- Google Cloud Video Intelligence API: Detect explicit content in videos: https://cloud.google.com/video-intelligence/docs/analyze-safesearch
- Google Cloud Video Intelligence API REST reference, videos.annotate: https://cloud.google.com/video-intelligence/docs/reference/rest/v1/videos/annotate
- Google Cloud SDK reference, gcloud functions deploy: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Run functions storage trigger documentation: https://cloud.google.com/functions/docs/calling/storage
- Google Cloud Pub/Sub Python client library documentation: https://cloud.google.com/python/docs/reference/pubsub/latest
- Google Cloud Run functions Python dependency documentation: https://cloud.google.com/functions/docs/writing/specifying-dependencies-python

## Issues Found
- The post incorrectly stated that Video Intelligence API explicit content detection flags five SafeSearch categories: adult, spoof, medical, violence, and racy. The Video Intelligence API feature returns per-frame `pornography_likelihood` values for adult explicit content. I corrected the description, section heading, category explanation, and related wording.
- The code defined moderation thresholds for `violence`, but `EXPLICIT_CONTENT_DETECTION` does not return a violence likelihood field. I removed the unused and misleading `violence` threshold entry.
- The Python dependency install command omitted `google-cloud-pubsub` and `functions-framework`, which are required by the Cloud Function sample. I added both packages.
- The deployment instructions created a Cloud Storage Pub/Sub notification and then deployed a Pub/Sub-triggered function, but the function body expects a direct Cloud Storage CloudEvent with `bucket` and `name` fields. I replaced the deployment command with a direct Cloud Storage Eventarc trigger using `--trigger-event-filters`.
- The function deployment timeout was shorter than the sample's `operation.result(timeout=600)` call. I increased the function timeout to `900s`.
- The dashboard stats helper divided by zero when there were no moderation records. I added an early return when `total == 0`.
- The post used SafeSearch terminology in headings and closing text for this Video Intelligence feature. I updated those references to explicit content detection.

## Review Notes
- The sample uses threshold values for moderation decisions that are application-specific. They are technically valid as example policy logic, but production systems should tune them with human review feedback.
- The Video Intelligence documentation notes that explicit content detection evaluates visual content only and does not guarantee prediction accuracy.
