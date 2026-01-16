# How to Install Apache Pulsar on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Apache Pulsar, Message Queue, Streaming, Tutorial

Description: Complete guide to installing and configuring Apache Pulsar distributed messaging on Ubuntu.

---

Apache Pulsar is a cloud-native, distributed messaging and streaming platform originally developed at Yahoo and now an Apache Software Foundation top-level project. Unlike traditional message brokers, Pulsar combines the best of both messaging queues and pub/sub systems while providing features like multi-tenancy, geo-replication, and tiered storage out of the box.

## Understanding Apache Pulsar

Apache Pulsar was designed to address limitations in existing messaging systems. It separates the serving layer (brokers) from the storage layer (Apache BookKeeper), enabling independent scaling of compute and storage. This architecture makes Pulsar particularly well-suited for:

- **High-throughput streaming:** Handle millions of messages per second with low latency
- **Multi-tenant environments:** Native support for tenants and namespaces
- **Geo-replication:** Built-in cross-datacenter replication
- **Unified messaging:** Support for both queuing and streaming semantics
- **Long-term storage:** Tiered storage allows offloading old data to cheaper storage

### Key Features

- **Guaranteed message delivery:** At-least-once, at-most-once, and effectively-once semantics
- **Horizontal scalability:** Add brokers and bookies independently
- **Low latency:** Sub-millisecond publish latency for most use cases
- **Schema registry:** Built-in schema enforcement and evolution
- **Pulsar Functions:** Lightweight serverless computing framework
- **Pulsar SQL:** Query historical data using Presto/Trino

## Architecture Overview

Pulsar's architecture consists of three main components that work together to provide a robust messaging platform.

### Brokers

Brokers are stateless serving components that handle:

- Accepting messages from producers
- Dispatching messages to consumers
- Replicating messages across clusters for geo-replication
- Communicating with the configuration store for coordination

Because brokers are stateless, you can add or remove them without data loss or complex rebalancing operations.

### BookKeeper (Bookies)

Apache BookKeeper provides the persistent storage layer for Pulsar. Bookies are the storage servers that:

- Store messages in append-only ledgers
- Replicate data across multiple bookies for durability
- Handle read requests for message consumption
- Support tiered storage for offloading to object storage

### ZooKeeper

ZooKeeper serves as the configuration and coordination store for both Pulsar and BookKeeper:

- Stores metadata about topics, schemas, and policies
- Coordinates broker leader election
- Manages bookie cluster membership
- Stores consumer cursor positions (in older versions)

Note: Pulsar 3.0+ supports running without ZooKeeper using an embedded metadata store, but ZooKeeper remains the production-tested option.

```
                    ┌─────────────────────────────────────────────┐
                    │              Pulsar Cluster                  │
                    │                                              │
    ┌──────────┐    │   ┌─────────┐  ┌─────────┐  ┌─────────┐    │
    │ Producer │────┼──▶│ Broker  │  │ Broker  │  │ Broker  │    │
    └──────────┘    │   └────┬────┘  └────┬────┘  └────┬────┘    │
                    │        │            │            │          │
    ┌──────────┐    │        ▼            ▼            ▼          │
    │ Consumer │◀───┼──  ┌─────────────────────────────────┐     │
    └──────────┘    │    │        BookKeeper (Bookies)      │     │
                    │    │  ┌──────┐ ┌──────┐ ┌──────┐     │     │
                    │    │  │Bookie│ │Bookie│ │Bookie│     │     │
                    │    │  └──────┘ └──────┘ └──────┘     │     │
                    │    └─────────────────────────────────┘     │
                    │                    │                        │
                    │    ┌───────────────┴───────────────┐       │
                    │    │          ZooKeeper            │       │
                    │    │  ┌────┐  ┌────┐  ┌────┐      │       │
                    │    │  │ ZK │  │ ZK │  │ ZK │      │       │
                    │    │  └────┘  └────┘  └────┘      │       │
                    │    └───────────────────────────────┘       │
                    └─────────────────────────────────────────────┘
```

## Prerequisites

Before installing Apache Pulsar, ensure your Ubuntu system meets the following requirements.

### System Requirements

- **Ubuntu:** 20.04 LTS, 22.04 LTS, or 24.04 LTS
- **RAM:** Minimum 4GB (8GB+ recommended for production)
- **Disk:** SSD storage recommended for BookKeeper
- **CPU:** 2+ cores (4+ for production)

### Installing Java

Apache Pulsar requires Java 17 or later. Here is how to install OpenJDK 17 on Ubuntu.

```bash
# Update package index to ensure we get the latest versions
sudo apt update

# Install OpenJDK 17 (required by Pulsar 3.x)
sudo apt install -y openjdk-17-jdk

# Verify Java installation - should show version 17.x.x
java -version

# Set JAVA_HOME environment variable for Pulsar scripts
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc

# Reload shell configuration to apply changes
source ~/.bashrc

# Verify JAVA_HOME is set correctly
echo $JAVA_HOME
```

### Additional Dependencies

Install required utilities for downloading and managing Pulsar.

```bash
# Install wget for downloading Pulsar, and other useful utilities
sudo apt install -y wget curl unzip netcat-openbsd
```

## Installing Apache Pulsar

There are several ways to install Pulsar. We will cover the binary distribution method, which is the most straightforward for getting started.

### Download Pulsar

```bash
# Create a directory for Pulsar installation
sudo mkdir -p /opt/pulsar

# Navigate to the installation directory
cd /opt/pulsar

# Download Apache Pulsar 3.3.0 (check for latest version at pulsar.apache.org)
sudo wget https://archive.apache.org/dist/pulsar/pulsar-3.3.0/apache-pulsar-3.3.0-bin.tar.gz

# Extract the archive
sudo tar xvfz apache-pulsar-3.3.0-bin.tar.gz

# Create a symbolic link for easier access and future upgrades
sudo ln -s apache-pulsar-3.3.0 current

# Set ownership (replace 'pulsar' with your user or create a dedicated user)
sudo useradd -r -s /bin/false pulsar
sudo chown -R pulsar:pulsar /opt/pulsar
```

