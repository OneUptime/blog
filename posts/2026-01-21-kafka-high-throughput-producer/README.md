# How to Build a High-Throughput Kafka Producer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Producer, High Throughput, Performance, Batching, Compression, Java, Python

Description: A comprehensive guide to building high-throughput Kafka producers, covering batching strategies, compression options, async sending, partitioning, and performance tuning for maximum message throughput.

---

Building a high-throughput Kafka producer requires understanding and optimizing multiple configuration parameters. This guide covers batching, compression, async sending, and other techniques to maximize your producer's throughput while maintaining reliability.

## Understanding Producer Throughput

Producer throughput is influenced by several factors:

- **Batching**: Grouping messages reduces network overhead
- **Compression**: Reduces data size, improving network utilization
- **Async sending**: Non-blocking sends increase parallelism
- **Partitioning**: Distributes load across brokers
- **Network configuration**: Buffer sizes and connection settings

## Key Configuration Parameters

### Batching Configuration

```properties
# Batch size in bytes (default: 16384)
batch.size=65536

# Time to wait for batch to fill (default: 0)
linger.ms=20

# Maximum size of a request (default: 1048576)
max.request.size=10485760

# Buffer memory for unsent messages (default: 33554432)
buffer.memory=67108864
```

### Compression Options

```properties
# Compression type: none, gzip, snappy, lz4, zstd
compression.type=lz4

# For zstd, you can also set compression level
# compression.type=zstd
# compression.level=3
```

### Async and Retry Settings

```properties
# Maximum in-flight requests per connection (default: 5)
max.in.flight.requests.per.connection=5

# Acknowledgment level
acks=1

# Retry settings
retries=3
retry.backoff.ms=100

# Request timeout
request.timeout.ms=30000
delivery.timeout.ms=120000
```

## Java High-Throughput Producer

### Complete Implementation

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;
import java.util.Properties;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

public class HighThroughputProducer {
    private final Producer<String, String> producer;
    private final AtomicLong successCount = new AtomicLong(0);
    private final AtomicLong errorCount = new AtomicLong(0);
    private final AtomicLong totalLatency = new AtomicLong(0);

    public HighThroughputProducer(String bootstrapServers) {
        Properties props = new Properties();

        // Bootstrap servers
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);

        // Serializers
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());

        // Batching - larger batches for throughput
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 65536);  // 64KB
        props.put(ProducerConfig.LINGER_MS_CONFIG, 20);      // Wait up to 20ms

        // Compression - LZ4 offers best speed/ratio balance
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4");

        // Buffer memory
        props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 67108864);  // 64MB

        // Acknowledgments - acks=1 for throughput, acks=all for durability
        props.put(ProducerConfig.ACKS_CONFIG, "1");

        // In-flight requests - increase for throughput
        props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);

        // Request size
        props.put(ProducerConfig.MAX_REQUEST_SIZE_CONFIG, 10485760);  // 10MB

        // Timeouts
        props.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 30000);
        props.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 120000);

        // Retries
        props.put(ProducerConfig.RETRIES_CONFIG, 3);
        props.put(ProducerConfig.RETRY_BACKOFF_MS_CONFIG, 100);

        this.producer = new KafkaProducer<>(props);
    }

    public void sendAsync(String topic, String key, String value) {
        long startTime = System.currentTimeMillis();

        ProducerRecord<String, String> record =
            new ProducerRecord<>(topic, key, value);

        producer.send(record, (metadata, exception) -> {
            long latency = System.currentTimeMillis() - startTime;
            totalLatency.addAndGet(latency);

            if (exception == null) {
                successCount.incrementAndGet();
            } else {
                errorCount.incrementAndGet();
                System.err.println("Send failed: " + exception.getMessage());
            }
        });
    }

    public void sendBatch(String topic, java.util.List<String> messages) {
        for (int i = 0; i < messages.size(); i++) {
            String key = "key-" + i;
            sendAsync(topic, key, messages.get(i));
        }
    }

    public void flush() {
        producer.flush();
    }

    public void printStats() {
        long total = successCount.get() + errorCount.get();
        if (total > 0) {
            System.out.printf("Success: %d, Errors: %d, Avg Latency: %.2f ms%n",
                successCount.get(),
                errorCount.get(),
                (double) totalLatency.get() / total);
        }
    }

    public void close() {
        producer.close();
    }

    public static void main(String[] args) throws InterruptedException {
        HighThroughputProducer producer =
            new HighThroughputProducer("localhost:9092");

        int messageCount = 1000000;
        long startTime = System.currentTimeMillis();

        // Send messages
        for (int i = 0; i < messageCount; i++) {
            String value = "{\"id\":" + i + ",\"data\":\"test message " + i + "\"}";
            producer.sendAsync("high-throughput-topic", "key-" + (i % 100), value);

            // Print progress every 100k messages
            if (i > 0 && i % 100000 == 0) {
                System.out.println("Sent " + i + " messages");
            }
        }

        // Flush remaining messages
        producer.flush();

        long duration = System.currentTimeMillis() - startTime;
        double throughput = (double) messageCount / duration * 1000;

        System.out.printf("Sent %d messages in %d ms (%.2f msgs/sec)%n",
            messageCount, duration, throughput);

        producer.printStats();
        producer.close();
    }
}
```

### Multi-Threaded Producer

```java
import org.apache.kafka.clients.producer.*;
import java.util.Properties;
import java.util.concurrent.*;

