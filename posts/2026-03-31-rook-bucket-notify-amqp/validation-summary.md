# Validation Summary: How to Configure Bucket Notifications with AMQP in Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CephBucketTopic, CephBucketNotification CRDs)
- Ceph RGW (RADOS Gateway) bucket notifications
- AMQP protocol / RabbitMQ
- Kubernetes (kubectl, ObjectBucketClaim)
- AWS CLI (S3-compatible endpoint usage)

## Sources Consulted
- Rook GitHub repository CRD type definitions (`pkg/apis/ceph.rook.io/v1/types.go` — `AMQPEndpointSpec`, `BucketNotificationSpec`)
- Rook deploy examples (`deploy/examples/bucket-topic.yaml`, `deploy/examples/bucket-notification.yaml`, `deploy/examples/object-bucket-claim-notification.yaml`)
- Rook operator source for OBC notification label prefix (`notificationLabelPrefix = "bucket-notification-"`)
- Rook CRD kubebuilder validation annotations for ackLevel enum (`+kubebuilder:validation:Enum=none;broker;routeable`)
- Ceph source (`src/test/cli/radosgw-admin/help.t`) for `radosgw-admin notification list` subcommand

## Issues Found

### 1. Fabricated `useSSL` and `caCert` fields in AMQPS example
**What was wrong:** The TLS example included `useSSL: true` and a `caCert` block under `spec.endpoint.amqp`. These fields do not exist on the `AMQPEndpointSpec` struct. The AMQP endpoint spec only has four fields: `uri`, `exchange`, `disableVerifySSL`, and `ackLevel`. TLS is enabled by using the `amqps://` URI scheme — no separate boolean or CA cert field exists. (`useSSL` is actually a field on `KafkaEndpointSpec`, not AMQP.)
**What was changed:** Replaced the TLS example with a correct snippet using `amqps://` URI, `disableVerifySSL`, and `ackLevel` — the only valid AMQP fields.

### 2. Incorrect OBC label format for linking notifications
**What was wrong:** The ObjectBucketClaim used the label `notifications.rook.io/amqp-notification: "true"`. The Rook operator actually looks for labels with the prefix `bucket-notification-` where both the label key suffix and value match the notification name.
**What was changed:** Updated to `bucket-notification-amqp-notification: amqp-notification` to match the actual Rook operator implementation and official examples.

### 3. Misspelled `routable` ackLevel value
**What was wrong:** The ackLevel options table listed `routable`. The CRD kubebuilder validation enum is `none;broker;routeable` (note the 'e' in `routeable`). Using `routable` would be rejected by CRD validation at apply time.
**What was changed:** Corrected spelling to `routeable` in the ackLevel options table.

## Review Notes
- The `radosgw-admin notification list --bucket=<name>` command exists in Ceph source but is not documented in the official radosgw-admin man page. It works but readers may have difficulty finding official documentation for it.
- The exchange type `direct` used in the RabbitMQ setup section is valid but requires that the routing key on published messages matches the binding routing key. Ceph RGW may use a different routing key than `s3-events`. A `fanout` exchange type would be more forgiving for initial testing. This is not an error but worth noting for readers who encounter empty queues.
- The Mermaid diagram, kubectl commands, rabbitmqadmin commands, and aws s3 CLI usage are all correct.
