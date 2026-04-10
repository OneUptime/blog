# How to Configure Bucket Notifications with AMQP in Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, AMQP, RabbitMQ, Bucket, Notification, ObjectStore

Description: Learn how to configure Ceph RGW bucket notifications to publish S3 events to AMQP brokers like RabbitMQ using Rook's CephBucketTopic CRD.

---

Rook supports publishing S3 bucket events to AMQP message brokers (such as RabbitMQ) via the `CephBucketTopic` CRD. This enables event-driven architectures where object uploads trigger downstream processing through familiar message queue infrastructure.

## AMQP Notification Flow

```mermaid
flowchart LR
    A[S3 Client] -->|PUT object| B[RGW]
    B --> C[Event Filter]
    C --> D[CephBucketTopic - AMQP]
    D -->|AMQP publish| E[RabbitMQ Exchange]
    E --> F[Queue: s3-events]
    F --> G[Consumer Application]
```

## Prerequisites

A running RabbitMQ instance accessible from RGW pods:

```bash
kubectl get pods -n rabbitmq
# rabbitmq-0 should be Running

kubectl get svc -n rabbitmq
# rabbitmq  ClusterIP  10.96.x.x  5672/TCP,15672/TCP
```

## Step 1: Create CephBucketTopic for AMQP

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBucketTopic
metadata:
  name: s3-amqp-topic
  namespace: rook-ceph
spec:
  objectStoreName: my-store
  objectStoreNamespace: rook-ceph
  endpoint:
    amqp:
      uri: amqp://guest:guest@rabbitmq.rabbitmq.svc.cluster.local:5672
      exchange: s3-exchange
      disableVerifySSL: false
      ackLevel: broker
```

For AMQPS (TLS), use the `amqps://` URI scheme and port 5671:

```yaml
spec:
  objectStoreName: my-store
  objectStoreNamespace: rook-ceph
  endpoint:
    amqp:
      uri: amqps://user:password@rabbitmq.rabbitmq.svc.cluster.local:5671
      exchange: s3-exchange
      disableVerifySSL: false
      ackLevel: broker
```

## Step 2: Verify Topic Creation

```bash
kubectl get cephbuckettopic s3-amqp-topic -n rook-ceph
kubectl get cephbuckettopic s3-amqp-topic -n rook-ceph \
  -o jsonpath='{.status.ARN}'
```

## Step 3: Create CephBucketNotification

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBucketNotification
metadata:
  name: amqp-notification
  namespace: default
spec:
  topic: s3-amqp-topic
  events:
    - s3:ObjectCreated:*
    - s3:ObjectRemoved:*
    - s3:ObjectRestore:*
  filter:
    keyFilters:
      - name: prefix
        value: incoming/
```

## Step 4: Link Notification to a Bucket

```yaml
apiVersion: objectbucket.io/v1alpha1
kind: ObjectBucketClaim
metadata:
  name: my-bucket
  namespace: default
  labels:
    bucket-notification-amqp-notification: amqp-notification
spec:
  bucketName: my-bucket-amqp
  storageClassName: rook-ceph-bucket
```

## Set Up RabbitMQ Exchange and Queue

```bash
# Create exchange in RabbitMQ
kubectl exec -n rabbitmq rabbitmq-0 -- \
  rabbitmqadmin declare exchange \
    name=s3-exchange \
    type=direct \
    durable=true

# Create queue
kubectl exec -n rabbitmq rabbitmq-0 -- \
  rabbitmqadmin declare queue \
    name=s3-events \
    durable=true

# Bind queue to exchange
kubectl exec -n rabbitmq rabbitmq-0 -- \
  rabbitmqadmin declare binding \
    source=s3-exchange \
    destination=s3-events \
    routing_key=s3-events
```

## Test and Consume Events

```bash
# Upload an object to trigger a notification
aws s3 cp /tmp/report.csv s3://my-bucket-amqp/incoming/report.csv \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80

# Consume one message from RabbitMQ
kubectl exec -n rabbitmq rabbitmq-0 -- \
  rabbitmqadmin get queue=s3-events ackmode=ack_requeue_false
```

## AMQP ackLevel Options

| Value | Description |
|---|---|
| `none` | Fire and forget -- no confirmation |
| `broker` | Confirm delivery to broker exchange |
| `routeable` | Confirm message is routed to at least one queue |

## Verify Notification in Ceph

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin notification list --bucket=my-bucket-amqp
```

## Summary

Configure AMQP bucket notifications in Rook by creating a `CephBucketTopic` with an `amqp` endpoint pointing to your RabbitMQ URI and exchange. Create a `CephBucketNotification` with the desired S3 event types and key prefix filters, then link it to buckets via OBC labels. Messages arrive in the RabbitMQ queue as JSON S3 event records, enabling event-driven pipelines over existing AMQP infrastructure.
