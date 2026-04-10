# How to Configure Bucket Notifications to Kafka in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, RGW, Kafka, Notification, Event, Object Storage

Description: Set up Ceph RGW bucket notifications to publish S3 object events to an Apache Kafka topic for real-time event-driven processing.

---

## Overview

Ceph RGW supports SNS-compatible bucket notifications that publish events (object created, deleted, etc.) to endpoints including Kafka, AMQP (e.g., RabbitMQ), and HTTP. This enables event-driven architectures where downstream services react to object storage changes in real time.

## Prerequisites

- Ceph RGW with notifications support (Nautilus or later)
- A running Kafka cluster accessible from RGW
- AWS CLI or boto3 for API calls

## Step 1: Create an SNS Topic Pointing to Kafka

RGW uses an SNS-compatible API to define notification endpoints. Create a topic that targets your Kafka cluster:

```bash
aws sns create-topic \
  --name s3-events \
  --attributes '{"push-endpoint": "kafka://kafka.example.com:9092", "kafka-ack-level": "broker"}' \
  --endpoint-url http://rgw.example.com:7480
```

The response contains the topic ARN, e.g.:
`arn:aws:sns:default::s3-events`

## Step 2: Create a Bucket Notification

Define which events trigger a notification and associate the topic:

```json
{
  "TopicConfigurations": [
    {
      "Id": "kafka-put-events",
      "TopicArn": "arn:aws:sns:default::s3-events",
      "Events": ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {"Name": "prefix", "Value": "uploads/"}
          ]
        }
      }
    }
  ]
}
```

Apply it to the bucket:

```bash
aws s3api put-bucket-notification-configuration \
  --bucket my-bucket \
  --notification-configuration file://notification.json \
  --endpoint-url http://rgw.example.com:7480
```

## Step 3: Verify the Configuration

```bash
aws s3api get-bucket-notification-configuration \
  --bucket my-bucket \
  --endpoint-url http://rgw.example.com:7480
```

## Step 4: Test the Notification

Upload an object and consume from the Kafka topic:

```bash
aws s3 cp testfile.txt s3://my-bucket/uploads/ \
  --endpoint-url http://rgw.example.com:7480

# In another terminal, consume from Kafka
kafka-console-consumer.sh \
  --bootstrap-server kafka.example.com:9092 \
  --topic s3-events \
  --from-beginning
```

You should see a JSON event message containing object metadata, event type, and bucket details.

## Kafka Authentication (SASL)

For secured Kafka, include credentials in the topic attributes:

```bash
aws sns create-topic \
  --name s3-events-secure \
  --attributes '{
    "push-endpoint": "kafka://kafka.example.com:9092",
    "kafka-ack-level": "broker",
    "use-ssl": "true",
    "mechanism": "PLAIN",
    "user-name": "kafkauser",
    "password": "kafkapassword"
  }' \
  --endpoint-url http://rgw.example.com:7480
```

## Summary

Ceph RGW bucket notifications to Kafka use the SNS-compatible API to create a topic pointing at your Kafka broker, then attach that topic to bucket events via `put-bucket-notification-configuration`. Events are published as JSON messages to the specified Kafka topic whenever objects are created or deleted, enabling real-time downstream processing.