public class MultiThreadedProducer {
    private final Producer<String, String> producer;
    private final ExecutorService executor;
    private final int numThreads;

    public MultiThreadedProducer(String bootstrapServers, int numThreads) {
        this.numThreads = numThreads;

        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 65536);
        props.put(ProducerConfig.LINGER_MS_CONFIG, 20);
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4");
        props.put(ProducerConfig.ACKS_CONFIG, "1");

        this.producer = new KafkaProducer<>(props);
        this.executor = Executors.newFixedThreadPool(numThreads);
    }

    public void produceMessages(String topic, int totalMessages) {
        int messagesPerThread = totalMessages / numThreads;

        CountDownLatch latch = new CountDownLatch(numThreads);

        for (int t = 0; t < numThreads; t++) {
            final int threadId = t;
            final int startOffset = t * messagesPerThread;

            executor.submit(() -> {
                try {
                    for (int i = 0; i < messagesPerThread; i++) {
                        int msgId = startOffset + i;
                        ProducerRecord<String, String> record =
                            new ProducerRecord<>(topic,
                                "key-" + (msgId % 100),
                                "{\"thread\":" + threadId + ",\"id\":" + msgId + "}");

                        producer.send(record);
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        try {
            latch.await();
            producer.flush();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    public void close() {
        executor.shutdown();
        producer.close();
    }

    public static void main(String[] args) {
        MultiThreadedProducer producer =
            new MultiThreadedProducer("localhost:9092", 4);

        long start = System.currentTimeMillis();
        producer.produceMessages("test-topic", 1000000);
        long duration = System.currentTimeMillis() - start;

        System.out.printf("Produced 1M messages in %d ms%n", duration);
        producer.close();
    }
}
```

## Python High-Throughput Producer

### Using confluent-kafka

```python
from confluent_kafka import Producer
import json
import time
from threading import Thread
from queue import Queue

class HighThroughputProducer:
    def __init__(self, bootstrap_servers):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            # Batching
            'batch.size': 65536,
            'linger.ms': 20,
            # Compression
            'compression.type': 'lz4',
            # Buffer
            'queue.buffering.max.messages': 1000000,
            'queue.buffering.max.kbytes': 1048576,  # 1GB
            # Acknowledgments
            'acks': 1,
            # Performance
            'socket.send.buffer.bytes': 1048576,
            'socket.receive.buffer.bytes': 1048576,
        }
        self.producer = Producer(self.config)
        self.success_count = 0
        self.error_count = 0

    def delivery_callback(self, err, msg):
        if err:
            self.error_count += 1
        else:
            self.success_count += 1

    def send(self, topic, key, value):
        try:
            self.producer.produce(
                topic,
                key=key,
                value=json.dumps(value) if isinstance(value, dict) else value,
                callback=self.delivery_callback
            )
        except BufferError:
            # Local buffer full, wait for delivery
            self.producer.poll(0.1)
            self.send(topic, key, value)

    def send_batch(self, topic, messages):
        for i, msg in enumerate(messages):
            self.send(topic, f"key-{i % 100}", msg)
            # Poll periodically to trigger callbacks
            if i % 10000 == 0:
                self.producer.poll(0)

    def flush(self):
        self.producer.flush()

    def get_stats(self):
        return {
            'success': self.success_count,
            'errors': self.error_count
        }


def benchmark_producer():
    producer = HighThroughputProducer('localhost:9092')

    message_count = 1000000
    start_time = time.time()

    # Generate and send messages
    for i in range(message_count):
        message = {'id': i, 'data': f'test message {i}'}
        producer.send('high-throughput-topic', f'key-{i % 100}', message)

        # Poll every 10000 messages
        if i % 10000 == 0:
            producer.producer.poll(0)

    # Flush remaining
    producer.flush()

    duration = time.time() - start_time
    throughput = message_count / duration

    print(f"Sent {message_count} messages in {duration:.2f}s")
    print(f"Throughput: {throughput:.2f} msgs/sec")
    print(f"Stats: {producer.get_stats()}")


if __name__ == '__main__':
    benchmark_producer()
```

### Async Producer with asyncio

```python
import asyncio
from aiokafka import AIOKafkaProducer
import json
import time

class AsyncHighThroughputProducer:
    def __init__(self, bootstrap_servers):
        self.bootstrap_servers = bootstrap_servers
        self.producer = None

    async def start(self):
        self.producer = AIOKafkaProducer(
            bootstrap_servers=self.bootstrap_servers,
            # Batching
            batch_size=65536,
            linger_ms=20,
            # Compression
            compression_type='lz4',
            # Acknowledgments
            acks=1,
            # Performance
            max_batch_size=1048576,
            max_request_size=10485760,
        )
        await self.producer.start()

    async def stop(self):
        await self.producer.stop()

    async def send(self, topic, key, value):
        await self.producer.send(
            topic,
            key=key.encode() if key else None,
            value=json.dumps(value).encode()
        )

    async def send_batch(self, topic, messages):
        tasks = []
        for i, msg in enumerate(messages):
            task = self.send(topic, f'key-{i % 100}', msg)
            tasks.append(task)

            # Batch sends in groups of 1000
            if len(tasks) >= 1000:
                await asyncio.gather(*tasks)
                tasks = []

        if tasks:
            await asyncio.gather(*tasks)


async def benchmark_async():
    producer = AsyncHighThroughputProducer('localhost:9092')
    await producer.start()

    message_count = 1000000
    messages = [{'id': i, 'data': f'test {i}'} for i in range(message_count)]

    start_time = time.time()
    await producer.send_batch('async-topic', messages)
    duration = time.time() - start_time

    print(f"Sent {message_count} messages in {duration:.2f}s")
    print(f"Throughput: {message_count/duration:.2f} msgs/sec")

    await producer.stop()


if __name__ == '__main__':
    asyncio.run(benchmark_async())
```

## Node.js High-Throughput Producer

```javascript
const { Kafka, CompressionTypes, Partitioners } = require('kafkajs');

class HighThroughputProducer {
  constructor(brokers) {
    this.kafka = new Kafka({
      clientId: 'high-throughput-producer',
      brokers: brokers,
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false,
      idempotent: false,  // Disable for max throughput
      maxInFlightRequests: 5,
      createPartitioner: Partitioners.DefaultPartitioner,
    });

    this.successCount = 0;
    this.errorCount = 0;
  }

  async connect() {
    await this.producer.connect();
  }

  async disconnect() {
    await this.producer.disconnect();
  }

  async sendBatch(topic, messages) {
    const batchSize = 1000;
    const batches = [];

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize).map((msg, idx) => ({
        key: `key-${(i + idx) % 100}`,
        value: JSON.stringify(msg),
      }));

      batches.push({
        topic,
        messages: batch,
        compression: CompressionTypes.LZ4,
      });
    }

    // Send batches concurrently
    const results = await Promise.allSettled(
      batches.map(batch => this.producer.send(batch))
    );

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        this.successCount += result.value[0].baseOffset !== undefined ? 1 : 0;
      } else {
        this.errorCount++;
      }
    });
  }

  async sendWithCallback(topic, messages, onProgress) {
    const batchSize = 10000;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize).map((msg, idx) => ({
        key: `key-${(i + idx) % 100}`,
        value: JSON.stringify(msg),
      }));

      await this.producer.send({
        topic,
        messages: batch,
        compression: CompressionTypes.LZ4,
      });

      if (onProgress) {
        onProgress(Math.min(i + batchSize, messages.length), messages.length);
      }
    }
  }

  getStats() {
    return {
      success: this.successCount,
      errors: this.errorCount,
    };
  }
}

