# How to Set Topic Persistency and Notification Settings in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Notification, Topic, Object Storage

Description: Configure bucket notifications and persistent topics in Ceph RGW to publish S3 events to Kafka, RabbitMQ, or HTTP endpoints for event-driven architectures.

---

Ceph RGW supports S3-compatible bucket notifications that publish events (object created, deleted, etc.) to external message brokers. Persistent topics ensure events are not lost if the broker is temporarily unavailable.

## Supported Notification Endpoints

- **Kafka** - Apache Kafka topics
- **RabbitMQ/AMQP** - AMQP message queues
- **HTTP/HTTPS** - Webhook endpoints

## Key Notification Parameters

```bash
# Enable bucket notifications
ceph config set client.rgw rgw_enable_apis "s3,admin,notifications"

# Maximum retries for persistent notification delivery
ceph config set client.rgw rgw_topic_persistency_max_retries 10

# Minimum time between retries of the same persistent notification (seconds)
ceph config set client.rgw rgw_topic_persistency_sleep_duration 1
```

## Creating a Persistent Topic

Using the AWS SNS-compatible API:

```bash
# Create a Kafka topic endpoint
aws sns create-topic \
  --name my-bucket-events \
  --attributes '{"push-endpoint":"kafka://kafka.example.com:9092","kafka-ack-level":"broker","persistent":"true"}' \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  --region us-east-1

# Get the topic ARN
TOPIC_ARN=$(aws sns list-topics \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc \
  --region us-east-1 \
  --query 'Topics[0].TopicArn' \
  --output text)
```

## Configuring Bucket Notifications

```bash
# Create notification configuration JSON
cat > notification.json << EOF
{
  "TopicConfigurations": [
    {
      "Id": "all-events",
      "TopicArn": "$TOPIC_ARN",
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
EOF

# Apply to bucket
aws s3api put-bucket-notification-configuration \
  --bucket my-bucket \
  --notification-configuration file://notification.json \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc
```

## Persistent Notification Configuration

```bash
# Maximum retries for persistent notification delivery
ceph config set client.rgw rgw_topic_persistency_max_retries 10

# Minimum time between retries of the same persistent notification (seconds)
ceph config set client.rgw rgw_topic_persistency_sleep_duration 1

# Time-to-live for persistent notifications (seconds, 0 = unlimited)
ceph config set client.rgw rgw_topic_persistency_time_to_live 0
```

## Applying in Rook

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw.my-store.a]
    rgw_topic_persistency_max_retries = 10
    rgw_topic_persistency_sleep_duration = 1
    rgw_enable_apis = s3,admin,notifications
```

## Monitoring Notifications

```bash
# List topics
radosgw-admin topic list

# Get topic details
radosgw-admin topic get --topic=my-bucket-events

# List pending notifications
radosgw-admin notification list --bucket=my-bucket
```

## Summary

Ceph RGW bucket notifications publish S3 events to Kafka, AMQP, or HTTP endpoints. Enable the `notifications` API and set the `persistent` attribute to `true` when creating topics to avoid event loss during broker downtime. Use `radosgw-admin topic list` to monitor active notification topics.
