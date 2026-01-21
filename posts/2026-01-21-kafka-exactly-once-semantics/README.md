# How to Implement Exactly-Once Semantics in Kafka Producers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Exactly-Once, Idempotent Producer, Transactions, Data Consistency, Java, Python

Description: A comprehensive guide to implementing exactly-once semantics in Kafka producers using idempotent producers and transactions, ensuring no duplicate or lost messages in your streaming applications.

---

Exactly-once semantics (EOS) is one of the most challenging problems in distributed systems. Kafka provides built-in support for exactly-once delivery through idempotent producers and transactions. This guide covers how to implement EOS in your Kafka applications.

## Understanding Delivery Semantics

Kafka supports three delivery semantics:

- **At-most-once**: Messages may be lost but never duplicated
- **At-least-once**: Messages are never lost but may be duplicated
- **Exactly-once**: Messages are delivered exactly once

## Idempotent Producers

Idempotent producers ensure that retries don't result in duplicate messages within a single producer session.

### How Idempotence Works

1. Producer assigns a unique Producer ID (PID) on initialization
2. Each message gets a sequence number
3. Broker tracks sequence numbers and rejects duplicates
4. Automatic retry handling without duplicates

### Java Idempotent Producer

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;
import java.util.Properties;

public class IdempotentProducer {
    private final Producer<String, String> producer;

    public IdempotentProducer(String bootstrapServers) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());

        // Enable idempotence
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        // Required settings for idempotence
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);
        props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);

        this.producer = new KafkaProducer<>(props);
    }

    public void send(String topic, String key, String value) {
        ProducerRecord<String, String> record =
            new ProducerRecord<>(topic, key, value);

        producer.send(record, (metadata, exception) -> {
            if (exception != null) {
                System.err.println("Send failed: " + exception.getMessage());
            } else {
                System.out.printf("Sent to %s-%d @ offset %d%n",
                    metadata.topic(), metadata.partition(), metadata.offset());
            }
        });
    }

    public void close() {
        producer.close();
    }

    public static void main(String[] args) {
        IdempotentProducer producer = new IdempotentProducer("localhost:9092");

        for (int i = 0; i < 100; i++) {
            producer.send("idempotent-topic", "key-" + i,
                "message-" + i);
        }

        producer.close();
    }
}
```

### Python Idempotent Producer

```python
from confluent_kafka import Producer
import json

def create_idempotent_producer(bootstrap_servers):
    config = {
        'bootstrap.servers': bootstrap_servers,
        # Enable idempotence
        'enable.idempotence': True,
        # Required settings
        'acks': 'all',
        'max.in.flight.requests.per.connection': 5,
        'retries': 2147483647,  # Max int
    }
    return Producer(config)


def delivery_report(err, msg):
    if err:
        print(f"Delivery failed: {err}")
    else:
        print(f"Delivered to {msg.topic()} [{msg.partition()}] @ {msg.offset()}")


def main():
    producer = create_idempotent_producer('localhost:9092')

    for i in range(100):
        producer.produce(
            'idempotent-topic',
            key=f'key-{i}',
            value=json.dumps({'id': i, 'data': f'message-{i}'}),
            callback=delivery_report
        )
        producer.poll(0)

    producer.flush()


if __name__ == '__main__':
    main()
