# How to Connect Apache Kafka Applications to Azure Event Hubs Using the Kafka Protocol

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Azure Event Hubs, Kafka Protocol, Event Streaming, Migration, Azure Cloud, Message Broker

Description: Learn how to connect existing Apache Kafka producers and consumers to Azure Event Hubs without changing your application code.

---

If you have existing applications built on Apache Kafka and want to move to a managed service, you do not necessarily need to rewrite everything. Azure Event Hubs exposes a Kafka-compatible endpoint that speaks the Kafka wire protocol. Your existing Kafka producers and consumers can connect to Event Hubs by simply changing the bootstrap server configuration and authentication settings. No code changes to your business logic, no new SDKs, no migration of your application layer.

In this post, we will configure existing Kafka applications to work with Azure Event Hubs, covering the connection settings, authentication, and the few differences you need to be aware of.

## How Kafka Compatibility Works

Azure Event Hubs implements the Apache Kafka producer and consumer protocol (versions 1.0 and above). When your Kafka client connects to an Event Hubs namespace, it speaks the standard Kafka protocol over a TLS-encrypted connection. Event Hubs translates Kafka concepts to its own internal model:

- **Kafka topic** maps to an **Event Hub**
- **Kafka partition** maps to an **Event Hub partition**
- **Kafka consumer group** maps to an **Event Hubs consumer group**
- **Kafka offset** maps to an **Event Hubs offset**

The Kafka endpoint is available on Standard, Premium, and Dedicated tiers (not Basic).

## Prerequisites

Before connecting your Kafka application:

1. An Azure Event Hubs namespace (Standard tier or higher)
2. An Event Hub (topic) created in the namespace
3. A Shared Access Policy with Send and/or Listen claims, or Azure AD credentials
4. Your Kafka client library must support Kafka protocol 1.0 or later

## Connection Configuration

The key configuration change is pointing your Kafka client at the Event Hubs endpoint instead of your Kafka cluster.

### Kafka Bootstrap Server

Your Event Hubs Kafka endpoint follows this format:

```
<namespace-name>.servicebus.windows.net:9093
```

Note the port is **9093** (TLS), not the standard Kafka port 9092.

### Authentication with SASL

Event Hubs uses SASL/PLAIN authentication over TLS. Here is how to configure it:

For a Kafka producer in Java:

```java
import org.apache.kafka.clients.producer.*;
import java.util.Properties;

Properties props = new Properties();

// Bootstrap server - your Event Hubs namespace endpoint
props.put("bootstrap.servers", "my-eventhubs-namespace.servicebus.windows.net:9093");

// Security configuration - SASL over TLS
props.put("security.protocol", "SASL_SSL");
props.put("sasl.mechanism", "PLAIN");

// SASL credentials using Event Hubs connection string
// The username is always "$ConnectionString"
// The password is your Event Hubs connection string
props.put("sasl.jaas.config",
    "org.apache.kafka.common.security.plain.PlainLoginModule required " +
    "username=\"$ConnectionString\" " +
    "password=\"Endpoint=sb://my-eventhubs-namespace.servicebus.windows.net/;" +
    "SharedAccessKeyName=send-policy;SharedAccessKey=your-key\";");

// Standard Kafka producer settings
props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");
props.put("acks", "all");

// Create and use the producer exactly as you would with a regular Kafka cluster
KafkaProducer<String, String> producer = new KafkaProducer<>(props);

ProducerRecord<String, String> record = new ProducerRecord<>(
    "user-events",              // topic (Event Hub name)
    "user-123",                 // key (used for partition assignment)
    "{\"action\": \"login\"}"   // value (event body)
);

producer.send(record, (metadata, exception) -> {
    if (exception != null) {
        System.err.println("Send failed: " + exception.getMessage());
    } else {
        System.out.printf("Sent to partition %d, offset %d%n",
            metadata.partition(), metadata.offset());
    }
});

producer.close();
```

### Python Configuration (confluent-kafka)

