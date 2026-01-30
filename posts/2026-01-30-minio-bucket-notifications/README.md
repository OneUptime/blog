# How to Create MinIO Bucket Notifications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: MinIO, ObjectStorage, EventDriven, Notifications

Description: Learn how to configure MinIO bucket notifications to trigger event-driven workflows when objects are created, accessed, or deleted.

---

Object storage becomes reactive when you wire it to events. MinIO bucket notifications let you trigger downstream workflows the moment an object lands in a bucket, gets accessed, or is removed. Instead of polling for changes, your services receive push notifications and respond in real time.

## How Bucket Notifications Work

MinIO watches buckets for specific events and publishes messages to configured targets. Each notification contains metadata about the event: bucket name, object key, event type, timestamp, and more.

```mermaid
flowchart LR
    subgraph MinIO
        B[Bucket]
        NQ[Notification Queue]
    end

    subgraph Targets
        K[Kafka]
        A[AMQP/RabbitMQ]
        R[Redis]
        W[Webhook]
        N[NATS]
        P[PostgreSQL]
    end

    subgraph Consumers
        S1[Image Processor]
        S2[Indexer]
        S3[Backup Service]
        S4[Analytics Pipeline]
    end

    B -->|Event| NQ
    NQ --> K --> S1
    NQ --> A --> S2
    NQ --> R --> S3
    NQ --> W --> S4
```

## Supported Event Types

MinIO supports granular event filtering. You can subscribe to exactly the events your workflow needs.

| Event Type | Trigger |
| --- | --- |
| `s3:ObjectCreated:*` | Any object creation (Put, Post, Copy, CompleteMultipartUpload) |
| `s3:ObjectCreated:Put` | Object created via PUT |
| `s3:ObjectCreated:Post` | Object created via POST |
| `s3:ObjectCreated:Copy` | Object created via COPY |
| `s3:ObjectCreated:CompleteMultipartUpload` | Multipart upload completed |
| `s3:ObjectAccessed:*` | Any object access (Get, Head) |
| `s3:ObjectAccessed:Get` | Object retrieved via GET |
| `s3:ObjectAccessed:Head` | Object metadata retrieved via HEAD |
| `s3:ObjectRemoved:*` | Any object deletion |
| `s3:ObjectRemoved:Delete` | Object deleted |
| `s3:ObjectRemoved:DeleteMarkerCreated` | Delete marker created (versioned bucket) |

## Setting Up Target Services

Before configuring notifications, you need to register your target service with MinIO.

### Kafka Target

```bash
# Set Kafka environment variables before starting MinIO
export MINIO_NOTIFY_KAFKA_ENABLE_PRIMARY="on"
export MINIO_NOTIFY_KAFKA_BROKERS_PRIMARY="kafka1:9092,kafka2:9092,kafka3:9092"
export MINIO_NOTIFY_KAFKA_TOPIC_PRIMARY="minio-events"

# Optional: Enable TLS and authentication
export MINIO_NOTIFY_KAFKA_TLS_PRIMARY="on"
export MINIO_NOTIFY_KAFKA_SASL_ENABLE_PRIMARY="on"
export MINIO_NOTIFY_KAFKA_SASL_USERNAME_PRIMARY="minio"
export MINIO_NOTIFY_KAFKA_SASL_PASSWORD_PRIMARY="secret"
```

Or configure using `mc admin config`:

```bash
# Configure Kafka target using MinIO Client
mc admin config set myminio notify_kafka:primary \
    brokers="kafka1:9092,kafka2:9092" \
    topic="minio-events" \
    tls="off" \
    sasl="off"

# Restart MinIO to apply changes
mc admin service restart myminio
```

### AMQP/RabbitMQ Target

```bash
# Environment variables for AMQP
export MINIO_NOTIFY_AMQP_ENABLE_PRIMARY="on"
export MINIO_NOTIFY_AMQP_URL_PRIMARY="amqp://user:password@rabbitmq:5672"
export MINIO_NOTIFY_AMQP_EXCHANGE_PRIMARY="minio-exchange"
export MINIO_NOTIFY_AMQP_EXCHANGE_TYPE_PRIMARY="fanout"
export MINIO_NOTIFY_AMQP_ROUTING_KEY_PRIMARY="minio"
export MINIO_NOTIFY_AMQP_DURABLE_PRIMARY="on"
```