```

## Transactional Producers

Transactions provide exactly-once semantics across multiple partitions and topics, and enable atomic read-process-write patterns.

### Transaction Concepts

- **Transactional ID**: Unique identifier for the producer instance
- **Transaction Coordinator**: Broker that manages transaction state
- **Transaction Log**: Internal topic storing transaction metadata
- **Two-Phase Commit**: Prepare and commit phases

### Java Transactional Producer

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;
import org.apache.kafka.common.KafkaException;
import org.apache.kafka.common.errors.*;
import java.util.Properties;

public class TransactionalProducer {
    private final Producer<String, String> producer;

    public TransactionalProducer(String bootstrapServers, String transactionalId) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());

        // Enable transactions
        props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, transactionalId);

        // Idempotence is automatically enabled with transactions
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        props.put(ProducerConfig.ACKS_CONFIG, "all");

        // Transaction timeout
        props.put(ProducerConfig.TRANSACTION_TIMEOUT_CONFIG, 60000);

        this.producer = new KafkaProducer<>(props);

        // Initialize transactions
        producer.initTransactions();
    }

    public void sendInTransaction(String topic, java.util.List<String> messages) {
        try {
            // Begin transaction
            producer.beginTransaction();

            // Send messages
            for (int i = 0; i < messages.size(); i++) {
                ProducerRecord<String, String> record =
                    new ProducerRecord<>(topic, "key-" + i, messages.get(i));
                producer.send(record);
            }

            // Commit transaction
            producer.commitTransaction();
            System.out.println("Transaction committed successfully");

        } catch (ProducerFencedException | OutOfOrderSequenceException |
                 AuthorizationException e) {
            // Fatal errors - cannot recover
            producer.close();
            throw e;
        } catch (KafkaException e) {
            // Abort transaction on other errors
            producer.abortTransaction();
            System.err.println("Transaction aborted: " + e.getMessage());
        }
    }

    public void sendToMultipleTopics(String topic1, String topic2,
                                     String message1, String message2) {
        try {
            producer.beginTransaction();

            // Send to first topic
            producer.send(new ProducerRecord<>(topic1, "key1", message1));

            // Send to second topic
            producer.send(new ProducerRecord<>(topic2, "key2", message2));

            // Both messages commit atomically
            producer.commitTransaction();

        } catch (KafkaException e) {
            producer.abortTransaction();
            throw e;
        }
    }

    public void close() {
        producer.close();
    }

    public static void main(String[] args) {
        TransactionalProducer producer =
            new TransactionalProducer("localhost:9092", "my-transactional-id");

        // Send batch in transaction
        java.util.List<String> messages = java.util.Arrays.asList(
            "message-1", "message-2", "message-3"
        );
        producer.sendInTransaction("transactional-topic", messages);

        // Send to multiple topics atomically
        producer.sendToMultipleTopics(
            "topic-a", "topic-b",
            "message-for-a", "message-for-b"
        );

        producer.close();
    }
}
```

### Python Transactional Producer

```python
from confluent_kafka import Producer, KafkaException
import json

class TransactionalProducer:
    def __init__(self, bootstrap_servers, transactional_id):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            'transactional.id': transactional_id,
            'enable.idempotence': True,
            'acks': 'all',
            'transaction.timeout.ms': 60000,
        }
        self.producer = Producer(self.config)
        self.producer.init_transactions()

    def send_in_transaction(self, topic, messages):
        try:
            self.producer.begin_transaction()

            for i, msg in enumerate(messages):
                self.producer.produce(
                    topic,
                    key=f'key-{i}',
                    value=json.dumps(msg) if isinstance(msg, dict) else msg
                )

            self.producer.commit_transaction()
            print("Transaction committed")

        except KafkaException as e:
            print(f"Transaction failed: {e}")
            self.producer.abort_transaction()
            raise

    def send_to_multiple_topics(self, topic_messages):
        """
        topic_messages: list of (topic, key, value) tuples
        """
        try:
            self.producer.begin_transaction()

            for topic, key, value in topic_messages:
                self.producer.produce(
                    topic,
                    key=key,
                    value=json.dumps(value) if isinstance(value, dict) else value
                )

            self.producer.commit_transaction()

        except KafkaException as e:
            self.producer.abort_transaction()
            raise

    def close(self):
        self.producer.flush()


def main():
    producer = TransactionalProducer(
        'localhost:9092',
        'python-transactional-id'
    )

    # Send batch in transaction
    messages = [
        {'id': 1, 'data': 'message-1'},
        {'id': 2, 'data': 'message-2'},
        {'id': 3, 'data': 'message-3'},
    ]
    producer.send_in_transaction('transactional-topic', messages)

    # Send to multiple topics
    multi_topic_messages = [
        ('topic-a', 'key-1', {'id': 1, 'target': 'a'}),
        ('topic-b', 'key-2', {'id': 2, 'target': 'b'}),
    ]
    producer.send_to_multiple_topics(multi_topic_messages)

    producer.close()


if __name__ == '__main__':
    main()
```

## Read-Process-Write Pattern

The most powerful use of transactions is the read-process-write pattern, enabling exactly-once stream processing.

### Java Read-Process-Write

