# How to Set Up Amazon MQ with RabbitMQ

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon MQ, RabbitMQ, Messaging

Description: Learn how to set up Amazon MQ with RabbitMQ engine, including broker creation, connection configuration, publishing and consuming messages, and production best practices.

---

Amazon MQ is AWS's managed message broker service. If you're already using RabbitMQ on-premises or in EC2 and want a managed alternative, Amazon MQ gives you a fully managed RabbitMQ broker with automatic patching, failover, and backups. Unlike SNS/SQS which are AWS-proprietary, Amazon MQ speaks standard AMQP 0-9-1, so your existing RabbitMQ code works without changes.

## When to Use Amazon MQ vs SNS/SQS

Pick Amazon MQ when:
- You're migrating an existing RabbitMQ workload and don't want to rewrite
- You need AMQP protocol support
- You need complex routing with exchanges, bindings, and routing keys
- You need message-level TTL, dead letter exchanges, and priority queues
- You need the RabbitMQ management UI

Pick SNS/SQS when:
- You're building a new application on AWS
- You need massive scale (millions of messages per second)
- You want serverless, zero-maintenance messaging
- You don't need AMQP-specific features

## Creating a RabbitMQ Broker

### Via CLI

```bash
# Create a single-instance RabbitMQ broker for development
aws mq create-broker \
  --broker-name my-rabbitmq-dev \
  --engine-type RABBITMQ \
  --engine-version "3.13" \
  --host-instance-type mq.m5.large \
  --deployment-mode SINGLE_INSTANCE \
  --publicly-accessible \
  --users '[{
    "Username": "admin",
    "Password": "YourSecurePassword123!",
    "ConsoleAccess": true
  }]'
```

For production, use a cluster deployment for high availability.

```bash
# Create a clustered RabbitMQ broker for production
aws mq create-broker \
  --broker-name my-rabbitmq-prod \
  --engine-type RABBITMQ \
  --engine-version "3.13" \
  --host-instance-type mq.m5.large \
  --deployment-mode CLUSTER_MULTI_AZ \
  --publicly-accessible false \
  --subnet-ids subnet-abc123 subnet-def456 subnet-ghi789 \
  --security-groups sg-abc123 \
  --users '[{
    "Username": "admin",
    "Password": "YourSecurePassword123!",
    "ConsoleAccess": true
  }]' \
  --logs '{"General": true, "Audit": false}' \
  --maintenance-window-start-time '{
    "DayOfWeek": "SUNDAY",
    "TimeOfDay": "03:00",
    "TimeZone": "UTC"
  }'
```

Wait for the broker to become available.

```bash
# Check broker status
aws mq describe-broker --broker-id YOUR_BROKER_ID \
  --query 'BrokerState'

# Get the connection endpoints
aws mq describe-broker --broker-id YOUR_BROKER_ID \
  --query 'BrokerInstances[].Endpoints'
```

## Connecting to the Broker

### Python with Pika

Install the pika library and connect to your broker.

```bash
pip install pika
```

```python
import pika
import ssl
import json

# Connection parameters for Amazon MQ RabbitMQ
# Use the AMQPS (TLS) endpoint from the broker description
BROKER_ENDPOINT = 'amqps://b-abc123-1.mq.us-east-1.amazonaws.com'
USERNAME = 'admin'
PASSWORD = 'YourSecurePassword123!'
PORT = 5671  # AMQPS port

def get_connection():
    """Create a connection to the Amazon MQ RabbitMQ broker."""
    # SSL context for secure connection
    ssl_context = ssl.create_default_context()

    credentials = pika.PlainCredentials(USERNAME, PASSWORD)
    parameters = pika.ConnectionParameters(
        host='b-abc123-1.mq.us-east-1.amazonaws.com',
        port=PORT,
        credentials=credentials,
        ssl_options=pika.SSLOptions(ssl_context),
        # Heartbeat keeps the connection alive through load balancers
        heartbeat=30,
        # Connection timeout in seconds
        connection_attempts=3,
        retry_delay=5,
    )

    return pika.BlockingConnection(parameters)

# Test the connection
connection = get_connection()
channel = connection.channel()
print('Connected to Amazon MQ RabbitMQ')
connection.close()
```

### Node.js with amqplib

```bash
npm install amqplib
```