async function benchmark() {
  const producer = new HighThroughputProducer(['localhost:9092']);
  await producer.connect();

  const messageCount = 100000;
  const messages = Array.from({ length: messageCount }, (_, i) => ({
    id: i,
    data: `test message ${i}`,
    timestamp: Date.now(),
  }));

  console.log(`Sending ${messageCount} messages...`);
  const startTime = Date.now();

  await producer.sendWithCallback('high-throughput-topic', messages, (sent, total) => {
    process.stdout.write(`\rProgress: ${sent}/${total}`);
  });

  const duration = (Date.now() - startTime) / 1000;
  console.log(`\nSent ${messageCount} messages in ${duration.toFixed(2)}s`);
  console.log(`Throughput: ${(messageCount / duration).toFixed(2)} msgs/sec`);
  console.log('Stats:', producer.getStats());

  await producer.disconnect();
}

benchmark().catch(console.error);
```

## Compression Comparison

| Type | CPU Usage | Compression Ratio | Best For |
|------|-----------|-------------------|----------|
| none | Lowest | 1:1 | Already compressed data |
| gzip | High | Best | Batch jobs, storage |
| snappy | Low | Good | Balanced workloads |
| lz4 | Low | Good | Real-time streaming |
| zstd | Medium | Excellent | Best ratio with good speed |

## Performance Tuning Tips

### 1. Batch Size Optimization

```java
// Start with default and increase
// Monitor producer metrics to find optimal size
props.put(ProducerConfig.BATCH_SIZE_CONFIG, 65536);  // 64KB
props.put(ProducerConfig.LINGER_MS_CONFIG, 20);
```

### 2. Acknowledge Level Trade-offs

```java
// Maximum throughput (risk of data loss)
props.put(ProducerConfig.ACKS_CONFIG, "0");