```python
from confluent_kafka import Producer, Consumer

# Shared configuration for both producer and consumer
common_config = {
    'bootstrap.servers': 'my-eventhubs-namespace.servicebus.windows.net:9093',
    'security.protocol': 'SASL_SSL',
    'sasl.mechanisms': 'PLAIN',
    'sasl.username': '$ConnectionString',
    'sasl.password': 'Endpoint=sb://my-eventhubs-namespace.servicebus.windows.net/;SharedAccessKeyName=send-policy;SharedAccessKey=your-key',
}

# Producer configuration
producer_config = {
    **common_config,
    'client.id': 'my-python-producer',
    'acks': 'all',
}

producer = Producer(producer_config)

# Send an event - same API as connecting to a regular Kafka cluster
def delivery_callback(err, msg):
    if err:
        print(f'Delivery failed: {err}')
    else:
        print(f'Delivered to {msg.topic()} [{msg.partition()}] @ {msg.offset()}')

producer.produce(
    topic='user-events',
    key='user-123',
    value='{"action": "login", "timestamp": 1708099200}',
    callback=delivery_callback
)
producer.flush()
```

### Python Consumer Configuration

```python
from confluent_kafka import Consumer

consumer_config = {
    'bootstrap.servers': 'my-eventhubs-namespace.servicebus.windows.net:9093',
    'security.protocol': 'SASL_SSL',
    'sasl.mechanisms': 'PLAIN',
    'sasl.username': '$ConnectionString',
    'sasl.password': 'Endpoint=sb://my-eventhubs-namespace.servicebus.windows.net/;SharedAccessKeyName=listen-policy;SharedAccessKey=your-key',
    'group.id': 'analytics-pipeline',
    'auto.offset.reset': 'earliest',
    'enable.auto.commit': True,
}

consumer = Consumer(consumer_config)
consumer.subscribe(['user-events'])

# Consume events - identical to consuming from a regular Kafka cluster
try:
    while True:
        msg = consumer.poll(timeout=1.0)
        if msg is None:
            continue
        if msg.error():
            print(f'Consumer error: {msg.error()}')
            continue

        print(f'Received: key={msg.key()}, value={msg.value()}, '
              f'partition={msg.partition()}, offset={msg.offset()}')
except KeyboardInterrupt:
    pass
finally:
    consumer.close()
```

## Node.js Configuration (kafkajs)

```javascript
const { Kafka } = require('kafkajs');

// Create the Kafka client configured for Event Hubs
const kafka = new Kafka({
    clientId: 'my-nodejs-app',
    brokers: ['my-eventhubs-namespace.servicebus.windows.net:9093'],
    ssl: true,
    sasl: {
        mechanism: 'plain',
        username: '$ConnectionString',
        password: 'Endpoint=sb://my-eventhubs-namespace.servicebus.windows.net/;SharedAccessKeyName=send-policy;SharedAccessKey=your-key',
    },
    // Increase connection timeout for cloud endpoints
    connectionTimeout: 10000,
    requestTimeout: 30000,
});

// Producer example
async function produceEvents() {
    const producer = kafka.producer();
    await producer.connect();

    // Send events using the standard KafkaJS API
    await producer.send({
        topic: 'user-events',
        messages: [
            { key: 'user-123', value: JSON.stringify({ action: 'login' }) },
            { key: 'user-456', value: JSON.stringify({ action: 'purchase' }) },
        ],
    });

    await producer.disconnect();
}

// Consumer example
async function consumeEvents() {
    const consumer = kafka.consumer({ groupId: 'analytics-pipeline' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'user-events', fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            console.log({
                partition,
                offset: message.offset,
                key: message.key.toString(),
                value: message.value.toString(),
            });
        },
    });
}
```

## Using Azure AD Authentication (OAuth)

For production environments, Azure AD authentication is more secure than connection strings. It uses the SASL/OAUTHBEARER mechanism:

