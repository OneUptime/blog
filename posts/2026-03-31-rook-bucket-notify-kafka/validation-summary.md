# Validation Summary: How to Configure Bucket Notifications with Kafka in Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- Apache Kafka
- Kubernetes (CRDs, kubectl, OBC)
- S3 bucket notifications

## Sources Consulted
- Rook source code: `pkg/apis/ceph.rook.io/v1/types.go` — CephBucketTopic and CephBucketNotification CRD type definitions
- Rook source code: `pkg/operator/ceph/object/notification/obc_label_controller.go` — OBC label format for notification binding
- Rook example manifests: `deploy/examples/bucket-topic.yaml`, `deploy/examples/object-bucket-claim-notification.yaml`
- Ceph official documentation: https://docs.ceph.com/en/latest/radosgw/notifications/ — RGW bucket notification event format and configuration
- Ceph official documentation: https://docs.ceph.com/en/latest/radosgw/s3-notification-compatibility/ — supported S3 event types

## Issues Found

### 1. Incorrect OBC label format for attaching notifications (Critical)
- **What was wrong:** The post used `notifications.rook.io/my-bucket-notification: "true"` as the label on ObjectBucketClaim to link a notification. This label format is not recognized by the Rook operator.
- **What was changed:** Corrected to `bucket-notification-my-bucket-notification: my-bucket-notification`. The Rook operator expects labels with the prefix `bucket-notification-` where the label value equals the notification name.
- **Why:** The Rook OBC label controller (`obc_label_controller.go`) defines `notificationLabelPrefix = "bucket-notification-"` and validates that the label value matches the notification name. Using the wrong format would cause notifications to silently fail to attach.

### 2. Non-existent radosgw-admin command (Moderate)
- **What was wrong:** The post used `radosgw-admin notification list --bucket=my-application-bucket` to verify notifications. The `radosgw-admin notification list` subcommand does not exist in Ceph's CLI.
- **What was changed:** Replaced with `aws s3api get-bucket-notification-configuration --bucket my-application-bucket --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80`, which is the correct S3 API approach to verify bucket notification configuration.
- **Why:** Ceph's `radosgw-admin` has `topic list`, `topic get`, `topic rm`, and `topic stats` subcommands, but no `notification list` subcommand. The S3 API is the standard way to check bucket-level notification configuration.

## Review Notes
- The example JSON payload for Kafka messages is a simplified version of the actual Ceph RGW event record. The real payload includes additional fields like `eventVersion`, `eventSource` (`ceph:s3`), `eventTime`, `userIdentity`, `requestParameters`, `responseElements`, and more. The simplified example is acceptable for a tutorial but readers should be aware the actual messages contain richer metadata.
- The CephBucketTopic spec correctly shows optional fields like `ackLevel` but omits other optional fields (`opaqueData`, `persistent`, `mechanism`, `userSecretRef`, `passwordSecretRef`) — this is appropriate for an introductory tutorial.
- All S3 event types used (`s3:ObjectCreated:*`, `s3:ObjectRemoved:*`) are confirmed supported by Ceph RGW.
- The `kafka://` URI scheme, CRD API version (`ceph.rook.io/v1`), and `.status.ARN` status field are all correct.