### Verify Installation

```bash
# Check the Pulsar version
/opt/pulsar/current/bin/pulsar version

# List the directory structure to understand the layout
ls -la /opt/pulsar/current/
# Key directories:
# bin/       - Pulsar executables and CLI tools
# conf/      - Configuration files
# lib/       - Java libraries
# instances/ - Pulsar Functions worker instances
```

## Standalone Mode for Development

Standalone mode runs all Pulsar components (broker, bookie, ZooKeeper) in a single JVM process. This is perfect for development and testing but should never be used in production.

### Starting Standalone Mode

```bash
# Start Pulsar in standalone mode (runs in foreground)
# This starts ZooKeeper, BookKeeper, and a Pulsar broker
/opt/pulsar/current/bin/pulsar standalone

# Or run in the background with nohup
nohup /opt/pulsar/current/bin/pulsar standalone > /var/log/pulsar-standalone.log 2>&1 &

# Check if Pulsar is running by testing the admin API
curl http://localhost:8080/admin/v2/clusters

# You should see: ["standalone"]
```

### Creating a Systemd Service for Standalone Mode

For development environments, create a systemd service to manage standalone Pulsar.

```bash
# Create systemd service file for Pulsar standalone
sudo tee /etc/systemd/system/pulsar-standalone.service > /dev/null <<EOF
[Unit]
Description=Apache Pulsar Standalone
Documentation=https://pulsar.apache.org/docs
After=network.target

[Service]
Type=simple
User=pulsar
Group=pulsar
Environment="JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64"
ExecStart=/opt/pulsar/current/bin/pulsar standalone
ExecStop=/bin/kill -SIGTERM \$MAINPID
Restart=on-failure
RestartSec=10
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable Pulsar to start on boot
sudo systemctl enable pulsar-standalone

# Start the Pulsar service
sudo systemctl start pulsar-standalone

# Check service status
sudo systemctl status pulsar-standalone
```

## Configuration Files

Pulsar's configuration is managed through several files in the `conf/` directory. Understanding these files is essential for tuning and customizing your deployment.

### Key Configuration Files

```bash
# List all configuration files
ls /opt/pulsar/current/conf/

# Main configuration files:
# broker.conf          - Broker settings (ports, policies, limits)
# bookkeeper.conf      - BookKeeper settings (storage, replication)
# zookeeper.conf       - ZooKeeper settings (for standalone ZK)
# client.conf          - Client connection defaults
# standalone.conf      - Standalone mode specific settings
# functions_worker.yml - Pulsar Functions worker configuration
```

### Important broker.conf Settings

```bash
# View and understand key broker configuration options
cat /opt/pulsar/current/conf/broker.conf | grep -v "^#" | grep -v "^$" | head -50

# Key settings to understand:

# Cluster name - must match across all brokers
# clusterName=standalone

# ZooKeeper connection string
# zookeeperServers=localhost:2181

# Broker ports
# brokerServicePort=6650           # Binary protocol port
# webServicePort=8080              # HTTP admin API port

# Message retention defaults
# defaultRetentionTimeInMinutes=0  # 0 means retain until acknowledged
# defaultRetentionSizeInMB=0       # 0 means no size limit

# Backlog quota - prevents unbounded growth
# backlogQuotaDefaultLimitGB=10
# backlogQuotaDefaultRetentionPolicy=producer_request_hold
```

### Modifying Configuration

```bash
# Create a backup before modifying
sudo cp /opt/pulsar/current/conf/broker.conf /opt/pulsar/current/conf/broker.conf.bak

# Edit broker configuration (example: change cluster name)
sudo nano /opt/pulsar/current/conf/broker.conf

# Example modifications for a custom cluster:
# Change clusterName from 'standalone' to your cluster name
# Adjust memory limits based on available RAM
# Configure TLS for secure connections

# After changes, restart Pulsar
sudo systemctl restart pulsar-standalone
```

### BookKeeper Configuration

```bash
# Key BookKeeper settings in bookkeeper.conf

# Journal directory - should be on fast SSD storage
# journalDirectory=/var/lib/pulsar/data/bookkeeper/journal

# Ledger directories - where actual message data is stored
# ledgerDirectories=/var/lib/pulsar/data/bookkeeper/ledgers

# Number of write/read threads
# numAddWorkerThreads=1
# numReadWorkerThreads=8

# Journal and ledger flush intervals
# journalSyncData=true
# journalMaxGroupWaitMSec=1
```

## Creating Tenants, Namespaces, and Topics

Pulsar uses a hierarchical structure: Tenants contain Namespaces, which contain Topics. This enables multi-tenant deployments and fine-grained access control.

### Understanding the Hierarchy

```
Tenant (e.g., "my-company")
  └── Namespace (e.g., "my-company/payments")
        └── Topic (e.g., "persistent://my-company/payments/transactions")
```

### Creating a Tenant

```bash
# List existing tenants
/opt/pulsar/current/bin/pulsar-admin tenants list

# Create a new tenant with admin role and allowed cluster
/opt/pulsar/current/bin/pulsar-admin tenants create my-company \
  --admin-roles admin \
  --allowed-clusters standalone

# Get tenant information
/opt/pulsar/current/bin/pulsar-admin tenants get my-company

# Output shows allowed clusters and admin roles:
# {
#   "adminRoles": ["admin"],
#   "allowedClusters": ["standalone"]
# }
```