```javascript
const amqp = require('amqplib');

// Connection URL for Amazon MQ RabbitMQ
const BROKER_URL = 'amqps://admin:YourSecurePassword123!@b-abc123-1.mq.us-east-1.amazonaws.com:5671';

async function connect() {
  // Connect with TLS (amqps://)
  const connection = await amqp.connect(BROKER_URL, {
    heartbeat: 30,
  });

  const channel = await connection.createChannel();
  console.log('Connected to Amazon MQ RabbitMQ');
  return { connection, channel };
}

connect().then(({ connection }) => {
  connection.close();
});
```

## Setting Up Exchanges, Queues, and Bindings

Here's a complete setup for a typical order processing system.

```python
import pika
import ssl
import json

def setup_messaging_topology():
    """Set up exchanges, queues, and bindings for order processing."""
    connection = get_connection()
    channel = connection.channel()

    # Create a topic exchange for order events
    # Topic exchanges route based on routing key patterns
    channel.exchange_declare(
        exchange='order-events',
        exchange_type='topic',
        durable=True,  # Survives broker restarts
    )

    # Create a direct exchange for commands
    channel.exchange_declare(
        exchange='order-commands',
        exchange_type='direct',
        durable=True,
    )

    # Create a dead letter exchange for failed messages
    channel.exchange_declare(
        exchange='dead-letters',
        exchange_type='fanout',
        durable=True,
    )

    # Create queues with dead letter exchange configuration
    # Messages that fail processing go to the DLX
    channel.queue_declare(
        queue='order-processing',
        durable=True,
        arguments={
            'x-dead-letter-exchange': 'dead-letters',
            'x-message-ttl': 3600000,  # 1 hour TTL
        }
    )

    channel.queue_declare(
        queue='order-notifications',
        durable=True,
        arguments={
            'x-dead-letter-exchange': 'dead-letters',
        }
    )

    channel.queue_declare(
        queue='order-analytics',
        durable=True,
        arguments={
            'x-dead-letter-exchange': 'dead-letters',
        }
    )

    # Dead letter queue to collect failed messages
    channel.queue_declare(
        queue='dead-letter-queue',
        durable=True,
    )

    # Bind queues to exchanges with routing key patterns
    # order-processing gets all order events
    channel.queue_bind(
        queue='order-processing',
        exchange='order-events',
        routing_key='order.*',  # Matches order.created, order.updated, etc.
    )

    # order-notifications only gets creation and shipping events
    channel.queue_bind(
        queue='order-notifications',
        exchange='order-events',
        routing_key='order.created',
    )
    channel.queue_bind(
        queue='order-notifications',
        exchange='order-events',
        routing_key='order.shipped',
    )

    # order-analytics gets everything
    channel.queue_bind(
        queue='order-analytics',
        exchange='order-events',
        routing_key='#',  # Matches all routing keys
    )

    # Bind dead letter queue
    channel.queue_bind(
        queue='dead-letter-queue',
        exchange='dead-letters',
    )

    print('Messaging topology created successfully')
    connection.close()

setup_messaging_topology()
```

## Publishing Messages

```python
import pika
import json
from datetime import datetime

def publish_order_event(event_type, order_data):
    """Publish an order event to the topic exchange.

    The routing key determines which queues receive the message.
    """
    connection = get_connection()
    channel = connection.channel()

    message = {
        'event_type': event_type,
        'data': order_data,
        'timestamp': datetime.utcnow().isoformat(),
    }

    # Publish with persistent delivery mode so messages survive broker restarts
    channel.basic_publish(
        exchange='order-events',
        routing_key=f'order.{event_type}',
        body=json.dumps(message),
        properties=pika.BasicProperties(
            delivery_mode=2,       # Persistent
            content_type='application/json',
            headers={
                'source': 'order-service',
                'version': '1.0',
            }
        )
    )

    print(f'Published order.{event_type} event')
    connection.close()

# Publish some events
publish_order_event('created', {
    'order_id': 'ORD-12345',
    'customer_id': 'C-001',
    'total': 99.99,
})

publish_order_event('shipped', {
    'order_id': 'ORD-12345',
    'tracking_number': 'TRACK-789',
})
```

## Consuming Messages

