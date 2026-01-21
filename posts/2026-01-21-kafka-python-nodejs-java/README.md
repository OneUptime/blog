# How to Connect to Kafka from Python, Node.js, and Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Python, Node.js, Java, Client Libraries, Message Queue, Streaming

Description: A comprehensive guide to connecting to Apache Kafka from Python, Node.js, and Java applications, covering client library selection, configuration, producer and consumer patterns, and best practices for each language.

---

Connecting to Apache Kafka requires choosing the right client library and understanding configuration options for your language. This guide covers the most popular Kafka client libraries for Python, Node.js, and Java, with practical examples for common use cases.

## Python Kafka Clients

### kafka-python Library

The kafka-python library is the most widely used pure Python client for Kafka.

#### Installation

```bash
pip install kafka-python
```

#### Basic Producer

```python
from kafka import KafkaProducer
import json

# Create producer with JSON serialization
producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    key_serializer=lambda k: k.encode('utf-8') if k else None,
    # Reliability settings
    acks='all',
    retries=3,
    retry_backoff_ms=100,
    # Performance settings
    batch_size=16384,
    linger_ms=10,
    compression_type='gzip'
)

# Send message synchronously
future = producer.send(
    'orders',
    key='order-123',
    value={'order_id': 123, 'product': 'Widget', 'quantity': 5}
)

# Wait for confirmation
record_metadata = future.get(timeout=10)
print(f"Sent to {record_metadata.topic} partition {record_metadata.partition} offset {record_metadata.offset}")

# Always close the producer
producer.close()
```

#### Basic Consumer

```python
from kafka import KafkaConsumer
import json

# Create consumer
consumer = KafkaConsumer(
    'orders',
    bootstrap_servers=['localhost:9092'],
    group_id='order-processor',
    auto_offset_reset='earliest',
    enable_auto_commit=True,
    auto_commit_interval_ms=5000,
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    key_deserializer=lambda k: k.decode('utf-8') if k else None,
    # Consumer settings
    max_poll_records=500,
    max_poll_interval_ms=300000,
    session_timeout_ms=30000
)

# Consume messages
try:
    for message in consumer:
        print(f"Received: {message.value}")
        print(f"  Topic: {message.topic}")
        print(f"  Partition: {message.partition}")
        print(f"  Offset: {message.offset}")
        print(f"  Key: {message.key}")
except KeyboardInterrupt:
    pass
finally:
    consumer.close()
```

#### Manual Offset Commit

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'orders',
    bootstrap_servers=['localhost:9092'],
    group_id='order-processor',
    auto_offset_reset='earliest',
    enable_auto_commit=False,  # Disable auto commit
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

try:
    for message in consumer:
        try:
            # Process message
            process_order(message.value)

            # Commit offset after successful processing
            consumer.commit()
            print(f"Processed and committed offset {message.offset}")
        except Exception as e:
            print(f"Error processing message: {e}")
            # Don't commit - message will be reprocessed
except KeyboardInterrupt:
    pass
finally:
    consumer.close()

def process_order(order):
    print(f"Processing order: {order}")
```

### confluent-kafka-python Library

The confluent-kafka library is a high-performance Python client based on librdkafka.

#### Installation

```bash
pip install confluent-kafka
```

#### Producer with Confluent Client

```python
from confluent_kafka import Producer
import json

def delivery_report(err, msg):
    if err is not None:
        print(f"Delivery failed: {err}")
    else:
        print(f"Message delivered to {msg.topic()} [{msg.partition()}] at offset {msg.offset()}")

# Create producer
producer = Producer({
    'bootstrap.servers': 'localhost:9092',
    'acks': 'all',
    'retries': 3,
    'retry.backoff.ms': 100,
    'batch.size': 16384,
    'linger.ms': 10,
    'compression.type': 'gzip'
})

# Send messages
for i in range(10):
    order = {'order_id': i, 'product': 'Widget', 'quantity': i + 1}
    producer.produce(
        'orders',
        key=f'order-{i}',
        value=json.dumps(order),
        callback=delivery_report
    )
    # Trigger delivery callbacks
    producer.poll(0)

# Wait for all messages to be delivered
producer.flush()
```

#### Consumer with Confluent Client

```python
from confluent_kafka import Consumer, KafkaError
import json

# Create consumer
consumer = Consumer({
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'order-processor',
    'auto.offset.reset': 'earliest',
    'enable.auto.commit': True,
    'auto.commit.interval.ms': 5000
})

# Subscribe to topic
consumer.subscribe(['orders'])