Using `mc admin config`:

```bash
# Configure RabbitMQ target
mc admin config set myminio notify_amqp:primary \
    url="amqp://user:password@rabbitmq:5672" \
    exchange="minio-exchange" \
    exchange_type="fanout" \
    routing_key="minio" \
    durable="on"

mc admin service restart myminio
```

### Redis Target

```bash
# Environment variables for Redis
export MINIO_NOTIFY_REDIS_ENABLE_PRIMARY="on"
export MINIO_NOTIFY_REDIS_ADDRESS_PRIMARY="redis:6379"
export MINIO_NOTIFY_REDIS_KEY_PRIMARY="minio-events"
export MINIO_NOTIFY_REDIS_FORMAT_PRIMARY="namespace"

# Optional: Redis authentication
export MINIO_NOTIFY_REDIS_PASSWORD_PRIMARY="redispassword"
```

Using `mc admin config`:

```bash
# Configure Redis target
mc admin config set myminio notify_redis:primary \
    address="redis:6379" \
    key="minio-events" \
    format="namespace" \
    password="redispassword"

mc admin service restart myminio
```

### Webhook Target

Webhooks are the simplest integration point. MinIO POSTs event JSON to your HTTP endpoint.

```bash
# Environment variables for Webhook
export MINIO_NOTIFY_WEBHOOK_ENABLE_PRIMARY="on"
export MINIO_NOTIFY_WEBHOOK_ENDPOINT_PRIMARY="http://myservice:8080/minio-events"

# Optional: Add authentication header
export MINIO_NOTIFY_WEBHOOK_AUTH_TOKEN_PRIMARY="Bearer mytoken123"
```

Using `mc admin config`:

```bash
# Configure Webhook target
mc admin config set myminio notify_webhook:primary \
    endpoint="http://myservice:8080/minio-events" \
    auth_token="Bearer mytoken123"

mc admin service restart myminio
```

## Configuring Bucket Notifications

Once targets are configured, attach notifications to specific buckets.

### Using MinIO Client (mc)

```bash
# List current notification configuration
mc event list myminio/mybucket

# Add notification for all object creation events to Kafka
mc event add myminio/mybucket arn:minio:sqs::primary:kafka \
    --event put,delete \
    --prefix uploads/ \
    --suffix .jpg

# Add notification for all events to webhook
mc event add myminio/mybucket arn:minio:sqs::primary:webhook \
    --event put

# Remove a notification
mc event remove myminio/mybucket arn:minio:sqs::primary:kafka
```

### Using AWS SDK (Python)

```python
import boto3
from botocore.client import Config

# Create MinIO client using S3-compatible API
s3_client = boto3.client(
    's3',
    endpoint_url='http://minio:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

# Define notification configuration
notification_config = {
    'QueueConfigurations': [
        {
            # ARN format: arn:minio:sqs::<name>:<target_type>
            'QueueArn': 'arn:minio:sqs::primary:kafka',
            'Events': [
                's3:ObjectCreated:*',
                's3:ObjectRemoved:*'
            ],
            # Optional: Filter by prefix and suffix
            'Filter': {
                'Key': {
                    'FilterRules': [
                        {
                            'Name': 'prefix',
                            'Value': 'uploads/'
                        },
                        {
                            'Name': 'suffix',
                            'Value': '.json'
                        }
                    ]
                }
            }
        }
    ]
}

# Apply notification configuration to bucket
s3_client.put_bucket_notification_configuration(
    Bucket='mybucket',
    NotificationConfiguration=notification_config
)

print("Notification configuration applied successfully")
```

### Using AWS SDK (Node.js)

```javascript
const { S3Client, PutBucketNotificationConfigurationCommand } = require('@aws-sdk/client-s3');

// Create MinIO client
const s3Client = new S3Client({
    endpoint: 'http://minio:9000',
    region: 'us-east-1',
    credentials: {
        accessKeyId: 'minioadmin',
        secretAccessKey: 'minioadmin'
    },
    forcePathStyle: true // Required for MinIO
});

// Define notification configuration
const notificationConfig = {
    Bucket: 'mybucket',
    NotificationConfiguration: {
        QueueConfigurations: [
            {
                QueueArn: 'arn:minio:sqs::primary:webhook',
                Events: ['s3:ObjectCreated:*'],
                Filter: {
                    Key: {
                        FilterRules: [
                            { Name: 'prefix', Value: 'images/' },
                            { Name: 'suffix', Value: '.png' }
                        ]
                    }
                }
            }
        ]
    }
};

// Apply configuration
async function configureNotifications() {
    const command = new PutBucketNotificationConfigurationCommand(notificationConfig);
    await s3Client.send(command);
    console.log('Notification configuration applied');
}

configureNotifications();
```