```python
import pika
import json

def start_consumer(queue_name, handler_func):
    """Start consuming messages from a queue.

    Uses manual acknowledgment for reliable processing.
    Messages are only removed from the queue after successful processing.
    """
    connection = get_connection()
    channel = connection.channel()

    # Prefetch count limits how many unacknowledged messages
    # the broker sends to this consumer
    channel.basic_qos(prefetch_count=10)

    def callback(ch, method, properties, body):
        try:
            message = json.loads(body)
            handler_func(message)

            # Acknowledge successful processing
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            print(f'Error processing message: {e}')
            # Reject and don't requeue - send to dead letter exchange
            ch.basic_nack(
                delivery_tag=method.delivery_tag,
                requeue=False,
            )

    channel.basic_consume(
        queue=queue_name,
        on_message_callback=callback,
        auto_ack=False,  # Manual acknowledgment
    )

    print(f'Consuming from {queue_name}...')
    channel.start_consuming()

# Define message handlers
def handle_order_processing(message):
    """Process order events."""
    event_type = message['event_type']
    order_id = message['data']['order_id']
    print(f'Processing {event_type} for order {order_id}')

def handle_notifications(message):
    """Send notifications for order events."""
    event_type = message['event_type']
    order_id = message['data']['order_id']
    print(f'Sending notification for {event_type}: {order_id}')

# Start a consumer (this blocks)
start_consumer('order-processing', handle_order_processing)
```

## Setting Up with CDK

```typescript
import * as cdk from 'aws-cdk-lib';
import * as mq from 'aws-cdk-lib/aws-amazonmq';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

// Create a VPC for the broker
const vpc = new ec2.Vpc(this, 'BrokerVpc', {
  maxAzs: 3,
});

// Security group for the broker
const brokerSg = new ec2.SecurityGroup(this, 'BrokerSG', {
  vpc,
  description: 'Security group for Amazon MQ RabbitMQ broker',
});

// Allow AMQPS access from within the VPC
brokerSg.addIngressRule(
  ec2.Peer.ipv4(vpc.vpcCidrBlock),
  ec2.Port.tcp(5671),
  'AMQPS from VPC'
);

// Allow management console access
brokerSg.addIngressRule(
  ec2.Peer.ipv4(vpc.vpcCidrBlock),
  ec2.Port.tcp(443),
  'Management console from VPC'
);

// Create the broker
const broker = new mq.CfnBroker(this, 'RabbitMQBroker', {
  brokerName: 'my-rabbitmq',
  engineType: 'RABBITMQ',
  engineVersion: '3.13',
  hostInstanceType: 'mq.m5.large',
  deploymentMode: 'CLUSTER_MULTI_AZ',
  publiclyAccessible: false,
  subnetIds: vpc.selectSubnets({
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
  }).subnetIds.slice(0, 3),
  securityGroups: [brokerSg.securityGroupId],
  users: [{
    username: 'admin',
    password: 'YourSecurePassword123!',
    consoleAccess: true,
  }],
  logs: { general: true },
  maintenanceWindowStartTime: {
    dayOfWeek: 'SUNDAY',
    timeOfDay: '03:00',
    timeZone: 'UTC',
  },
});
```

## Monitoring Amazon MQ

Amazon MQ publishes metrics to CloudWatch. Set up alarms for queue depth, consumer count, and memory usage.

```bash
# Alarm on queue depth - messages piling up means consumers can't keep up
aws cloudwatch put-metric-alarm \
  --alarm-name "RabbitMQ-HighQueueDepth-order-processing" \
  --alarm-description "Messages accumulating in order-processing queue" \
  --namespace "AWS/AmazonMQ" \
  --metric-name "MessageCount" \
  --dimensions Name=Broker,Value=my-rabbitmq Name=VirtualHost,Value=/ Name=Queue,Value=order-processing \
  --statistic Average \
  --period 300 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:critical-alerts
```

For sending those alarm notifications, check out [using SNS with CloudWatch alarms](https://oneuptime.com/blog/post/2026-02-12-use-sns-with-cloudwatch-alarms/view).

Amazon MQ with RabbitMQ gives you a fully managed broker with all the features of open-source RabbitMQ. If you're already invested in AMQP and RabbitMQ patterns, it's the path of least resistance for running on AWS without managing the broker infrastructure yourself.