try:
    while True:
        msg = consumer.poll(timeout=1.0)

        if msg is None:
            continue

        if msg.error():
            if msg.error().code() == KafkaError._PARTITION_EOF:
                print(f"End of partition {msg.partition()}")
            else:
                print(f"Error: {msg.error()}")
            continue

        # Process message
        value = json.loads(msg.value().decode('utf-8'))
        print(f"Received: {value}")
        print(f"  Key: {msg.key().decode('utf-8') if msg.key() else None}")
        print(f"  Partition: {msg.partition()}")
        print(f"  Offset: {msg.offset()}")

except KeyboardInterrupt:
    pass
finally:
    consumer.close()
```

## Node.js Kafka Clients

### KafkaJS Library

KafkaJS is the most popular pure JavaScript Kafka client for Node.js.

#### Installation

```bash
npm install kafkajs
```

#### Basic Producer

```javascript
const { Kafka } = require('kafkajs');

// Create Kafka client
const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092'],
  // Connection settings
  connectionTimeout: 3000,
  requestTimeout: 30000,
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

// Create producer
const producer = kafka.producer({
  allowAutoTopicCreation: false,
  idempotent: true,
  maxInFlightRequests: 5
});

async function produceMessages() {
  await producer.connect();

  try {
    // Send single message
    const result = await producer.send({
      topic: 'orders',
      messages: [
        {
          key: 'order-123',
          value: JSON.stringify({
            orderId: 123,
            product: 'Widget',
            quantity: 5
          }),
          headers: {
            'correlation-id': 'abc-123'
          }
        }
      ]
    });

    console.log('Message sent:', result);

    // Send batch of messages
    const batchResult = await producer.sendBatch({
      topicMessages: [
        {
          topic: 'orders',
          messages: [
            { key: 'order-124', value: JSON.stringify({ orderId: 124, product: 'Gadget', quantity: 2 }) },
            { key: 'order-125', value: JSON.stringify({ orderId: 125, product: 'Gizmo', quantity: 10 }) }
          ]
        }
      ]
    });

    console.log('Batch sent:', batchResult);
  } finally {
    await producer.disconnect();
  }
}

produceMessages().catch(console.error);
```

#### Basic Consumer

```javascript
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({
  groupId: 'order-processor',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  maxWaitTimeInMs: 5000,
  maxBytesPerPartition: 1048576
});

async function consumeMessages() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'orders', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const value = JSON.parse(message.value.toString());
      const key = message.key ? message.key.toString() : null;

      console.log({
        topic,
        partition,
        offset: message.offset,
        key,
        value,
        headers: message.headers
      });
    }
  });
}

// Handle graceful shutdown
const errorTypes = ['unhandledRejection', 'uncaughtException'];
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

errorTypes.forEach(type => {
  process.on(type, async () => {
    try {
      console.log(`Process ${type}`);
      await consumer.disconnect();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  });
});

signalTraps.forEach(type => {
  process.once(type, async () => {
    try {
      await consumer.disconnect();
    } finally {
      process.kill(process.pid, type);
    }
  });
});

consumeMessages().catch(console.error);
```

#### Batch Processing

```javascript
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'batch-processor',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'batch-processor' });

async function batchConsume() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'orders', fromBeginning: true });

  await consumer.run({
    eachBatch: async ({
      batch,
      resolveOffset,
      heartbeat,
      commitOffsetsIfNecessary,
      isRunning,
      isStale
    }) => {
      console.log(`Processing batch of ${batch.messages.length} messages`);

      for (const message of batch.messages) {
        if (!isRunning() || isStale()) break;

        const value = JSON.parse(message.value.toString());

        // Process message
        await processOrder(value);

        // Mark as processed
        resolveOffset(message.offset);

        // Send heartbeat to prevent rebalance
        await heartbeat();
      }
    }
  });
}

async function processOrder(order) {
  console.log('Processing:', order);
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 100));
}

batchConsume().catch(console.error);
```

#### TypeScript Support

```typescript
import { Kafka, Producer, Consumer, Message, EachMessagePayload } from 'kafkajs';

interface Order {
  orderId: number;
  product: string;
  quantity: number;
}

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092']
});

const producer: Producer = kafka.producer();
const consumer: Consumer = kafka.consumer({ groupId: 'order-processor' });

async function sendOrder(order: Order): Promise<void> {
  await producer.connect();

  const message: Message = {
    key: `order-${order.orderId}`,
    value: JSON.stringify(order)
  };

  await producer.send({
    topic: 'orders',
    messages: [message]
  });

  await producer.disconnect();
}

async function consumeOrders(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topic: 'orders', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
      const order: Order = JSON.parse(message.value?.toString() || '{}');
      console.log('Received order:', order);
    }
  });
}
```

## Java Kafka Client

Java has the official Apache Kafka client library with full feature support.

#### Maven Dependency

```xml
<dependency>
    <groupId>org.apache.kafka</groupId>
    <artifactId>kafka-clients</artifactId>
    <version>3.7.0</version>
