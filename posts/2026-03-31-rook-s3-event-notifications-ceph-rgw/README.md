# How to Set Up S3 Event Notifications in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, S3, RGW, Event Notification, Kafka, Storage

Description: Configure S3 bucket event notifications in Ceph RGW to trigger workflows when objects are created or deleted, publishing events to Kafka, AMQP, or HTTP endpoints.

---

## Overview

Ceph RGW supports S3-compatible bucket notifications. When objects are created, deleted, or modified, RGW can publish events to Kafka topics, AMQP queues, or HTTP endpoints. This enables event-driven architectures where downstream services react to storage events automatically.

## Supported Notification Endpoints

Ceph RGW supports three types of notification endpoints:
- Kafka (recommended for production)
- AMQP (RabbitMQ)
- HTTP/HTTPS webhooks

## Configure a Kafka Notification Topic

Create a notification topic in RGW using the SNS API via the AWS CLI:

```bash
aws sns create-topic \
  --name object-events \
  --attributes '{"push-endpoint": "kafka://kafka.kafka.svc:9092", "kafka-ack-level": "broker", "use-ssl": "false"}' \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

This returns a TopicArn that you will use in the notification configuration.

## Create an S3 Bucket Notification

Create the notification configuration `notification.json`:

```json
{
  "TopicConfigurations": [
    {
      "Id": "object-created",
      "TopicArn": "arn:aws:sns:us-east-1::object-events",
      "Events": [
        "s3:ObjectCreated:*",
        "s3:ObjectRemoved:*"
      ],
      "Filter": {
        "Key": {
          "FilterRules": [
            {
              "Name": "prefix",
              "Value": "uploads/"
            },
            {
              "Name": "suffix",
              "Value": ".json"
            }
          ]
        }
      }
    }
  ]
}
```

Apply via AWS CLI:

```bash
aws s3api put-bucket-notification-configuration \
  --bucket my-bucket \
  --notification-configuration file://notification.json \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

## Consume Events from Kafka

Deploy a test Kafka consumer:

```bash
kubectl -n kafka exec -it kafka-0 -- \
  kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic object-events \
  --from-beginning
```

A sample event message:

```json
{
  "Records": [
    {
      "eventVersion": "2.1",
      "eventSource": "ceph:s3",
      "eventName": "ObjectCreated:Put",
      "s3": {
        "bucket": {
          "name": "my-bucket"
        },
        "object": {
          "key": "uploads/data.json",
          "size": 1024
        }
      }
    }
  ]
}
```

## HTTP Webhook Notification

For a simple HTTP endpoint, create the topic via the SNS API:

```bash
aws sns create-topic \
  --name http-events \
  --attributes '{"push-endpoint": "http://webhook-receiver.default.svc:8080/events"}' \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

## Get Current Notification Config

```bash
aws s3api get-bucket-notification-configuration \
  --bucket my-bucket \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

## Summary

Ceph RGW bucket notifications make it easy to build event-driven pipelines that react to object changes. Kafka integration is the most robust option for production workflows, enabling reliable, at-least-once delivery of S3 events to downstream consumers in your Kubernetes cluster.