## Event Notification Format

When an event occurs, MinIO sends a JSON payload to the configured target.

```json
{
  "EventName": "s3:ObjectCreated:Put",
  "Key": "mybucket/uploads/document.pdf",
  "Records": [
    {
      "eventVersion": "2.0",
      "eventSource": "minio:s3",
      "awsRegion": "",
      "eventTime": "2026-01-30T10:15:30.000Z",
      "eventName": "s3:ObjectCreated:Put",
      "userIdentity": {
        "principalId": "minioadmin"
      },
      "requestParameters": {
        "principalId": "minioadmin",
        "region": "",
        "sourceIPAddress": "172.17.0.1"
      },
      "responseElements": {
        "x-amz-request-id": "17A4D8F2C8A3B4E1",
        "x-minio-deployment-id": "6f5e4d3c-2b1a-0987-6543-210fedcba987",
        "x-minio-origin-endpoint": "http://minio:9000"
      },
      "s3": {
        "s3SchemaVersion": "1.0",
        "configurationId": "Config",
        "bucket": {
          "name": "mybucket",
          "ownerIdentity": {
            "principalId": "minioadmin"
          },
          "arn": "arn:aws:s3:::mybucket"
        },
        "object": {
          "key": "uploads/document.pdf",
          "size": 1048576,
          "eTag": "d41d8cd98f00b204e9800998ecf8427e",
          "contentType": "application/pdf",
          "userMetadata": {
            "content-type": "application/pdf"
          },
          "sequencer": "17A4D8F2C8A3B4E1"
        }
      },
      "source": {
        "host": "172.17.0.1",
        "port": "",
        "userAgent": "MinIO (linux; amd64) minio-go/v7.0.0"
      }
    }
  ]
}
```

## Event Flow Architecture

Here is a complete event-driven architecture using MinIO notifications.

```mermaid
flowchart TB
    subgraph Clients
        U[User Upload]
        API[API Service]
    end

    subgraph MinIO Cluster
        LB[Load Balancer]
        M1[MinIO Node 1]
        M2[MinIO Node 2]
        M3[MinIO Node 3]
    end

    subgraph Message Queue
        K[Kafka Cluster]
        T1[Topic: raw-uploads]
        T2[Topic: processed]
        T3[Topic: thumbnails]
    end

    subgraph Workers
        IP[Image Processor]
        TG[Thumbnail Generator]
        ML[ML Classification]
        IDX[Search Indexer]
    end

    subgraph Storage
        PG[(PostgreSQL)]
        ES[(Elasticsearch)]
    end

    U --> LB
    API --> LB
    LB --> M1 & M2 & M3
    M1 & M2 & M3 -->|Notifications| K
    K --> T1
    T1 --> IP --> T2
    T1 --> TG --> T3
    T1 --> ML
    T2 --> IDX --> ES
    IP --> PG
    TG --> M1
```

## Notification Queue Management

MinIO maintains an internal queue for notifications. Understanding queue behavior is critical for reliability.

### Queue Configuration

```bash
# Set queue directory for persistent notifications
export MINIO_NOTIFY_KAFKA_QUEUE_DIR_PRIMARY="/data/.minio/events/kafka"
export MINIO_NOTIFY_KAFKA_QUEUE_LIMIT_PRIMARY="100000"

# Same for other targets
export MINIO_NOTIFY_WEBHOOK_QUEUE_DIR_PRIMARY="/data/.minio/events/webhook"
export MINIO_NOTIFY_WEBHOOK_QUEUE_LIMIT_PRIMARY="10000"
```

### Monitoring Queue Health

```bash
# Check notification target status
mc admin info myminio --json | jq '.info.sqsARN'

# View MinIO server logs for notification errors
mc admin logs myminio --last 1h | grep -i notification
```

### Handling Failures

When a target is unavailable, MinIO queues events locally. Configure retry behavior:

```bash
# Configure retry settings via environment
export MINIO_NOTIFY_KAFKA_QUEUE_DIR_PRIMARY="/data/minio/events"
```