### Creating a Namespace

```bash
# Create a namespace within the tenant
/opt/pulsar/current/bin/pulsar-admin namespaces create my-company/payments

# List namespaces in the tenant
/opt/pulsar/current/bin/pulsar-admin namespaces list my-company

# Set retention policy for the namespace (retain messages for 7 days or 10GB)
/opt/pulsar/current/bin/pulsar-admin namespaces set-retention my-company/payments \
  --size 10G \
  --time 7d

# Set message TTL (auto-acknowledge after 1 hour if not consumed)
/opt/pulsar/current/bin/pulsar-admin namespaces set-message-ttl my-company/payments \
  --messageTTL 3600

# Get namespace policies
/opt/pulsar/current/bin/pulsar-admin namespaces policies my-company/payments
```

### Creating Topics

```bash
# Create a partitioned topic (recommended for high throughput)
# Partitions allow parallel consumption and higher throughput
/opt/pulsar/current/bin/pulsar-admin topics create-partitioned-topic \
  persistent://my-company/payments/transactions \
  --partitions 4

# Create a non-partitioned topic (simpler, for lower volume)
/opt/pulsar/current/bin/pulsar-admin topics create \
  persistent://my-company/payments/notifications

# List topics in the namespace
/opt/pulsar/current/bin/pulsar-admin topics list my-company/payments

# Get topic stats (messages in, out, backlog, etc.)
/opt/pulsar/current/bin/pulsar-admin topics stats \
  persistent://my-company/payments/transactions

# Get partitioned topic stats (aggregated across all partitions)
/opt/pulsar/current/bin/pulsar-admin topics partitioned-stats \
  persistent://my-company/payments/transactions
```

### Topic Naming Convention

Topics follow the format: `{persistent|non-persistent}://tenant/namespace/topic`

- **persistent:** Messages are stored on disk (default, recommended)
- **non-persistent:** Messages are only kept in memory (faster, but no durability)

```bash
# Examples of valid topic names:
# persistent://my-company/payments/transactions     - durable topic
# non-persistent://my-company/logs/debug           - in-memory only
# persistent://public/default/my-topic             - using default public tenant
```

## Producer and Consumer Examples

Let us create some working examples to demonstrate message publishing and consumption.

### Command-Line Producer and Consumer

```bash
# Terminal 1: Start a consumer that subscribes to the topic
# This will wait for messages and print them as they arrive
/opt/pulsar/current/bin/pulsar-client consume \
  persistent://my-company/payments/transactions \
  --subscription-name test-subscription \
  --num-messages 0  # 0 means consume indefinitely

# Terminal 2: Send messages to the topic
/opt/pulsar/current/bin/pulsar-client produce \
  persistent://my-company/payments/transactions \
  --messages "Hello Pulsar!" \
  --num-produce 10  # Send 10 copies of the message

# You should see the messages appear in Terminal 1
```

### Java Producer Example

Create a Java producer to send messages programmatically.

```java
// File: PulsarProducerExample.java
// Demonstrates basic message production with Apache Pulsar

import org.apache.pulsar.client.api.*;
import java.util.concurrent.TimeUnit;

public class PulsarProducerExample {

    // Pulsar broker URL - change for your environment
    private static final String SERVICE_URL = "pulsar://localhost:6650";

    // Topic to publish to - must exist or auto-creation must be enabled
    private static final String TOPIC = "persistent://my-company/payments/transactions";

    public static void main(String[] args) throws Exception {

        // Create a Pulsar client connected to the broker
        // The client manages connections and provides thread-safe access
        PulsarClient client = PulsarClient.builder()
            .serviceUrl(SERVICE_URL)
            .operationTimeout(30, TimeUnit.SECONDS)  // Timeout for operations
            .connectionTimeout(10, TimeUnit.SECONDS) // Timeout for initial connection
            .build();

        // Create a producer for the specified topic
        // Producers are thread-safe and should be reused
        Producer<String> producer = client.newProducer(Schema.STRING)
            .topic(TOPIC)
            .producerName("payment-producer-1")      // Unique name for this producer
            .sendTimeout(10, TimeUnit.SECONDS)       // Timeout per message
            .blockIfQueueFull(true)                  // Block instead of failing when queue is full
            .maxPendingMessages(1000)                // Max messages waiting to be sent
            .batchingMaxPublishDelay(10, TimeUnit.MILLISECONDS) // Batch messages for efficiency
            .create();

        try {
            // Send 100 messages
            for (int i = 0; i < 100; i++) {
                // Create a message with a key and payload
                String message = String.format("{\"transactionId\": %d, \"amount\": %.2f}",
                    i, Math.random() * 1000);

                // Send synchronously and get message ID
                MessageId messageId = producer.newMessage()
                    .key("transaction-" + i)  // Key for routing in partitioned topics
                    .value(message)           // The actual message payload
                    .property("source", "payment-service")  // Custom metadata
                    .property("priority", "high")
                    .send();

                System.out.printf("Sent message %d with ID: %s%n", i, messageId);
            }

            // Flush any pending messages in the batch
            producer.flush();
            System.out.println("All messages sent successfully!");

        } finally {
            // Always close resources to release connections
            producer.close();
            client.close();
        }
    }
}
```

### Java Consumer Example

Create a Java consumer to receive and process messages.

