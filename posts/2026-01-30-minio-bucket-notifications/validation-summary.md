# Validation Summary: How to Create MinIO Bucket Notifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MinIO bucket notifications
- MinIO Client (`mc`)
- Kafka
- AMQP / RabbitMQ
- Redis
- Webhooks
- AWS SDK for Python (`boto3`)
- AWS SDK for JavaScript v3
- Flask
- Express
- Kubernetes

## Sources Consulted
- MinIO AIStor Bucket Notifications: https://docs.min.io/aistor/administration/bucket-notifications/
- MinIO AIStor Publish Events to Kafka: https://docs.min.io/aistor/administration/bucket-notifications/publish-events-to-kafka/
- MinIO AIStor Publish Events to AMQP (RabbitMQ): https://docs.min.io/aistor/administration/bucket-notifications/publish-events-to-amqp/
- MinIO AIStor Publish Events to Redis: https://docs.min.io/aistor/administration/bucket-notifications/publish-events-to-redis/
- MinIO AIStor Publish Events to Webhook: https://docs.min.io/aistor/administration/bucket-notifications/publish-events-to-webhook/
- MinIO AIStor `mc event add`: https://docs.min.io/aistor/reference/cli/mc-event/mc-event-add/
- MinIO AIStor `mc event remove`: https://docs.min.io/aistor/reference/cli/mc-event/mc-event-remove/
- Boto3 S3 `put_bucket_notification_configuration`: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/put_bucket_notification_configuration.html
- AWS SDK for JavaScript v3 `PutBucketNotificationConfigurationCommand`: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/s3-2006-03-01/PutBucketNotificationConfiguration

## Issues Found
- The Kafka SASL environment variable used `MINIO_NOTIFY_KAFKA_SASL_ENABLE_PRIMARY`, which is not the current documented MinIO setting. Changed it to `MINIO_NOTIFY_KAFKA_SASL_PRIMARY="sha512"` to match MinIO's documented SASL mechanism setting.
- The supported event type table described wildcard events as limited to only common object operations. Updated the wildcard descriptions and added the current documented object tagging, retention, and legal hold event rows.
- Two `mc event add` comments did not match the commands: `--event put,delete` covers creation and deletion, while `--event put` covers creation events only. Updated the comments to match the commands.
- The failure handling section described `queue_dir` as "retry behavior." Updated the wording to describe it as persistent queue configuration, which is what the setting actually controls.

## Review Notes
- The SDK examples use S3-compatible notification configuration shapes and are consistent with AWS SDK documentation. Applying a bucket notification configuration replaces the bucket's existing notification configuration, which may be worth calling out in a future revision.
- The Kubernetes example uses `minio/minio:latest`; pinning an image tag would be better for reproducible deployments, but this is not a technical correctness error.
