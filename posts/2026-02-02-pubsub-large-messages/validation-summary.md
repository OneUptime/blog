# Validation Summary: How to Handle Large Messages in Pub/Sub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Google Cloud Storage
- Python (google-cloud-pubsub, google-cloud-storage, google-cloud-monitoring SDKs)
- gzip compression (stdlib)
- Terraform (hashicorp/google provider)
- Mermaid diagrams

## Sources Consulted
- Google Cloud Pub/Sub quotas and limits: https://cloud.google.com/pubsub/quotas (10MB max message size)
- google-cloud-pubsub Python client docs: https://cloud.google.com/python/docs/reference/pubsub/latest
- google-cloud-storage Python client docs: https://cloud.google.com/python/docs/reference/storage/latest (blob.upload_from_string, blob.download_as_bytes)
- google-cloud-monitoring Python client docs: https://cloud.google.com/python/docs/reference/monitoring/latest (TimeSeries, TimeInterval, Point)
- Python stdlib gzip module: https://docs.python.org/3/library/gzip.html (compress/decompress, compresslevel)
- Terraform google provider — google_pubsub_topic / google_pubsub_subscription: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription (dead_letter_policy, retry_policy, enable_exactly_once_delivery, message_retention_duration, ack_deadline_seconds)
- Terraform google provider — google_storage_bucket: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket (lifecycle_rule, versioning, uniform_bucket_level_access)
- Pub/Sub dead letter service account: documented as `service-{project-number}@gcp-sa-pubsub.iam.gserviceaccount.com`

## Issues Found
No technical issues found.

## Review Notes
- The 10MB Pub/Sub message size limit (including data + attributes) is accurate.
- All Python client API calls (`pubsub_v1.PublisherClient`, `SubscriberClient`, `topic_path`, `subscription_path`, `publish`, `subscribe`, `message.ack/nack/attributes/data/delivery_attempt/publish_time`) match the current google-cloud-pubsub SDK surface.
- `blob.upload_from_string` and `blob.download_as_bytes` are the current, non-deprecated google-cloud-storage methods.
- `gzip.compress(data, compresslevel=...)` and `gzip.decompress()` signatures are correct.
- Terraform resource shapes for `google_pubsub_topic`, `google_pubsub_subscription` (including `dead_letter_policy`, `retry_policy`, `enable_exactly_once_delivery`, `message_retention_duration`, `ack_deadline_seconds`), `google_pubsub_topic_iam_binding`, `google_pubsub_subscription_iam_binding`, and `google_storage_bucket` (with `lifecycle_rule`, `versioning`, `uniform_bucket_level_access`) all match the current hashicorp/google provider schema.
- The Pub/Sub managed service account naming pattern used in the IAM bindings is correct.
- Minor deprecation note (not an error): `datetime.utcnow()` is deprecated in Python 3.12+ in favor of `datetime.now(timezone.utc)`. Code still functions correctly; left unchanged to preserve author style.
- The `MonitoredLargeMessageSubscriber._fetch_large_message` method is an illustrative stub (with `# ... fetch logic` placeholder), so the bare `data` reference at the end is intentionally a sketch rather than runnable code. Left as-is since context clearly signals it is a pattern example.
- Chunking strategy notes a 5MB default chunk size, which is a sensible safety margin under Pub/Sub's 10MB cap once attributes and protocol overhead are accounted for.