```java
// File: PulsarConsumerExample.java
// Demonstrates message consumption with different subscription types

import org.apache.pulsar.client.api.*;
import java.util.concurrent.TimeUnit;

public class PulsarConsumerExample {

    private static final String SERVICE_URL = "pulsar://localhost:6650";
    private static final String TOPIC = "persistent://my-company/payments/transactions";

    public static void main(String[] args) throws Exception {

        // Create Pulsar client
        PulsarClient client = PulsarClient.builder()
            .serviceUrl(SERVICE_URL)
            .build();

        // Create a consumer with Exclusive subscription
        // Exclusive: Only one consumer can be active at a time
        // Failover: Multiple consumers, but only one active; others are standby
        // Shared: Messages distributed round-robin to all consumers
        // Key_Shared: Messages with same key go to same consumer
        Consumer<String> consumer = client.newConsumer(Schema.STRING)
            .topic(TOPIC)
            .subscriptionName("payment-processor")      // Subscription identifier
            .subscriptionType(SubscriptionType.Shared)  // Allow multiple parallel consumers
            .subscriptionInitialPosition(SubscriptionInitialPosition.Earliest) // Start from beginning
            .consumerName("processor-instance-1")       // Unique consumer name
            .receiverQueueSize(1000)                    // Prefetch buffer size
            .ackTimeout(30, TimeUnit.SECONDS)           // Auto-redeliver if not acked
            .negativeAckRedeliveryDelay(1, TimeUnit.SECONDS) // Delay for negative acks
            .deadLetterPolicy(DeadLetterPolicy.builder()
                .maxRedeliverCount(3)                   // Move to DLQ after 3 failures
                .deadLetterTopic("persistent://my-company/payments/transactions-dlq")
                .build())
            .subscribe();

        try {
            System.out.println("Consumer started. Waiting for messages...");

            // Continuously receive and process messages
            while (true) {
                // Receive with timeout - returns null if no message available
                Message<String> message = consumer.receive(5, TimeUnit.SECONDS);

                if (message != null) {
                    try {
                        // Process the message
                        String payload = message.getValue();
                        String key = message.getKey();
                        String messageId = message.getMessageId().toString();

                        System.out.printf("Received: ID=%s, Key=%s, Payload=%s%n",
                            messageId, key, payload);

                        // Access custom properties
                        String source = message.getProperty("source");
                        System.out.printf("  Source: %s, PublishTime: %d%n",
                            source, message.getPublishTime());

                        // Simulate processing
                        processTransaction(payload);

                        // Acknowledge successful processing
                        // Message won't be redelivered after acknowledgment
                        consumer.acknowledge(message);

                    } catch (Exception e) {
                        // Processing failed - negative acknowledge for redelivery
                        System.err.println("Processing failed: " + e.getMessage());
                        consumer.negativeAcknowledge(message);
                    }
                }
            }

        } finally {
            consumer.close();
            client.close();
        }
    }

    // Simulated business logic
    private static void processTransaction(String payload) throws Exception {
        // Your actual processing logic here
        Thread.sleep(100); // Simulate work
    }
}
```

### Python Producer and Consumer

Install the Pulsar Python client and create examples.

```bash
# Install Pulsar Python client
pip install pulsar-client
```

```python
# File: pulsar_producer.py
# Python producer example for Apache Pulsar

import pulsar
import json
import time

# Create a Pulsar client
# The client manages connections and should be reused
client = pulsar.Client(
    service_url='pulsar://localhost:6650',
    operation_timeout_seconds=30,
    connection_timeout_seconds=10
)

# Create a producer for the transactions topic
producer = client.create_producer(
    topic='persistent://my-company/payments/transactions',
    producer_name='python-producer-1',
    send_timeout_millis=10000,
    batching_enabled=True,
    batching_max_publish_delay_ms=10
)

try:
    # Send 100 messages
    for i in range(100):
        # Create message payload as JSON
        transaction = {
            'transaction_id': i,
            'amount': round(100 * (i % 10 + 1) + 0.99, 2),
            'currency': 'USD',
            'timestamp': int(time.time() * 1000)
        }

        # Send the message with properties
        message_id = producer.send(
            content=json.dumps(transaction).encode('utf-8'),
            properties={
                'source': 'python-producer',
                'version': '1.0'
            },
            partition_key=f'transaction-{i}'  # For consistent routing
        )

        print(f'Sent message {i}: {message_id}')

    # Ensure all batched messages are sent
    producer.flush()
    print('All messages sent successfully!')

finally:
    # Clean up resources
    producer.close()
    client.close()
```

```python
# File: pulsar_consumer.py
# Python consumer example for Apache Pulsar

import pulsar
import json

# Create a Pulsar client
client = pulsar.Client('pulsar://localhost:6650')

# Create a consumer with shared subscription
# Shared subscriptions allow multiple consumers to process messages in parallel
consumer = client.subscribe(
    topic='persistent://my-company/payments/transactions',
    subscription_name='python-payment-processor',
    consumer_type=pulsar.ConsumerType.Shared,  # Shared for parallel processing
    initial_position=pulsar.InitialPosition.Earliest,  # Start from beginning
    consumer_name='python-consumer-1',
    negative_ack_redelivery_delay_ms=1000,  # Redeliver after 1 second on nack
    dead_letter_policy=pulsar.ConsumerDeadLetterPolicy(
        max_redeliver_count=3,
        dead_letter_topic='persistent://my-company/payments/transactions-dlq'
    )
)

try:
    print('Consumer started. Press Ctrl+C to stop.')

    while True:
        # Receive message with 5 second timeout
        try:
            msg = consumer.receive(timeout_millis=5000)

            try:
                # Parse the message payload
                payload = json.loads(msg.data().decode('utf-8'))

                print(f'Received: ID={msg.message_id()}, '
                      f'Transaction={payload.get("transaction_id")}, '
                      f'Amount=${payload.get("amount")}')

                # Access message properties
                props = msg.properties()
                print(f'  Properties: {props}')

                # Process the message (your business logic here)
                process_transaction(payload)

                # Acknowledge successful processing
                consumer.acknowledge(msg)

            except Exception as e:
                print(f'Processing error: {e}')
                # Negative acknowledge - message will be redelivered
                consumer.negative_acknowledge(msg)

        except pulsar.Timeout:
            # No message received within timeout - continue waiting
            continue

except KeyboardInterrupt:
    print('\nStopping consumer...')

finally:
    consumer.close()
    client.close()


def process_transaction(payload):
    """Process a transaction - replace with your business logic."""
    transaction_id = payload.get('transaction_id')
    amount = payload.get('amount')
    # Simulate processing
    print(f'  Processing transaction {transaction_id} for ${amount}')
```