</dependency>
```

#### Gradle Dependency

```groovy
implementation 'org.apache.kafka:kafka-clients:3.7.0'
```

#### Basic Producer

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;
import java.util.Properties;
import java.util.concurrent.ExecutionException;

public class OrderProducer {
    private final Producer<String, String> producer;

    public OrderProducer(String bootstrapServers) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

        // Reliability settings
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, 3);
        props.put(ProducerConfig.RETRY_BACKOFF_MS_CONFIG, 100);
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        // Performance settings
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);
        props.put(ProducerConfig.LINGER_MS_CONFIG, 10);
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "gzip");
        props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 33554432);

        this.producer = new KafkaProducer<>(props);
    }

    public void sendAsync(String topic, String key, String value) {
        ProducerRecord<String, String> record = new ProducerRecord<>(topic, key, value);

        producer.send(record, (metadata, exception) -> {
            if (exception == null) {
                System.out.printf("Sent to %s partition %d offset %d%n",
                    metadata.topic(), metadata.partition(), metadata.offset());
            } else {
                System.err.println("Send failed: " + exception.getMessage());
            }
        });
    }

    public RecordMetadata sendSync(String topic, String key, String value)
            throws ExecutionException, InterruptedException {
        ProducerRecord<String, String> record = new ProducerRecord<>(topic, key, value);
        return producer.send(record).get();
    }

    public void close() {
        producer.close();
    }

    public static void main(String[] args) throws ExecutionException, InterruptedException {
        OrderProducer producer = new OrderProducer("localhost:9092");

        // Send async
        producer.sendAsync("orders", "order-123",
            "{\"orderId\": 123, \"product\": \"Widget\", \"quantity\": 5}");

        // Send sync
        RecordMetadata metadata = producer.sendSync("orders", "order-124",
            "{\"orderId\": 124, \"product\": \"Gadget\", \"quantity\": 2}");

        System.out.println("Sync send complete: " + metadata);

        producer.close();
    }
}
```

#### Basic Consumer

```java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.serialization.StringDeserializer;
import java.time.Duration;
import java.util.*;

public class OrderConsumer {
    private final Consumer<String, String> consumer;
    private volatile boolean running = true;

    public OrderConsumer(String bootstrapServers, String groupId) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());

        // Consumer settings
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "true");
        props.put(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG, "5000");
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, "500");
        props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, "300000");
        props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, "30000");

        this.consumer = new KafkaConsumer<>(props);
    }

    public void subscribe(String... topics) {
        consumer.subscribe(Arrays.asList(topics));
    }

    public void consume() {
        try {
            while (running) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));

                for (ConsumerRecord<String, String> record : records) {
                    System.out.printf("Received: topic=%s, partition=%d, offset=%d, key=%s, value=%s%n",
                        record.topic(), record.partition(), record.offset(),
                        record.key(), record.value());

                    processRecord(record);
                }
            }
        } finally {
            consumer.close();
        }
    }

    private void processRecord(ConsumerRecord<String, String> record) {
        // Process the record
        System.out.println("Processing: " + record.value());
    }

    public void shutdown() {
        running = false;
        consumer.wakeup();
    }

    public static void main(String[] args) {
        OrderConsumer consumer = new OrderConsumer("localhost:9092", "order-processor");

        // Add shutdown hook
        Runtime.getRuntime().addShutdownHook(new Thread(consumer::shutdown));

        consumer.subscribe("orders");
        consumer.consume();
    }
}
```

#### Manual Offset Commit

```java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.serialization.StringDeserializer;
import java.time.Duration;
import java.util.*;

public class ManualCommitConsumer {
    private final Consumer<String, String> consumer;
    private volatile boolean running = true;

    public ManualCommitConsumer(String bootstrapServers, String groupId) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");

        this.consumer = new KafkaConsumer<>(props);
    }

    public void consumeWithManualCommit(String topic) {
        consumer.subscribe(Collections.singletonList(topic));

        try {
            while (running) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));

                for (ConsumerRecord<String, String> record : records) {
                    try {
                        processRecord(record);

                        // Commit offset for this specific partition
                        Map<TopicPartition, OffsetAndMetadata> offsets = new HashMap<>();
                        offsets.put(
                            new TopicPartition(record.topic(), record.partition()),
                            new OffsetAndMetadata(record.offset() + 1)
                        );
                        consumer.commitSync(offsets);

                    } catch (Exception e) {
                        System.err.println("Error processing record: " + e.getMessage());
                        // Don't commit - will reprocess
                    }
                }
            }
        } finally {
            consumer.close();
        }
    }

    public void consumeWithBatchCommit(String topic) {
        consumer.subscribe(Collections.singletonList(topic));

        try {
            while (running) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));

                List<ConsumerRecord<String, String>> buffer = new ArrayList<>();

                for (ConsumerRecord<String, String> record : records) {
                    buffer.add(record);
                }

                if (!buffer.isEmpty()) {
                    try {
                        processBatch(buffer);
                        consumer.commitSync();
                    } catch (Exception e) {
                        System.err.println("Batch processing failed: " + e.getMessage());
                    }
                }
            }
        } finally {
            consumer.close();
        }
    }

    private void processRecord(ConsumerRecord<String, String> record) {
        System.out.println("Processing: " + record.value());
    }

    private void processBatch(List<ConsumerRecord<String, String>> batch) {
        System.out.println("Processing batch of " + batch.size() + " records");
        for (ConsumerRecord<String, String> record : batch) {
            processRecord(record);
        }
    }

    public void shutdown() {
        running = false;
        consumer.wakeup();
    }
}
```