If the queue fills up, MinIO logs warnings and eventually drops events. Monitor queue size and target availability.

## Building a Webhook Consumer

Here is a complete example of a webhook consumer service.

### Python Flask Consumer

```python
from flask import Flask, request, jsonify
import json
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/minio-events', methods=['POST'])
def handle_minio_event():
    """
    Handle incoming MinIO bucket notification events.
    This endpoint receives POST requests from MinIO webhook target.
    """
    try:
        # Parse the event payload
        event_data = request.get_json()

        # Extract records from the event
        records = event_data.get('Records', [])

        for record in records:
            # Get event details
            event_name = record.get('eventName', '')
            bucket_name = record['s3']['bucket']['name']
            object_key = record['s3']['object']['key']
            object_size = record['s3']['object'].get('size', 0)
            event_time = record.get('eventTime', '')

            logger.info(
                f"Event: {event_name} | "
                f"Bucket: {bucket_name} | "
                f"Key: {object_key} | "
                f"Size: {object_size} bytes"
            )

            # Route to appropriate handler based on event type
            if event_name.startswith('s3:ObjectCreated'):
                handle_object_created(bucket_name, object_key, record)
            elif event_name.startswith('s3:ObjectRemoved'):
                handle_object_removed(bucket_name, object_key, record)
            elif event_name.startswith('s3:ObjectAccessed'):
                handle_object_accessed(bucket_name, object_key, record)

        return jsonify({'status': 'processed'}), 200

    except Exception as e:
        logger.error(f"Error processing event: {e}")
        return jsonify({'error': str(e)}), 500


def handle_object_created(bucket, key, record):
    """Process newly created objects."""
    # Example: Trigger image processing for uploaded images
    if key.endswith(('.jpg', '.jpeg', '.png', '.gif')):
        logger.info(f"Queueing image processing for {key}")
        # Add to processing queue

    # Example: Index documents for search
    elif key.endswith(('.pdf', '.doc', '.docx')):
        logger.info(f"Queueing document indexing for {key}")
        # Add to indexing queue


def handle_object_removed(bucket, key, record):
    """Process object deletions."""
    logger.info(f"Object deleted: {bucket}/{key}")
    # Remove from search index, clean up thumbnails, etc.


def handle_object_accessed(bucket, key, record):
    """Track object access for analytics."""
    logger.info(f"Object accessed: {bucket}/{key}")
    # Update access metrics, popularity scores, etc.


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

### Node.js Express Consumer

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// Handle MinIO webhook notifications
app.post('/minio-events', (req, res) => {
    try {
        const eventData = req.body;
        const records = eventData.Records || [];

        records.forEach(record => {
            const eventName = record.eventName;
            const bucket = record.s3.bucket.name;
            const key = record.s3.object.key;
            const size = record.s3.object.size;

            console.log(`Event: ${eventName} | Bucket: ${bucket} | Key: ${key}`);

            // Route based on event type
            if (eventName.startsWith('s3:ObjectCreated')) {
                handleObjectCreated(bucket, key, record);
            } else if (eventName.startsWith('s3:ObjectRemoved')) {
                handleObjectRemoved(bucket, key, record);
            }
        });

        res.json({ status: 'processed' });

    } catch (error) {
        console.error('Error processing event:', error);
        res.status(500).json({ error: error.message });
    }
});

function handleObjectCreated(bucket, key, record) {
    // Process new uploads
    const extension = key.split('.').pop().toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
        console.log(`Processing image: ${key}`);
        // Queue image processing job
    }
}

function handleObjectRemoved(bucket, key, record) {
    console.log(`Cleaning up after deletion: ${key}`);
    // Remove related resources
}

app.listen(8080, () => {
    console.log('MinIO webhook consumer listening on port 8080');
});
```

## Kafka Consumer Example

For high-throughput scenarios, consume events from Kafka.

```python
from kafka import KafkaConsumer
import json

# Create Kafka consumer
consumer = KafkaConsumer(
    'minio-events',
    bootstrap_servers=['kafka1:9092', 'kafka2:9092'],
    group_id='minio-event-processors',
    auto_offset_reset='earliest',
    enable_auto_commit=True,
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

print("Starting MinIO event consumer...")

for message in consumer:
    event = message.value
    records = event.get('Records', [])

    for record in records:
        event_name = record['eventName']
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        print(f"Processing: {event_name} - {bucket}/{key}")

        # Implement your processing logic here
        if event_name == 's3:ObjectCreated:Put':
            # Handle new object
            pass
        elif event_name == 's3:ObjectRemoved:Delete':
            # Handle deletion
            pass
```