## Pulsar Functions

Pulsar Functions is a lightweight serverless computing framework that runs inside Pulsar. It allows you to process messages without managing separate infrastructure.

### Understanding Pulsar Functions

Functions consume messages from input topics, apply transformations, and optionally produce results to output topics. They are ideal for:

- Data transformation and enrichment
- Event filtering and routing
- Real-time aggregation
- Alert generation

### Creating a Simple Function

```python
# File: TransactionFilter.py
# Pulsar Function that filters high-value transactions

from pulsar import Function
import json

class TransactionFilter(Function):
    """
    Pulsar Function that filters transactions above a threshold.
    High-value transactions are forwarded to an output topic for
    additional fraud checking.
    """

    def __init__(self):
        # Threshold for high-value transactions
        self.threshold = 1000.0

    def process(self, input_message, context):
        """
        Process each incoming message.

        Args:
            input_message: The message payload (bytes or string)
            context: Pulsar Function context with utilities

        Returns:
            Output value (forwarded to output topic) or None
        """
        # Get the logger from context
        logger = context.get_logger()

        try:
            # Parse the transaction JSON
            transaction = json.loads(input_message)
            amount = transaction.get('amount', 0)
            transaction_id = transaction.get('transaction_id')

            logger.info(f'Processing transaction {transaction_id}: ${amount}')

            # Filter: only forward high-value transactions
            if amount > self.threshold:
                logger.warn(f'High-value transaction detected: {transaction_id}')

                # Add metadata
                transaction['flagged'] = True
                transaction['flag_reason'] = 'high_value'

                # Return value is sent to output topic
                return json.dumps(transaction)

            # Return None to skip forwarding (message is acknowledged)
            return None

        except json.JSONDecodeError as e:
            logger.error(f'Failed to parse message: {e}')
            # Raise exception to trigger negative ack and redelivery
            raise
```

### Deploying Pulsar Functions

```bash
# Deploy a Python function to Pulsar
/opt/pulsar/current/bin/pulsar-admin functions create \
  --tenant my-company \
  --namespace payments \
  --name transaction-filter \
  --py /path/to/TransactionFilter.py \
  --classname TransactionFilter.TransactionFilter \
  --inputs persistent://my-company/payments/transactions \
  --output persistent://my-company/payments/high-value-transactions \
  --log-topic persistent://my-company/payments/function-logs

# Check function status
/opt/pulsar/current/bin/pulsar-admin functions status \
  --tenant my-company \
  --namespace payments \
  --name transaction-filter

# View function logs
/opt/pulsar/current/bin/pulsar-admin functions logs \
  --tenant my-company \
  --namespace payments \
  --name transaction-filter

# Get function stats (messages processed, failures, latency)
/opt/pulsar/current/bin/pulsar-admin functions stats \
  --tenant my-company \
  --namespace payments \
  --name transaction-filter

# Update function (e.g., change parallelism)
/opt/pulsar/current/bin/pulsar-admin functions update \
  --tenant my-company \
  --namespace payments \
  --name transaction-filter \
  --parallelism 3  # Run 3 instances in parallel

# Delete function when no longer needed
/opt/pulsar/current/bin/pulsar-admin functions delete \
  --tenant my-company \
  --namespace payments \
  --name transaction-filter
```

### Java Function Example

```java
// File: TransactionEnricher.java
// Pulsar Function that enriches transactions with additional data

import org.apache.pulsar.functions.api.Context;
import org.apache.pulsar.functions.api.Function;
import com.google.gson.Gson;
import com.google.gson.JsonObject;

public class TransactionEnricher implements Function<String, String> {

    private static final Gson gson = new Gson();

    @Override
    public String process(String input, Context context) throws Exception {
        // Get logger from context
        context.getLogger().info("Processing message: " + input);

        try {
            // Parse input JSON
            JsonObject transaction = gson.fromJson(input, JsonObject.class);

            // Enrich with metadata
            transaction.addProperty("processed_at", System.currentTimeMillis());
            transaction.addProperty("processor_instance", context.getInstanceId());

            // Use state store for counting (requires stateful function)
            // context.incrCounter("transactions_processed", 1);

            // Access user config
            String region = context.getUserConfigValue("region")
                .orElse("us-east-1");
            transaction.addProperty("region", region);

            // Record metric
            context.recordMetric("transaction_amount",
                transaction.get("amount").getAsDouble());

            return gson.toJson(transaction);

        } catch (Exception e) {
            context.getLogger().error("Failed to process: " + e.getMessage());
            throw e;  // Triggers negative ack
        }
    }
}
```

## Pulsar SQL

Pulsar SQL allows you to query historical message data using SQL syntax, powered by Presto/Trino. This is useful for analytics and debugging.

### Setting Up Pulsar SQL

```bash
# Start the Pulsar SQL worker (Presto)
/opt/pulsar/current/bin/pulsar sql-worker run

# Or start in the background
nohup /opt/pulsar/current/bin/pulsar sql-worker run > /var/log/pulsar-sql.log 2>&1 &
```

### Querying Topics with SQL

