# How to Run Amazon SQS Compatible (ElasticMQ) in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, ElasticMQ, Amazon SQS, Message Queues, AWS, DevOps, Local Development

Description: Run ElasticMQ in Docker as a local Amazon SQS replacement for development and testing without AWS costs or credentials.

---

ElasticMQ is an in-memory message queue that implements the Amazon SQS API. It lets you develop and test applications that use SQS without connecting to AWS, paying for queue operations, or dealing with network latency. Your application code stays exactly the same - you just point the SQS client at your local ElasticMQ instance instead of AWS.

This is incredibly valuable for local development, CI/CD pipelines, and integration testing. You get instant queue operations, no AWS credentials needed, and deterministic behavior for your tests.

## Quick Start

Run ElasticMQ with a single command:

```bash
# Start ElasticMQ with the SQS API on port 9324 and the UI on port 9325
docker run -d \
  --name elasticmq \
  -p 9324:9324 \
  -p 9325:9325 \
  softwaremill/elasticmq-native
```

Port 9324 serves the SQS-compatible API. Port 9325 hosts a simple web UI where you can view queues and messages.

Verify it is running:

```bash
# Test the endpoint with a simple API call
curl http://localhost:9324/?Action=ListQueues
```

## Docker Compose Setup

For project integration, use Docker Compose:

```yaml
# docker-compose.yml - ElasticMQ for local SQS development
version: "3.8"

services:
  elasticmq:
    image: softwaremill/elasticmq-native
    ports:
      # SQS-compatible API endpoint
      - "9324:9324"
      # Web UI for queue management
      - "9325:9325"
    volumes:
      # Mount custom configuration
      - ./elasticmq.conf:/opt/elasticmq.conf
    restart: unless-stopped
```

## Custom Configuration

ElasticMQ uses a HOCON configuration file to pre-create queues and set their properties:

```hocon
// elasticmq.conf - Pre-configure queues for your application
include classpath("application.conf")

// Node address configuration
node-address {
  protocol = http
  host = localhost
  port = 9324
  context-path = ""
}

// REST SQS interface settings
rest-sqs {
  enabled = true
  bind-port = 9324
  bind-hostname = "0.0.0.0"

  // SQS limits
  sqs-limits = strict
}

// Pre-define queues so they exist when the application starts
queues {
  // Standard order processing queue
  orders-queue {
    defaultVisibilityTimeout = 30 seconds
    delay = 0 seconds
    receiveMessageWait = 0 seconds
  }

  // Dead letter queue for failed order processing
  orders-dlq {
    defaultVisibilityTimeout = 30 seconds
    delay = 0 seconds
    receiveMessageWait = 0 seconds
  }

  // Email notification queue with a 5-second delay
  email-notifications {
    defaultVisibilityTimeout = 60 seconds
    delay = 5 seconds
    receiveMessageWait = 0 seconds
  }

  // FIFO queue for sequential processing
  payments-queue {
    defaultVisibilityTimeout = 30 seconds
    delay = 0 seconds
    receiveMessageWait = 0 seconds
    fifo = true
    contentBasedDeduplication = true
  }
}
```

## Configuring Dead Letter Queues

ElasticMQ supports dead letter queue (DLQ) redrive policies, just like SQS:

```hocon
// elasticmq.conf - Queues with dead letter queue configuration
queues {
  orders-queue {
    defaultVisibilityTimeout = 30 seconds
    delay = 0 seconds
    receiveMessageWait = 0 seconds

    // After 3 failed processing attempts, move messages to the DLQ
    deadLettersQueue {
      name = "orders-dlq"
      maxReceiveCount = 3
    }
  }

  orders-dlq {
    defaultVisibilityTimeout = 30 seconds
  }
}
```

## Using with AWS SDK (Python/Boto3)

The main benefit of ElasticMQ is that your application code needs minimal changes. Just override the endpoint URL:

```python
# sqs_client.py - SQS operations that work with both ElasticMQ and real SQS
import boto3
import json
import os

# Point to ElasticMQ in development, real SQS in production
sqs_endpoint = os.getenv('SQS_ENDPOINT', 'http://localhost:9324')
aws_region = os.getenv('AWS_REGION', 'us-east-1')

# Create the SQS client
# For ElasticMQ, credentials can be any non-empty string
sqs = boto3.client(
    'sqs',
    endpoint_url=sqs_endpoint,
    region_name=aws_region,
    aws_access_key_id='local',
    aws_secret_access_key='local'
)

# Get the queue URL
queue_url = f'{sqs_endpoint}/000000000000/orders-queue'

# Send a message to the queue
def send_order(order_data):
    response = sqs.send_message(
        QueueUrl=queue_url,
        MessageBody=json.dumps(order_data),
        MessageAttributes={
            'OrderType': {
                'StringValue': order_data.get('type', 'standard'),
                'DataType': 'String'
            }
        }
    )
    print(f"Message sent. ID: {response['MessageId']}")
    return response

# Receive and process messages from the queue
def process_orders():
    while True:
        response = sqs.receive_message(
            QueueUrl=queue_url,
            MaxNumberOfMessages=10,
            WaitTimeSeconds=20,
            MessageAttributeNames=['All']
        )

        messages = response.get('Messages', [])
        if not messages:
            print("No messages available, waiting...")
            continue

        for message in messages:
            body = json.loads(message['Body'])
            print(f"Processing order: {body}")

            # Delete the message after successful processing
            sqs.delete_message(
                QueueUrl=queue_url,
                ReceiptHandle=message['ReceiptHandle']
            )
            print(f"Message deleted: {message['MessageId']}")

# Test the setup
if __name__ == '__main__':
    # Send a test order
    send_order({
        'order_id': '12345',
        'type': 'standard',
        'items': [{'sku': 'WIDGET-001', 'qty': 3}],
        'total': 29.99
    })

    # Process orders
    process_orders()
```