```java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.TopicPartition;
import java.time.Duration;
import java.util.*;

public class ExactlyOnceProcessor {
    private final Consumer<String, String> consumer;
    private final Producer<String, String> producer;
    private final String inputTopic;
    private final String outputTopic;
    private final String consumerGroup;

    public ExactlyOnceProcessor(String bootstrapServers,
                                String inputTopic,
                                String outputTopic,
                                String transactionalId,
                                String consumerGroup) {
        this.inputTopic = inputTopic;
        this.outputTopic = outputTopic;
        this.consumerGroup = consumerGroup;

        // Consumer configuration
        Properties consumerProps = new Properties();
        consumerProps.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        consumerProps.put(ConsumerConfig.GROUP_ID_CONFIG, consumerGroup);
        consumerProps.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        consumerProps.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        // Disable auto commit - we'll commit with transaction
        consumerProps.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        // Read only committed messages
        consumerProps.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed");

        this.consumer = new KafkaConsumer<>(consumerProps);

        // Producer configuration
        Properties producerProps = new Properties();
        producerProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        producerProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        producerProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        producerProps.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, transactionalId);
        producerProps.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        this.producer = new KafkaProducer<>(producerProps);
        this.producer.initTransactions();
    }

    public void process() {
        consumer.subscribe(Collections.singletonList(inputTopic));

        try {
            while (true) {
                ConsumerRecords<String, String> records =
                    consumer.poll(Duration.ofMillis(100));

                if (records.isEmpty()) continue;

                try {
                    producer.beginTransaction();

                    Map<TopicPartition, OffsetAndMetadata> offsets = new HashMap<>();

                    for (ConsumerRecord<String, String> record : records) {
                        // Process the record
                        String processedValue = processRecord(record.value());

                        // Send to output topic
                        producer.send(new ProducerRecord<>(
                            outputTopic, record.key(), processedValue));

                        // Track offset
                        offsets.put(
                            new TopicPartition(record.topic(), record.partition()),
                            new OffsetAndMetadata(record.offset() + 1)
                        );
                    }

                    // Commit offsets as part of transaction
                    producer.sendOffsetsToTransaction(offsets, consumerGroup);

                    // Commit transaction
                    producer.commitTransaction();

                } catch (Exception e) {
                    producer.abortTransaction();
                    System.err.println("Transaction aborted: " + e.getMessage());
                }
            }
        } finally {
            consumer.close();
            producer.close();
        }
    }

    private String processRecord(String value) {
        // Transform the message
        return value.toUpperCase();
    }

    public static void main(String[] args) {
        ExactlyOnceProcessor processor = new ExactlyOnceProcessor(
            "localhost:9092",
            "input-topic",
            "output-topic",
            "eos-processor-1",
            "eos-consumer-group"
        );

        processor.process();
    }
}
```

### Python Read-Process-Write

```python
from confluent_kafka import Consumer, Producer, KafkaException, TopicPartition
import json

class ExactlyOnceProcessor:
    def __init__(self, bootstrap_servers, input_topic, output_topic,
                 transactional_id, consumer_group):
        self.input_topic = input_topic
        self.output_topic = output_topic
        self.consumer_group = consumer_group

        # Consumer configuration
        consumer_config = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': consumer_group,
            'enable.auto.commit': False,
            'isolation.level': 'read_committed',
            'auto.offset.reset': 'earliest',
        }
        self.consumer = Consumer(consumer_config)

        # Producer configuration
        producer_config = {
            'bootstrap.servers': bootstrap_servers,
            'transactional.id': transactional_id,
            'enable.idempotence': True,
        }
        self.producer = Producer(producer_config)
        self.producer.init_transactions()

    def process(self):
        self.consumer.subscribe([self.input_topic])

        try:
            while True:
                msg = self.consumer.poll(timeout=1.0)

                if msg is None:
                    continue

                if msg.error():
                    print(f"Consumer error: {msg.error()}")
                    continue

                try:
                    self.producer.begin_transaction()

                    # Process the message
                    processed_value = self.process_record(msg.value())

                    # Send to output topic
                    self.producer.produce(
                        self.output_topic,
                        key=msg.key(),
                        value=processed_value
                    )

                    # Commit offset with transaction
                    self.producer.send_offsets_to_transaction(
                        [TopicPartition(msg.topic(), msg.partition(),
                                       msg.offset() + 1)],
                        self.consumer.consumer_group_metadata()
                    )

                    self.producer.commit_transaction()

                except KafkaException as e:
                    print(f"Transaction failed: {e}")
                    self.producer.abort_transaction()

        except KeyboardInterrupt:
            pass
        finally:
            self.consumer.close()

    def process_record(self, value):
        # Transform the message
        if isinstance(value, bytes):
            value = value.decode('utf-8')
        data = json.loads(value)
        data['processed'] = True
        return json.dumps(data)


def main():
    processor = ExactlyOnceProcessor(
        'localhost:9092',
        'input-topic',
        'output-topic',
        'eos-processor-1',
        'eos-consumer-group'
    )
    processor.process()


if __name__ == '__main__':
    main()
```