```python
from confluent_kafka import Producer
from azure.identity import DefaultAzureCredential

# Get an OAuth token using Azure Identity
credential = DefaultAzureCredential()
token = credential.get_token("https://eventhubs.azure.net/.default")

producer_config = {
    'bootstrap.servers': 'my-eventhubs-namespace.servicebus.windows.net:9093',
    'security.protocol': 'SASL_SSL',
    'sasl.mechanisms': 'OAUTHBEARER',
    'sasl.oauthbearer.method': 'oidc',
    'sasl.oauthbearer.client.id': '<your-app-client-id>',
    'sasl.oauthbearer.client.secret': '<your-app-client-secret>',
    'sasl.oauthbearer.token.endpoint.url': 'https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token',
    'sasl.oauthbearer.scope': 'https://eventhubs.azure.net/.default',
}

producer = Producer(producer_config)
```

## Configuration File for Easy Switching

Create a properties file that makes it easy to switch between a local Kafka cluster and Event Hubs:

```properties
# eventhubs-kafka.properties
# Switch between local Kafka and Event Hubs by changing this file

# Event Hubs endpoint
bootstrap.servers=my-eventhubs-namespace.servicebus.windows.net:9093
security.protocol=SASL_SSL
sasl.mechanism=PLAIN
sasl.jaas.config=org.apache.kafka.common.security.plain.PlainLoginModule required username="$ConnectionString" password="Endpoint=sb://my-eventhubs-namespace.servicebus.windows.net/;SharedAccessKeyName=send-policy;SharedAccessKey=your-key";

# For local Kafka, just replace with:
# bootstrap.servers=localhost:9092
# (and remove the security/sasl lines)
```

## Differences and Limitations

While the Kafka protocol compatibility is very good, there are some differences to be aware of:

**Topic management**: You cannot create topics (Event Hubs) through the Kafka Admin API. You must create Event Hubs through the Azure portal, CLI, or ARM templates before producing to them.

**Partition count changes**: In Standard tier, partition count is fixed after creation. Kafka's ability to add partitions dynamically does not apply.

**Compacted topics**: Log compaction is not supported. Event Hubs uses time-based retention only.

**Transactions**: Kafka transactions (exactly-once semantics with `transactional.id`) are not supported.

**Consumer group management**: Consumer groups created through the Kafka protocol are visible in the Azure portal, and vice versa.

**Retention**: Event Hubs retention is configured per Event Hub (1-90 days on Standard tier), not through Kafka topic configuration.

## Migrating from Self-Managed Kafka

If you are migrating from a self-managed Kafka cluster to Event Hubs, here is a practical approach:

1. **Create Event Hubs** matching your existing topics (same names and partition counts)
2. **Update producer configuration** to point to the Event Hubs endpoint
3. **Update consumer configuration** to point to Event Hubs
4. **Test with a staging namespace** before switching production traffic
5. **Monitor lag and throughput** during the transition

For zero-downtime migration, you can run a MirrorMaker instance that replicates events from your Kafka cluster to Event Hubs during the transition:

```bash
# Use Kafka MirrorMaker to replicate from existing Kafka to Event Hubs
# source-kafka.properties points to your existing Kafka cluster
# target-eventhubs.properties points to Event Hubs with SASL config
kafka-mirror-maker \
  --consumer.config source-kafka.properties \
  --producer.config target-eventhubs.properties \
  --whitelist "user-events|order-events"
```

## Performance Tuning

When connecting Kafka clients to Event Hubs, these settings help optimize performance:

```properties
# Producer tuning for Event Hubs
batch.size=65536
linger.ms=10
compression.type=lz4
buffer.memory=67108864
request.timeout.ms=60000
delivery.timeout.ms=120000

# Consumer tuning for Event Hubs
fetch.min.bytes=1024
fetch.max.wait.ms=500
max.poll.records=500
session.timeout.ms=30000
heartbeat.interval.ms=10000
```

Increase timeouts compared to local Kafka because cloud endpoints have higher network latency than local broker connections.

## Summary

Azure Event Hubs' Kafka protocol support lets you connect existing Kafka applications with minimal changes - typically just updating the bootstrap server, enabling SASL/SSL authentication, and adjusting timeouts. Your application code, serialization logic, and consumer group patterns all work the same way. Be aware of the differences in topic management, compaction support, and transaction support, and plan your migration accordingly. For most streaming workloads, the transition from self-managed Kafka to Event Hubs is straightforward and dramatically reduces operational burden.