## Using with AWS SDK (Node.js)

```javascript
// sqs-client.js - Node.js SQS client compatible with ElasticMQ
const { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');

// Configure the SQS client to point to ElasticMQ
const client = new SQSClient({
  endpoint: process.env.SQS_ENDPOINT || 'http://localhost:9324',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
});

const QUEUE_URL = `${process.env.SQS_ENDPOINT || 'http://localhost:9324'}/000000000000/orders-queue`;

// Send a message
async function sendMessage(body) {
  const command = new SendMessageCommand({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify(body),
  });
  const response = await client.send(command);
  console.log(`Sent message: ${response.MessageId}`);
  return response;
}

// Receive and process messages
async function pollMessages() {
  while (true) {
    const command = new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
    });

    const response = await client.send(command);
    const messages = response.Messages || [];

    for (const msg of messages) {
      console.log(`Received: ${msg.Body}`);

      // Delete after processing
      await client.send(new DeleteMessageCommand({
        QueueUrl: QUEUE_URL,
        ReceiptHandle: msg.ReceiptHandle,
      }));
    }
  }
}

sendMessage({ order_id: '12345', total: 29.99 }).then(() => pollMessages());
```

## Full Development Stack

Here is a complete development setup with your application and ElasticMQ:

```yaml
# docker-compose.yml - Application stack with local SQS
version: "3.8"

services:
  elasticmq:
    image: softwaremill/elasticmq-native
    ports:
      - "9324:9324"
      - "9325:9325"
    volumes:
      - ./elasticmq.conf:/opt/elasticmq.conf

  # Web API that sends messages to the queue
  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      SQS_ENDPOINT: http://elasticmq:9324
      AWS_REGION: us-east-1
      AWS_ACCESS_KEY_ID: local
      AWS_SECRET_ACCESS_KEY: local
    depends_on:
      - elasticmq

  # Worker that processes messages from the queue
  worker:
    build: ./worker
    environment:
      SQS_ENDPOINT: http://elasticmq:9324
      AWS_REGION: us-east-1
      AWS_ACCESS_KEY_ID: local
      AWS_SECRET_ACCESS_KEY: local
    depends_on:
      - elasticmq
    restart: unless-stopped
```

## Using with AWS CLI

You can use the standard AWS CLI to interact with ElasticMQ:

```bash
# Create a queue using the AWS CLI
aws sqs create-queue \
  --queue-name test-queue \
  --endpoint-url http://localhost:9324 \
  --region us-east-1

# List all queues
aws sqs list-queues \
  --endpoint-url http://localhost:9324 \
  --region us-east-1

# Send a message
aws sqs send-message \
  --queue-url http://localhost:9324/000000000000/test-queue \
  --message-body '{"event": "user_signup", "user_id": "abc123"}' \
  --endpoint-url http://localhost:9324 \
  --region us-east-1

# Receive messages
aws sqs receive-message \
  --queue-url http://localhost:9324/000000000000/test-queue \
  --max-number-of-messages 10 \
  --endpoint-url http://localhost:9324 \
  --region us-east-1

# Get queue attributes
aws sqs get-queue-attributes \
  --queue-url http://localhost:9324/000000000000/orders-queue \
  --attribute-names All \
  --endpoint-url http://localhost:9324 \
  --region us-east-1
```

## Integration Testing

ElasticMQ works perfectly for automated tests. Here is a pattern for integration testing:

```python
# test_order_processing.py - Integration test using ElasticMQ
import boto3
import json
import pytest
import time

@pytest.fixture
def sqs_client():
    """Create an SQS client pointed at ElasticMQ."""
    return boto3.client(
        'sqs',
        endpoint_url='http://localhost:9324',
        region_name='us-east-1',
        aws_access_key_id='test',
        aws_secret_access_key='test'
    )

@pytest.fixture
def clean_queue(sqs_client):
    """Purge the queue before each test for a clean state."""
    queue_url = 'http://localhost:9324/000000000000/orders-queue'
    sqs_client.purge_queue(QueueUrl=queue_url)
    time.sleep(1)  # Allow purge to complete
    return queue_url

def test_order_message_flow(sqs_client, clean_queue):
    """Test that orders are correctly queued and retrievable."""
    order = {'order_id': 'test-001', 'total': 50.00}

    # Send the order
    sqs_client.send_message(
        QueueUrl=clean_queue,
        MessageBody=json.dumps(order)
    )

    # Receive and verify
    response = sqs_client.receive_message(
        QueueUrl=clean_queue,
        MaxNumberOfMessages=1,
        WaitTimeSeconds=5
    )

    assert len(response['Messages']) == 1
    received_order = json.loads(response['Messages'][0]['Body'])
    assert received_order['order_id'] == 'test-001'
    assert received_order['total'] == 50.00
```

## Summary

ElasticMQ gives you a fully SQS-compatible message queue that runs locally in Docker. It eliminates AWS dependencies during development and testing, speeds up your feedback loop, and keeps your CI/CD pipelines free from cloud service dependencies. The configuration file lets you pre-create queues with specific properties, and the web UI at port 9325 helps you inspect queue state during debugging. Since it implements the SQS API faithfully, switching between ElasticMQ and real SQS requires nothing more than changing the endpoint URL.
