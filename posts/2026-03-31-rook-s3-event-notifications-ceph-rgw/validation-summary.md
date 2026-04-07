# Validation Summary: How to Set Up S3 Event Notifications in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- S3-compatible bucket notifications
- Apache Kafka
- AMQP (RabbitMQ)
- AWS CLI (S3 API and SNS API)
- Kubernetes / Rook-Ceph
- HTTP webhooks

## Sources Consulted
- Ceph official documentation on S3 Bucket Notifications: https://docs.ceph.com/en/latest/radosgw/s3-notification-compatibility/
- Ceph official documentation on PubSub Module: https://docs.ceph.com/en/latest/radosgw/pubsub-module/
- AWS S3 API reference for PutBucketNotificationConfiguration
- AWS SNS CreateTopic API reference
- radosgw-admin CLI reference: https://docs.ceph.com/en/latest/radosgw/adminops/

## Issues Found

### Issue 1: Incorrect method for creating notification topics
- **What was wrong:** The post used `radosgw-admin topic create` with `--uid`, `--endpoint`, and `--endpoint-args` flags to create Kafka and HTTP notification topics. The `radosgw-admin` tool does not have a `topic create` subcommand with these flags. It supports `topic list`, `topic get`, and `topic rm`, but topic creation is done through the SNS API.
- **What was changed:** Replaced both `radosgw-admin topic create` commands (Kafka and HTTP) with the correct `aws sns create-topic` commands using the `--attributes` parameter to specify push-endpoint and other settings. Added a note that the command returns a TopicArn for use in notification configuration.
- **Why:** Using the non-existent `radosgw-admin topic create` command would fail. The SNS CreateTopic API is the documented and correct way to create notification topics in Ceph RGW.

## Review Notes
- The notification JSON structure for `put-bucket-notification-configuration` is correct and follows the S3 API format.
- The S3 event types (`s3:ObjectCreated:*`, `s3:ObjectRemoved:*`) are valid and supported by Ceph RGW.
- The sample event message with `eventSource: "ceph:s3"` is accurate for Ceph-generated events.
- The Kafka consumer command is standard and correct.
- The `get-bucket-notification-configuration` command is correct.
- The TopicArn format `arn:aws:sns:us-east-1::object-events` in the notification JSON is the format Ceph RGW uses; in practice, the ARN returned by `create-topic` should be used.