## Filtering Events

Use prefix and suffix filters to receive only relevant events.

```bash
# Only notify for uploads in the "images/" folder with .jpg extension
mc event add myminio/mybucket arn:minio:sqs::primary:webhook \
    --event put \
    --prefix images/ \
    --suffix .jpg

# Only notify for deletions in the "temp/" folder
mc event add myminio/mybucket arn:minio:sqs::primary:kafka \
    --event delete \
    --prefix temp/
```

Filter combinations:

```mermaid
flowchart LR
    subgraph Bucket
        I1[images/photo.jpg]
        I2[images/photo.png]
        D1[docs/report.pdf]
        T1[temp/cache.tmp]
    end

    subgraph Filters
        F1[prefix=images/ suffix=.jpg]
        F2[prefix=docs/]
        F3[prefix=temp/]
    end

    subgraph Targets
        W1[Webhook: Image Processor]
        W2[Kafka: Document Indexer]
        W3[Redis: Cache Cleaner]
    end

    I1 --> F1 --> W1
    I2 -.-x F1
    D1 --> F2 --> W2
    T1 --> F3 --> W3
```

## Kubernetes Deployment Example

Deploy MinIO with notifications in Kubernetes.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: minio-config
data:
  # Kafka notification target
  MINIO_NOTIFY_KAFKA_ENABLE_PRIMARY: "on"
  MINIO_NOTIFY_KAFKA_BROKERS_PRIMARY: "kafka.messaging:9092"
  MINIO_NOTIFY_KAFKA_TOPIC_PRIMARY: "minio-events"

  # Webhook notification target
  MINIO_NOTIFY_WEBHOOK_ENABLE_PROCESSOR: "on"
  MINIO_NOTIFY_WEBHOOK_ENDPOINT_PROCESSOR: "http://event-processor:8080/events"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
        - name: minio
          image: minio/minio:latest
          args:
            - server
            - /data
            - --console-address
            - ":9001"
          envFrom:
            - configMapRef:
                name: minio-config
          env:
            - name: MINIO_ROOT_USER
              valueFrom:
                secretKeyRef:
                  name: minio-credentials
                  key: root-user
            - name: MINIO_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: minio-credentials
                  key: root-password
          ports:
            - containerPort: 9000
              name: api
            - containerPort: 9001
              name: console
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: minio-pvc
```

## Troubleshooting

### Notifications Not Arriving

1. Check target configuration:

```bash
# Verify target is configured
mc admin config get myminio notify_kafka
mc admin config get myminio notify_webhook
```

2. Check bucket event configuration:

```bash
# List events for bucket
mc event list myminio/mybucket
```

3. Check MinIO logs:

```bash
# Stream MinIO logs
mc admin logs myminio

# Filter for notification errors
mc admin logs myminio 2>&1 | grep -i "notify\|event\|queue"
```

### Target Connection Failures

```bash
# Test Kafka connectivity from MinIO pod
kubectl exec -it minio-pod -- nc -zv kafka:9092

# Test webhook endpoint
kubectl exec -it minio-pod -- curl -v http://processor:8080/health
```

### Events Duplicated or Missing

- Ensure `queue_dir` is on persistent storage
- Check `queue_limit` is not exceeded
- Verify consumer is committing offsets (Kafka)
- Check for network partitions between MinIO and target

## Best Practices

1. **Use persistent queue directories.** Configure `queue_dir` to survive restarts.

2. **Set appropriate queue limits.** Balance memory usage against event loss risk.

3. **Make consumers idempotent.** Events may be delivered more than once.

4. **Filter at the source.** Use prefix/suffix filters to reduce noise.

5. **Monitor queue depth.** Alert when queues grow faster than consumers drain them.

6. **Use dead letter queues.** Route failed events for later inspection.

7. **Version your event handlers.** Event schema may change with MinIO upgrades.

---

Bucket notifications transform MinIO from passive storage into an active participant in your data pipeline. Start with webhooks for simplicity, graduate to Kafka for scale, and always design consumers to handle duplicates gracefully.