#### JSON Serialization with Jackson

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.common.serialization.Serializer;
import org.apache.kafka.common.serialization.Deserializer;
import java.util.Map;

public class JsonSerializer<T> implements Serializer<T> {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {}

    @Override
    public byte[] serialize(String topic, T data) {
        if (data == null) return null;
        try {
            return objectMapper.writeValueAsBytes(data);
        } catch (Exception e) {
            throw new RuntimeException("Error serializing JSON", e);
        }
    }

    @Override
    public void close() {}
}

public class JsonDeserializer<T> implements Deserializer<T> {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private Class<T> targetType;

    public JsonDeserializer(Class<T> targetType) {
        this.targetType = targetType;
    }

    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {}

    @Override
    public T deserialize(String topic, byte[] data) {
        if (data == null) return null;
        try {
            return objectMapper.readValue(data, targetType);
        } catch (Exception e) {
            throw new RuntimeException("Error deserializing JSON", e);
        }
    }

    @Override
    public void close() {}
}

// Usage
public class Order {
    public int orderId;
    public String product;
    public int quantity;
}

// Producer with JSON serializer
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class.getName());

Producer<String, Order> producer = new KafkaProducer<>(props);
Order order = new Order();
order.orderId = 123;
order.product = "Widget";
order.quantity = 5;

producer.send(new ProducerRecord<>("orders", "order-123", order));
```

## SSL/TLS Configuration

### Python with SSL

```python
from kafka import KafkaProducer, KafkaConsumer

producer = KafkaProducer(
    bootstrap_servers=['localhost:9093'],
    security_protocol='SSL',
    ssl_cafile='/path/to/ca-cert.pem',
    ssl_certfile='/path/to/client-cert.pem',
    ssl_keyfile='/path/to/client-key.pem',
    ssl_password='keypassword'
)

consumer = KafkaConsumer(
    'orders',
    bootstrap_servers=['localhost:9093'],
    security_protocol='SSL',
    ssl_cafile='/path/to/ca-cert.pem',
    ssl_certfile='/path/to/client-cert.pem',
    ssl_keyfile='/path/to/client-key.pem',
    ssl_password='keypassword'
)
```

### Node.js with SSL

```javascript
const { Kafka } = require('kafkajs');
const fs = require('fs');

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9093'],
  ssl: {
    ca: [fs.readFileSync('/path/to/ca-cert.pem', 'utf-8')],
    cert: fs.readFileSync('/path/to/client-cert.pem', 'utf-8'),
    key: fs.readFileSync('/path/to/client-key.pem', 'utf-8'),
    passphrase: 'keypassword'
  }
});
```

### Java with SSL

```java
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9093");
props.put("security.protocol", "SSL");
props.put("ssl.truststore.location", "/path/to/truststore.jks");
props.put("ssl.truststore.password", "truststorepassword");
props.put("ssl.keystore.location", "/path/to/keystore.jks");
props.put("ssl.keystore.password", "keystorepassword");
props.put("ssl.key.password", "keypassword");
```

## Best Practices Summary

### Connection Management

- Reuse producer and consumer instances
- Implement proper shutdown hooks
- Use connection pooling for high-throughput applications

### Error Handling

- Implement retry logic with exponential backoff
- Handle specific exceptions appropriately
- Log failed messages for later analysis

### Performance

- Use async sends for producers when possible
- Configure appropriate batch sizes
- Enable compression for large messages

### Reliability

- Use `acks=all` for critical data
- Enable idempotent producers
- Implement proper offset management

## Conclusion

Each language has mature Kafka client libraries with full feature support. Choose based on your application's needs:

- **Python**: Use confluent-kafka for performance, kafka-python for simplicity
- **Node.js**: KafkaJS provides excellent TypeScript support and async patterns
- **Java**: The official client offers the most complete feature set

Regardless of language, focus on proper error handling, connection management, and offset commit strategies for reliable Kafka applications.
