# Validation Summary: How to Configure Bucket Notifications with HTTP in Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RGW (RADOS Gateway) S3-compatible object storage
- Kubernetes (Deployments, Services, CRDs, OBCs)
- Python / Flask (webhook receiver example)
- AWS CLI (S3 operations against RGW endpoint)

## Sources Consulted
- Rook official documentation: Bucket Notifications (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-bucket-notifications/)
- Rook source code: CRD type definitions in `pkg/apis/ceph.rook.io/v1/types.go` (https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go)
- Rook official documentation: Object Storage / CephObjectStore (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/)
- Ceph official documentation: RGW S3 Bucket Notifications (https://docs.ceph.com/en/latest/radosgw/notifications/)
- Ceph official documentation: radosgw-admin CLI reference (https://docs.ceph.com/en/latest/man/8/radosgw-admin/)

## Issues Found

### 1. Incorrect OBC label format for linking notifications to buckets
- **What was wrong:** The post used `notifications.rook.io/http-notification: "true"` as the OBC label to link a CephBucketNotification to a bucket. This is incorrect in both the key format (uses a Kubernetes-style annotation domain prefix) and the value (`"true"` instead of the notification name).
- **What was changed:** Corrected the label to `bucket-notification-http-notification: http-notification`, which follows the documented format `bucket-notification-<name>: <name>`.
- **Why:** The Rook documentation specifies that OBC labels must use the `bucket-notification-` prefix followed by the notification name as the key, and the notification name as the value. The previous format would not be recognized by the Rook operator and the notification would never be attached to the bucket.

### 2. Non-existent radosgw-admin command
- **What was wrong:** The troubleshooting section used `radosgw-admin notification list --bucket=my-events-bucket`. This subcommand does not exist in `radosgw-admin`. Bucket notification configuration is managed via the S3 REST API (GetBucketNotificationConfiguration), not the radosgw-admin CLI.
- **What was changed:** Replaced with `radosgw-admin topic list`, which is a valid command that lists configured notification topics and can be used to verify that the topic was created correctly.
- **Why:** The original command would fail with an unrecognized command error. The `topic list` command is a documented radosgw-admin subcommand that provides useful troubleshooting information for notification setups.

## Review Notes
- The CephBucketTopic spec is correct and includes all documented fields (objectStoreName, objectStoreNamespace, endpoint.http.uri, endpoint.http.disableVerifySSL).
- The CephBucketNotification spec correctly uses topic, events, filter.keyFilters, and filter.metadataFilters with proper field names and value formats.
- The S3 event payload structure is accurate — Ceph uses `eventSource: "ceph:s3"` (instead of AWS's `aws:s3`) and `eventVersion: "2.1"`, both confirmed against official Ceph documentation.
- The RGW service endpoint format `rook-ceph-rgw-my-store.rook-ceph.svc:80` follows the documented Rook naming convention.
- The Python/Flask webhook receiver code is syntactically correct and handles the documented Ceph S3 event payload structure properly.
- The Kubernetes Deployment and Service manifests are well-formed and correctly wire up to the webhook endpoint referenced in the CephBucketTopic URI.
- The `import json` in the Flask example is unused but harmless — left as-is to avoid unnecessary changes.
