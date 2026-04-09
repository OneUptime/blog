# Validation Summary: How to Set Up Bucket Notifications in Rook Object Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RGW (RADOS Gateway) bucket notifications
- CephBucketTopic and CephBucketNotification CRDs
- ObjectBucketClaim (OBC)
- Apache Kafka
- AMQP / RabbitMQ
- HTTP/HTTPS webhook endpoints
- Kubernetes
- AWS CLI (S3-compatible)

## Sources Consulted
- Rook official documentation: Bucket Notifications (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/bucket-notifications/)
- Rook GitHub repository example YAMLs: `deploy/examples/bucket-topic.yaml` and `deploy/examples/bucket-notification.yaml`
- Ceph upstream documentation: RGW S3 Bucket Notifications (https://docs.ceph.com/en/latest/radosgw/notifications/)

## Issues Found

1. **ObjectBucketClaim label format was incorrect (line 101)**
   - **What was wrong:** The blog used `notifications.ceph.rook.io/my-notification: "rook-ceph"` as the label to attach a notification to an OBC.
   - **What it should be:** The correct label format per Rook documentation is `bucket-notification-<notification-name>: <notification-name>`. Changed to `bucket-notification-my-notification: my-notification`.
   - **Why:** Rook's bucket notification controller watches for labels with the `bucket-notification-` prefix, not the `notifications.ceph.rook.io/` prefix. The value should be the notification name, not a namespace.

2. **ObjectBucketClaim namespace was incorrect (line 99)**
   - **What was wrong:** The OBC was placed in namespace `default` while the CephBucketTopic and CephBucketNotification were in `rook-ceph`.
   - **What it should be:** The OBC must be in the same namespace as the CephBucketNotification and CephBucketTopic. Changed namespace to `rook-ceph`.
   - **Why:** The Rook documentation states that CephBucketTopic, CephBucketNotification, and ObjectBucketClaim must all belong to the same namespace for notification binding to work.

## Review Notes
- The CephBucketTopic Kafka endpoint has additional optional fields not shown in the blog (`persistent`, `mechanism`, `userSecretRef`, `passwordSecretRef`). Their omission is acceptable for a tutorial but `persistent: true` may be worth mentioning in a future update since it controls whether notifications survive RGW restarts.
- The CephBucketTopic HTTP endpoint has an additional optional `sendCloudEvents` field not covered, which is fine for a basic tutorial.
- The `radosgw-admin topic list` command accepts optional `--tenant` and `--uid` flags not shown, which is acceptable.
- All S3 event types used (`s3:ObjectCreated:*`, `s3:ObjectRemoved:*`) are valid per Ceph documentation.