## Node.js Transactional Producer

```javascript
const { Kafka } = require('kafkajs');

class TransactionalProducer {
  constructor(brokers, transactionalId) {
    this.kafka = new Kafka({
      clientId: 'transactional-producer',
      brokers: brokers,
    });

    this.producer = this.kafka.producer({
      transactionalId: transactionalId,
      maxInFlightRequests: 1,
      idempotent: true,
    });
  }

  async connect() {
    await this.producer.connect();
  }

  async disconnect() {
    await this.producer.disconnect();
  }

  async sendInTransaction(topic, messages) {
    const transaction = await this.producer.transaction();

    try {
      for (const msg of messages) {
        await transaction.send({
          topic,
          messages: [msg],
        });
      }

      await transaction.commit();
      console.log('Transaction committed');
    } catch (error) {
      await transaction.abort();
      console.error('Transaction aborted:', error.message);
      throw error;
    }
  }

  async sendToMultipleTopics(topicMessages) {
    const transaction = await this.producer.transaction();

    try {
      for (const { topic, messages } of topicMessages) {
        await transaction.send({ topic, messages });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.abort();
      throw error;
    }
  }
}

async function main() {
  const producer = new TransactionalProducer(
    ['localhost:9092'],
    'nodejs-transactional-id'
  );

  await producer.connect();

  // Send batch in transaction
  const messages = [
    { key: 'key-1', value: JSON.stringify({ id: 1, data: 'message-1' }) },
    { key: 'key-2', value: JSON.stringify({ id: 2, data: 'message-2' }) },
  ];

  await producer.sendInTransaction('transactional-topic', messages);

  // Send to multiple topics
  await producer.sendToMultipleTopics([
    {
      topic: 'topic-a',
      messages: [{ key: 'key-a', value: 'message-for-a' }],
    },
    {
      topic: 'topic-b',
      messages: [{ key: 'key-b', value: 'message-for-b' }],
    },
  ]);

  await producer.disconnect();
}

main().catch(console.error);
```

## Broker Configuration for EOS

```properties
# server.properties

# Transaction log configuration
transaction.state.log.replication.factor=3
transaction.state.log.min.isr=2
transaction.state.log.num.partitions=50

# Transaction timeout
transaction.max.timeout.ms=900000

# Enable EOS for transactions
transactional.id.expiration.ms=604800000
```

## Best Practices

### 1. Unique Transactional IDs

```java
// Use instance-specific transactional IDs
String transactionalId = "app-" + hostname + "-" + instanceId;
```

### 2. Handle Transaction Errors Properly

```java
try {
    producer.beginTransaction();
    // ... send messages
    producer.commitTransaction();
} catch (ProducerFencedException e) {
    // Another producer with same transactional.id is active
    // Cannot recover - must create new producer
    producer.close();
} catch (OutOfOrderSequenceException e) {
    // Sequence number out of order
    // Cannot recover - must create new producer
    producer.close();
} catch (AuthorizationException e) {
    // Not authorized for transactional operations
    producer.close();
} catch (KafkaException e) {
    // Other errors - can retry after abort
    producer.abortTransaction();
}
```

### 3. Consumer Isolation Level

```java
// Read only committed messages
props.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed");
```

### 4. Transaction Timeout

```java
// Set appropriate timeout based on processing time
props.put(ProducerConfig.TRANSACTION_TIMEOUT_CONFIG, 60000);
```

## Performance Considerations

| Feature | Throughput Impact | When to Use |
|---------|-------------------|-------------|
| Idempotent Producer | Minimal (~5% overhead) | Always in production |
| Transactions (single topic) | Moderate (~20% overhead) | Atomic batch writes |
| Transactions (multi-topic) | Higher overhead | Cross-topic consistency |
| Read-Process-Write | Significant overhead | Stream processing EOS |

## Conclusion

Exactly-once semantics in Kafka requires understanding both idempotent producers and transactions:

1. **Idempotent producers**: Enable for all production workloads
2. **Transactions**: Use for atomic multi-message operations
3. **Read-process-write**: Combine consumer and producer in transactions
4. **Consumer isolation**: Set to read_committed for transactional consumers

Choose the appropriate level of EOS based on your application's requirements, balancing consistency guarantees against performance overhead.