// Good throughput, leader acknowledgment
props.put(ProducerConfig.ACKS_CONFIG, "1");

// Maximum durability (lower throughput)
props.put(ProducerConfig.ACKS_CONFIG, "all");
```

### 3. Buffer Memory

```java
// Increase for bursty workloads
props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 134217728);  // 128MB
```

### 4. In-Flight Requests

```java
// More in-flight requests = higher throughput
// But may affect ordering if retries occur
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);

// For strict ordering with retries
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 1);
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
```

## Monitoring Producer Performance

### Key Metrics

```java
// Access producer metrics
Map<MetricName, ? extends Metric> metrics = producer.metrics();

// Important metrics to monitor:
// - record-send-rate: Messages per second
// - record-size-avg: Average message size
// - batch-size-avg: Average batch size
// - compression-rate-avg: Compression ratio
// - request-latency-avg: Average request latency
// - outgoing-byte-rate: Bytes per second
```

### Prometheus Metrics

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'kafka-producer'
    static_configs:
      - targets: ['localhost:9090']
```

## Conclusion

Building a high-throughput Kafka producer requires balancing multiple configuration parameters. Key takeaways:

1. **Enable batching**: Increase batch.size and linger.ms
2. **Use compression**: LZ4 or Snappy for real-time, ZSTD for best ratio
3. **Tune acknowledgments**: Use acks=1 for throughput, acks=all for durability
4. **Increase parallelism**: More partitions and in-flight requests
5. **Monitor metrics**: Track throughput, latency, and errors

Start with these configurations and adjust based on your specific workload characteristics and requirements.
