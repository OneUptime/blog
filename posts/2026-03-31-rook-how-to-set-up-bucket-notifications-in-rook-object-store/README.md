# How to Set Up Bucket Notifications in Rook Object Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Bucket Notifications, RGW, Kafka, Kubernetes

Description: Configure S3 bucket notifications in Rook Object Store to trigger events to Kafka, RabbitMQ, or HTTP endpoints when objects are created, deleted, or modified.

---

## Overview

Ceph RGW supports S3-compatible bucket notifications that can publish events to external message brokers or HTTP endpoints. Rook exposes this through `CephBucketTopic` and `CephBucketNotification` CRDs. This is useful for building event-driven architectures where downstream services react to object storage changes.

## Supported Endpoints

Ceph RGW bucket notifications support:

- **Kafka** - Apache Kafka topics
- **AMQP** - RabbitMQ and other AMQP brokers
- **HTTP/HTTPS** - Webhook endpoints

## Step 1 - Create a CephBucketTopic

Define a topic that points to your message broker. This example uses Kafka:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBucketTopic
metadata:
  name: my-kafka-topic
  namespace: rook-ceph
spec:
  objectStoreName: my-store
  objectStoreNamespace: rook-ceph
  endpoint:
    kafka:
      uri: kafka://kafka-broker.kafka.svc.cluster.local:9092
      useSSL: false
      ackLevel: broker
      disableVerifySSL: false
```

For an HTTP endpoint:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBucketTopic
metadata:
  name: my-http-topic
  namespace: rook-ceph
spec:
  objectStoreName: my-store
  objectStoreNamespace: rook-ceph
  endpoint:
    http:
      uri: http://my-webhook-service.default.svc.cluster.local:8080/events
      disableVerifySSL: true
```

Apply the topic:

```bash
kubectl apply -f bucket-topic.yaml
```

## Step 2 - Create a CephBucketNotification

Link the topic to specific bucket events:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBucketNotification
metadata:
  name: my-notification
  namespace: rook-ceph
spec:
  topic: my-kafka-topic
  events:
    - s3:ObjectCreated:*
    - s3:ObjectRemoved:*
```

Apply the notification:

```bash
kubectl apply -f bucket-notification.yaml
```

## Step 3 - Apply Notification to a Bucket

Reference the notification from the `ObjectBucketClaim` (via label) or apply it directly to a bucket using the S3 API. With Rook, you add the notification label to the `ObjectBucketClaim`:

```yaml
apiVersion: objectbucket.io/v1alpha1
kind: ObjectBucketClaim
metadata:
  name: my-bucket-with-notifications
  namespace: rook-ceph
  labels:
    bucket-notification-my-notification: my-notification
spec:
  generateBucketName: my-bucket
  storageClassName: rook-ceph-bucket
```

## Step 4 - Verify Notification Status

Check that the topic and notification are configured:

```bash
kubectl -n rook-ceph get cephbuckettopic my-kafka-topic -o yaml
kubectl -n rook-ceph get cephbucketnotification my-notification -o yaml
```

Use the Ceph toolbox to check the RGW configuration:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin topic list
```

## Test a Notification

Upload an object to trigger a notification:

```bash
aws s3 cp /tmp/test.txt s3://my-bucket/test.txt \
  --endpoint-url http://<rgw-endpoint>
```

Check your Kafka topic for the event:

```bash
kafka-console-consumer.sh \
  --bootstrap-server kafka-broker:9092 \
  --topic my-kafka-topic \
  --from-beginning \
  --max-messages 1
```

## Summary

Rook bucket notifications use `CephBucketTopic` to define the target endpoint and `CephBucketNotification` to specify which S3 events to capture. Attaching notifications to `ObjectBucketClaims` via labels triggers event delivery when objects are created or deleted. This pattern enables event-driven workflows, data processing pipelines, and audit trails backed by your Rook object storage.