```bash
# Connect to the Pulsar SQL CLI
/opt/pulsar/current/bin/pulsar sql

# Once connected, you can run SQL queries
# Show available catalogs
presto> SHOW CATALOGS;

# Show schemas in the Pulsar catalog
presto> SHOW SCHEMAS FROM pulsar;

# Show tables (topics) in a namespace
presto> SHOW TABLES FROM pulsar."my-company/payments";

# Query messages from a topic
presto> SELECT * FROM pulsar."my-company/payments".transactions LIMIT 10;

# Query with filters and aggregations
presto> SELECT
    __key__ as message_key,
    __publish_time__ as published_at,
    JSON_EXTRACT_SCALAR(__value__, '$.amount') as amount,
    JSON_EXTRACT_SCALAR(__value__, '$.transaction_id') as txn_id
FROM pulsar."my-company/payments".transactions
WHERE __publish_time__ > TIMESTAMP '2026-01-01 00:00:00'
ORDER BY __publish_time__ DESC
LIMIT 100;

# Aggregate query - total amount per hour
presto> SELECT
    DATE_TRUNC('hour', __publish_time__) as hour,
    COUNT(*) as transaction_count,
    SUM(CAST(JSON_EXTRACT_SCALAR(__value__, '$.amount') AS DOUBLE)) as total_amount
FROM pulsar."my-company/payments".transactions
WHERE __publish_time__ > CURRENT_DATE - INTERVAL '7' DAY
GROUP BY DATE_TRUNC('hour', __publish_time__)
ORDER BY hour DESC;
```

### Pulsar SQL Configuration

```yaml
# File: /opt/pulsar/current/conf/presto/catalog/pulsar.properties
# Configuration for Pulsar SQL connector

connector.name=pulsar
# Pulsar web service URL
pulsar.web-service-url=http://localhost:8080
# ZooKeeper connection (for metadata)
pulsar.zookeeper-uri=localhost:2181
# Max entries to read per split
pulsar.max-entry-read-batch-size=100
# Target number of splits (parallelism)
pulsar.target-num-splits=4
# Cache size for schema lookups
pulsar.managed-ledger-cache-size-MB=100
```

## Monitoring with Prometheus and Grafana

Pulsar exposes comprehensive metrics that can be scraped by Prometheus and visualized in Grafana.

### Enabling Prometheus Metrics

Pulsar exposes metrics on port 8080 by default. Verify metrics are available:

```bash
# Check if metrics endpoint is accessible
curl -s http://localhost:8080/metrics | head -50

# You should see Prometheus-formatted metrics like:
# pulsar_broker_topics_count 15
# pulsar_broker_subscriptions_count 23
# pulsar_broker_producers_count 5
```

### Prometheus Configuration

```yaml
# File: /etc/prometheus/prometheus.yml
# Prometheus configuration for scraping Pulsar metrics

global:
  scrape_interval: 15s        # How often to scrape metrics
  evaluation_interval: 15s    # How often to evaluate rules

scrape_configs:
  # Scrape Pulsar broker metrics
  - job_name: 'pulsar-broker'
    static_configs:
      - targets: ['localhost:8080']  # Broker web service port
    metrics_path: /metrics

  # Scrape BookKeeper metrics
  - job_name: 'pulsar-bookie'
    static_configs:
      - targets: ['localhost:8000']  # Bookie HTTP port
    metrics_path: /metrics

  # Scrape ZooKeeper metrics (if using JMX exporter)
  - job_name: 'pulsar-zookeeper'
    static_configs:
      - targets: ['localhost:8001']

  # Scrape Pulsar Functions worker metrics
  - job_name: 'pulsar-functions'
    static_configs:
      - targets: ['localhost:6750']  # Functions worker port
    metrics_path: /metrics
```

### Installing Prometheus and Grafana

```bash
# Install Prometheus
sudo apt update
sudo apt install -y prometheus

# Edit Prometheus config to add Pulsar targets
sudo nano /etc/prometheus/prometheus.yml

# Restart Prometheus to apply changes
sudo systemctl restart prometheus

# Install Grafana
sudo apt install -y apt-transport-https software-properties-common
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | sudo tee /etc/apt/sources.list.d/grafana.list
sudo apt update
sudo apt install -y grafana

# Start and enable Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server

# Access Grafana at http://localhost:3000 (default: admin/admin)
```

### Key Metrics to Monitor

```yaml
# Important Pulsar metrics to track

# Broker Metrics
pulsar_broker_topics_count                    # Number of topics
pulsar_broker_subscriptions_count             # Number of subscriptions
pulsar_broker_producers_count                 # Number of connected producers
pulsar_broker_consumers_count                 # Number of connected consumers
pulsar_broker_rate_in                         # Messages per second in
pulsar_broker_rate_out                        # Messages per second out
pulsar_broker_throughput_in                   # Bytes per second in
pulsar_broker_throughput_out                  # Bytes per second out

# Topic Metrics
pulsar_topic_msg_backlog                      # Messages waiting to be consumed
pulsar_topic_storage_size                     # Size of stored messages
pulsar_subscription_back_log                  # Per-subscription backlog
pulsar_subscription_msg_rate_out              # Consumption rate

# BookKeeper Metrics
bookie_write_latency_count                    # Write operations
bookie_read_latency_count                     # Read operations
bookie_ledgers_count                          # Number of ledgers
bookie_entries_count                          # Number of entries

# Function Metrics
pulsar_function_received_total                # Messages received by function
pulsar_function_processed_successfully_total  # Successfully processed
pulsar_function_system_exceptions_total       # System errors
pulsar_function_user_exceptions_total         # User code errors
```

### Grafana Dashboard

Import the official Pulsar Grafana dashboard or create custom panels:

```bash
# Download official Pulsar Grafana dashboards
wget https://raw.githubusercontent.com/apache/pulsar/master/grafana/pulsar-dashboard.json

# Import in Grafana:
# 1. Go to Dashboards > Import
# 2. Upload the JSON file or paste dashboard ID
# 3. Select your Prometheus data source
# 4. Click Import
```

## Production Deployment

For production, you need to run Pulsar components separately with proper configuration, redundancy, and security.

### Production Architecture

A production Pulsar cluster typically includes:

- 3+ ZooKeeper nodes (odd number for quorum)
- 3+ BookKeeper nodes (for data durability)
- 2+ Broker nodes (for high availability)
- Load balancer in front of brokers

### ZooKeeper Cluster Setup

```bash
# On each ZooKeeper node, configure zookeeper.conf
sudo tee /opt/pulsar/current/conf/zookeeper.conf > /dev/null <<EOF
# Basic ZooKeeper settings
tickTime=2000
initLimit=10
syncLimit=5
dataDir=/var/lib/pulsar/zookeeper/data
clientPort=2181

# Cluster configuration (replace with actual IPs)
server.1=zk1.example.com:2888:3888
server.2=zk2.example.com:2888:3888
server.3=zk3.example.com:2888:3888

# Performance tuning
maxClientCnxns=60
autopurge.snapRetainCount=3
autopurge.purgeInterval=1
EOF

# Create myid file (different on each node)
# Node 1:
echo "1" | sudo tee /var/lib/pulsar/zookeeper/data/myid
# Node 2:
echo "2" | sudo tee /var/lib/pulsar/zookeeper/data/myid
# Node 3:
echo "3" | sudo tee /var/lib/pulsar/zookeeper/data/myid

# Start ZooKeeper
/opt/pulsar/current/bin/pulsar-daemon start zookeeper
```

### BookKeeper Cluster Setup

```bash
# On each bookie node, configure bookkeeper.conf
sudo tee /opt/pulsar/current/conf/bookkeeper.conf > /dev/null <<EOF
# BookKeeper server settings
bookiePort=3181

# ZooKeeper connection
zkServers=zk1.example.com:2181,zk2.example.com:2181,zk3.example.com:2181

# Storage directories - use separate disks for best performance
journalDirectory=/mnt/journal/bookkeeper/journal
ledgerDirectories=/mnt/ledger/bookkeeper/ledgers

# Replication settings
ensemblePlacementPolicy=RackawareEnsemblePlacementPolicy
minNumRacksPerWriteQuorum=2
enforceMinNumRacksPerWriteQuorum=true

# Performance tuning
numAddWorkerThreads=4
numReadWorkerThreads=8
numHighPriorityWorkerThreads=8

# Journal settings
journalSyncData=true
journalMaxGroupWaitMSec=1
journalBufferedWritesThreshold=524288

# Garbage collection
gcWaitTime=900000
isForceGCAllowWhenNoSpace=true
minorCompactionInterval=360
majorCompactionInterval=1800
EOF

# Initialize bookie metadata (only once per cluster)
/opt/pulsar/current/bin/bookkeeper shell metaformat

# Start BookKeeper
/opt/pulsar/current/bin/pulsar-daemon start bookie

# Verify bookie is registered
/opt/pulsar/current/bin/bookkeeper shell listbookies -rw
```

### Broker Cluster Setup

```bash
# On each broker node, configure broker.conf
sudo tee /opt/pulsar/current/conf/broker.conf > /dev/null <<EOF
# Cluster identification
clusterName=production

# ZooKeeper configuration
zookeeperServers=zk1.example.com:2181,zk2.example.com:2181,zk3.example.com:2181
configurationStoreServers=zk1.example.com:2181,zk2.example.com:2181,zk3.example.com:2181

# Broker settings
brokerServicePort=6650
webServicePort=8080

# TLS settings (highly recommended for production)
tlsEnabled=true
tlsCertificateFilePath=/etc/pulsar/certs/broker.cert.pem
tlsKeyFilePath=/etc/pulsar/certs/broker.key-pk8.pem
tlsTrustCertsFilePath=/etc/pulsar/certs/ca.cert.pem
brokerServicePortTls=6651
webServicePortTls=8443

# Authentication
authenticationEnabled=true
authenticationProviders=org.apache.pulsar.broker.authentication.AuthenticationProviderToken
tokenSecretKey=file:///etc/pulsar/certs/token-secret-key

# Authorization
authorizationEnabled=true
superUserRoles=admin,pulsar-admin

# Load balancing
loadBalancerEnabled=true
loadBalancerAutoBundleSplitEnabled=true
loadBalancerAutoUnloadSplitBundlesEnabled=true

# Message limits
maxMessageSize=5242880
maxUnackedMessagesPerConsumer=50000
maxUnackedMessagesPerSubscription=200000

# Retention defaults
defaultRetentionTimeInMinutes=10080
defaultRetentionSizeInMB=10240

# Backlog quota
backlogQuotaDefaultLimitGB=50
backlogQuotaDefaultRetentionPolicy=producer_request_hold
EOF

# Initialize cluster metadata (only once per cluster)
/opt/pulsar/current/bin/pulsar initialize-cluster-metadata \
  --cluster production \
  --zookeeper zk1.example.com:2181 \
  --configuration-store zk1.example.com:2181 \
  --web-service-url http://broker1.example.com:8080 \
  --broker-service-url pulsar://broker1.example.com:6650

# Start broker
/opt/pulsar/current/bin/pulsar-daemon start broker

# Verify broker is running
curl http://localhost:8080/admin/v2/brokers/health
```

### Production Systemd Services

```bash
# ZooKeeper service
sudo tee /etc/systemd/system/pulsar-zookeeper.service > /dev/null <<EOF
[Unit]
Description=Apache Pulsar ZooKeeper
After=network.target

[Service]
Type=forking
User=pulsar
Group=pulsar
Environment="JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64"
Environment="PULSAR_MEM=-Xms2g -Xmx2g"
ExecStart=/opt/pulsar/current/bin/pulsar-daemon start zookeeper
ExecStop=/opt/pulsar/current/bin/pulsar-daemon stop zookeeper
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# BookKeeper service
sudo tee /etc/systemd/system/pulsar-bookie.service > /dev/null <<EOF
[Unit]
Description=Apache Pulsar BookKeeper
After=network.target pulsar-zookeeper.service

[Service]
Type=forking
User=pulsar
Group=pulsar
Environment="JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64"
Environment="PULSAR_MEM=-Xms4g -Xmx4g -XX:MaxDirectMemorySize=4g"
ExecStart=/opt/pulsar/current/bin/pulsar-daemon start bookie
ExecStop=/opt/pulsar/current/bin/pulsar-daemon stop bookie
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# Broker service
sudo tee /etc/systemd/system/pulsar-broker.service > /dev/null <<EOF
[Unit]
Description=Apache Pulsar Broker
After=network.target pulsar-bookie.service

[Service]
Type=forking
User=pulsar
Group=pulsar
Environment="JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64"
Environment="PULSAR_MEM=-Xms4g -Xmx4g -XX:MaxDirectMemorySize=4g"
ExecStart=/opt/pulsar/current/bin/pulsar-daemon start broker
ExecStop=/opt/pulsar/current/bin/pulsar-daemon stop broker
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# Reload and enable services
sudo systemctl daemon-reload
sudo systemctl enable pulsar-zookeeper pulsar-bookie pulsar-broker
```

### Security Hardening

```bash
# Generate TLS certificates (production should use proper CA)
# Create private key
openssl genrsa -out broker.key.pem 2048

# Create certificate signing request
openssl req -new -key broker.key.pem -out broker.csr \
  -subj "/CN=broker.example.com"

# Sign the certificate (use your CA in production)
openssl x509 -req -in broker.csr -signkey broker.key.pem \
  -out broker.cert.pem -days 365

# Convert key to PKCS8 format (required by Pulsar)
openssl pkcs8 -topk8 -inform PEM -outform PEM \
  -in broker.key.pem -out broker.key-pk8.pem -nocrypt

# Set proper permissions
chmod 600 broker.key.pem broker.key-pk8.pem

# Generate JWT secret key for token authentication
/opt/pulsar/current/bin/pulsar tokens create-secret-key \
  --output /etc/pulsar/certs/token-secret-key

# Generate admin token
/opt/pulsar/current/bin/pulsar tokens create \
  --secret-key file:///etc/pulsar/certs/token-secret-key \
  --subject admin
```

## Troubleshooting

Common issues and their solutions when running Apache Pulsar.

### Checking Logs

```bash
# View broker logs
tail -f /opt/pulsar/current/logs/pulsar-broker-*.log

# View BookKeeper logs
tail -f /opt/pulsar/current/logs/pulsar-bookie-*.log

# View ZooKeeper logs
tail -f /opt/pulsar/current/logs/pulsar-zookeeper-*.log

# Check for errors
grep -i error /opt/pulsar/current/logs/*.log | tail -50
```

### Common Issues

```bash
# Issue: Broker fails to start - "Metadata store initialization failed"
# Solution: Check ZooKeeper connectivity
/opt/pulsar/current/bin/pulsar zookeeper-shell -server localhost:2181 ls /

# Issue: High message backlog
# Check backlog for all subscriptions
/opt/pulsar/current/bin/pulsar-admin topics stats persistent://my-company/payments/transactions

# Skip messages if needed (use with caution)
/opt/pulsar/current/bin/pulsar-admin topics skip \
  --subscription payment-processor \
  --count 1000 \
  persistent://my-company/payments/transactions

# Issue: Bookie not writable
# Check bookie status
/opt/pulsar/current/bin/bookkeeper shell listbookies -rw
/opt/pulsar/current/bin/bookkeeper shell listbookies -ro

# Check disk space
df -h /mnt/journal /mnt/ledger

# Issue: Out of memory
# Increase heap size in conf/pulsar_env.sh
PULSAR_MEM="-Xms8g -Xmx8g -XX:MaxDirectMemorySize=8g"
```

### Health Checks

```bash
# Check broker health
curl -s http://localhost:8080/admin/v2/brokers/health

# Check cluster status
/opt/pulsar/current/bin/pulsar-admin brokers list production

# Check namespace health
/opt/pulsar/current/bin/pulsar-admin namespaces get-bundle-state my-company/payments

# Check topic ownership (which broker owns the topic)
/opt/pulsar/current/bin/pulsar-admin topics lookup \
  persistent://my-company/payments/transactions
```

---

Apache Pulsar provides a robust, scalable messaging platform suitable for everything from development experiments to large-scale production deployments. Its unique architecture separating compute from storage, combined with features like multi-tenancy, geo-replication, and tiered storage, makes it an excellent choice for modern distributed systems.

Start with standalone mode to learn the concepts, then gradually move to a full cluster deployment as your needs grow. Remember to properly configure monitoring, set up alerting for key metrics, and implement proper security measures before going to production.

For comprehensive monitoring of your Apache Pulsar deployment, consider using [OneUptime](https://oneuptime.com). OneUptime provides end-to-end observability with metrics collection, log aggregation, distributed tracing, and intelligent alerting. You can monitor your Pulsar brokers, bookies, and ZooKeeper nodes, track message throughput and latency, and get alerted when backlogs grow or components become unhealthy. With OneUptime's unified dashboard, you can correlate Pulsar metrics with your application performance data, making it easier to identify and resolve issues before they impact your users.
