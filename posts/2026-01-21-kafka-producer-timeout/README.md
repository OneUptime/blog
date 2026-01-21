# How to Debug Kafka Producer Timeout Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Producer Timeout, Troubleshooting, Performance, Network Issues, Configuration

Description: A comprehensive guide to diagnosing and fixing Kafka producer timeout errors, covering network issues, broker problems, and configuration tuning.

---

Producer timeout errors are among the most common issues in Kafka deployments. This guide covers how to diagnose the root cause and implement solutions for reliable message delivery.

## Understanding Producer Timeouts

### Common Timeout Errors

```
org.apache.kafka.common.errors.TimeoutException:
Failed to update metadata after 60000 ms

org.apache.kafka.common.errors.TimeoutException:
Expiring 1 record(s) for topic-0: 30000 ms has passed since batch creation

org.apache.kafka.common.errors.TimeoutException:
Topic not present in metadata after 60000 ms
```

### Timeout Types

| Configuration | Description | Default |
|--------------|-------------|---------|
| `request.timeout.ms` | Time to wait for broker response | 30000 |
| `delivery.timeout.ms` | Total time for message delivery | 120000 |
| `max.block.ms` | Time to block on send() and partitionsFor() | 60000 |
| `metadata.max.age.ms` | Time before metadata refresh | 300000 |

## Diagnosing the Problem

### Check Network Connectivity

```bash
# Test connection to brokers
nc -zv broker1.example.com 9092
nc -zv broker2.example.com 9092
nc -zv broker3.example.com 9092

# Check DNS resolution
nslookup broker1.example.com

# Test latency
ping broker1.example.com

# Check for packet loss
mtr --report broker1.example.com
```

### Check Broker Health

```bash
# Verify broker is responding
kafka-broker-api-versions.sh --bootstrap-server localhost:9092

# Check broker logs for errors
grep -i "error\|exception\|timeout" /var/log/kafka/server.log | tail -50

# Check broker metrics
kafka-run-class.sh kafka.tools.JmxTool \
  --object-name kafka.server:type=BrokerTopicMetrics,name=MessagesInPerSec \
  --jmx-url service:jmx:rmi:///jndi/rmi://localhost:9999/jmxrmi
```

### Check Topic and Partition Status

```bash
# Describe topic
kafka-topics.sh --describe --topic my-topic --bootstrap-server localhost:9092

# Check for under-replicated partitions
kafka-topics.sh --describe --under-replicated-partitions \
  --bootstrap-server localhost:9092

# Check offline partitions
kafka-topics.sh --describe --unavailable-partitions \
  --bootstrap-server localhost:9092
```

## Java Solutions

### Timeout-Resilient Producer

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.errors.TimeoutException;
import org.apache.kafka.common.errors.RetriableException;

import java.util.*;
import java.util.concurrent.*;

public class TimeoutResilientProducer {

    private final KafkaProducer<String, String> producer;
    private final int maxRetries;
    private final long retryBackoffMs;

    public TimeoutResilientProducer(String bootstrapServers) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");

        // Timeout configuration
        props.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 30000);
        props.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 120000);
        props.put(ProducerConfig.MAX_BLOCK_MS_CONFIG, 60000);
        props.put(ProducerConfig.METADATA_MAX_AGE_CONFIG, 60000);

        // Retry configuration
        props.put(ProducerConfig.RETRIES_CONFIG, 5);
        props.put(ProducerConfig.RETRY_BACKOFF_MS_CONFIG, 100);

        // Batch and linger settings
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);
        props.put(ProducerConfig.LINGER_MS_CONFIG, 10);

        // Connection settings
        props.put(ProducerConfig.CONNECTIONS_MAX_IDLE_MS_CONFIG, 540000);
        props.put(ProducerConfig.RECONNECT_BACKOFF_MS_CONFIG, 50);
        props.put(ProducerConfig.RECONNECT_BACKOFF_MAX_MS_CONFIG, 1000);

        this.producer = new KafkaProducer<>(props);
        this.maxRetries = 5;
        this.retryBackoffMs = 1000;
    }

    public CompletableFuture<RecordMetadata> sendAsync(String topic, String key, String value) {
        CompletableFuture<RecordMetadata> future = new CompletableFuture<>();
        ProducerRecord<String, String> record = new ProducerRecord<>(topic, key, value);

        producer.send(record, (metadata, exception) -> {
            if (exception == null) {
                future.complete(metadata);
            } else {
                future.completeExceptionally(exception);
            }
        });

        return future;
    }

    public RecordMetadata sendWithRetry(String topic, String key, String value)
            throws Exception {
        int attempts = 0;
        Exception lastException = null;

        while (attempts < maxRetries) {
            try {
                ProducerRecord<String, String> record = new ProducerRecord<>(topic, key, value);
                return producer.send(record).get(60, TimeUnit.SECONDS);

            } catch (ExecutionException e) {
                lastException = e;
                Throwable cause = e.getCause();

                if (isRetriable(cause)) {
                    attempts++;
                    System.out.printf("Attempt %d failed: %s. Retrying...%n",
                        attempts, cause.getMessage());

                    handleTimeout(topic, cause);
                    Thread.sleep(retryBackoffMs * attempts);
                } else {
                    throw e;
                }
            } catch (java.util.concurrent.TimeoutException e) {
                lastException = e;
                attempts++;
                System.out.printf("Send timeout (attempt %d). Retrying...%n", attempts);
                Thread.sleep(retryBackoffMs * attempts);
            }
        }

        throw new RuntimeException("Max retries exceeded", lastException);
    }

    private boolean isRetriable(Throwable cause) {
        return cause instanceof TimeoutException
            || cause instanceof RetriableException;
    }

    private void handleTimeout(String topic, Throwable cause) {
        System.out.println("Handling timeout: " + cause.getMessage());

        // Force metadata refresh
        producer.partitionsFor(topic);

        // Log diagnostic information
        logDiagnostics(topic);
    }

    private void logDiagnostics(String topic) {
        try {
            // Log partition info
            producer.partitionsFor(topic).forEach(info -> {
                System.out.printf("Partition %d: leader=%s, replicas=%s, isr=%s%n",
                    info.partition(),
                    info.leader(),
                    Arrays.toString(info.replicas()),
                    Arrays.toString(info.inSyncReplicas()));
            });
        } catch (Exception e) {
            System.err.println("Failed to get partition info: " + e.getMessage());
        }
    }

    public void close() {
        producer.close(Duration.ofSeconds(30));
    }
}
```

### Batch Producer with Timeout Handling

```java
import org.apache.kafka.clients.producer.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class BatchProducerWithTimeoutHandling {

    private final KafkaProducer<String, String> producer;
    private final BlockingQueue<ProducerRecord<String, String>> buffer;
    private final int batchSize;
    private final long flushIntervalMs;
    private final ExecutorService executor;
    private volatile boolean running = true;

    public BatchProducerWithTimeoutHandling(String bootstrapServers,
            int batchSize, long flushIntervalMs) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");

        // Optimize for batch sending
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 65536);
        props.put(ProducerConfig.LINGER_MS_CONFIG, 50);
        props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 67108864);

        // Timeout settings
        props.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 30000);
        props.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 120000);

        this.producer = new KafkaProducer<>(props);
        this.buffer = new LinkedBlockingQueue<>(10000);
        this.batchSize = batchSize;
        this.flushIntervalMs = flushIntervalMs;
        this.executor = Executors.newSingleThreadExecutor();

        startBatchSender();
    }

    public void send(String topic, String key, String value) {
        ProducerRecord<String, String> record = new ProducerRecord<>(topic, key, value);
        try {
            if (!buffer.offer(record, 5, TimeUnit.SECONDS)) {
                System.err.println("Buffer full, sending directly");
                sendDirect(record);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private void sendDirect(ProducerRecord<String, String> record) {
        producer.send(record, (metadata, exception) -> {
            if (exception != null) {
                handleSendFailure(record, exception);
            }
        });
    }

    private void startBatchSender() {
        executor.submit(() -> {
            List<ProducerRecord<String, String>> batch = new ArrayList<>();
            long lastFlush = System.currentTimeMillis();

            while (running) {
                try {
                    ProducerRecord<String, String> record =
                        buffer.poll(100, TimeUnit.MILLISECONDS);

                    if (record != null) {
                        batch.add(record);
                    }

                    boolean shouldFlush = batch.size() >= batchSize
                        || (System.currentTimeMillis() - lastFlush) >= flushIntervalMs;

                    if (shouldFlush && !batch.isEmpty()) {
                        sendBatch(batch);
                        batch.clear();
                        lastFlush = System.currentTimeMillis();
                    }

                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        });
    }

    private void sendBatch(List<ProducerRecord<String, String>> batch) {
        AtomicInteger failures = new AtomicInteger(0);
        CountDownLatch latch = new CountDownLatch(batch.size());

        for (ProducerRecord<String, String> record : batch) {
            producer.send(record, (metadata, exception) -> {
                if (exception != null) {
                    failures.incrementAndGet();
                    handleSendFailure(record, exception);
                }
                latch.countDown();
            });
        }

        try {
            // Wait for batch with timeout
            if (!latch.await(60, TimeUnit.SECONDS)) {
                System.err.println("Batch send timeout");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        if (failures.get() > 0) {
            System.out.printf("Batch completed with %d failures%n", failures.get());
        }
    }

    private void handleSendFailure(ProducerRecord<String, String> record, Exception e) {
        System.err.printf("Failed to send %s: %s%n", record.key(), e.getMessage());
        // Could implement: retry queue, dead letter queue, metrics
    }

    public void close() {
        running = false;
        executor.shutdown();
        producer.close(Duration.ofSeconds(30));
    }
}
```

### Producer Metrics Monitor

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.Metric;
import org.apache.kafka.common.MetricName;

import java.util.*;
import java.util.concurrent.*;

public class ProducerMetricsMonitor {

    private final KafkaProducer<String, String> producer;
    private final ScheduledExecutorService scheduler;

    public ProducerMetricsMonitor(KafkaProducer<String, String> producer) {
        this.producer = producer;
        this.scheduler = Executors.newScheduledThreadPool(1);
    }

    public void startMonitoring(long intervalSeconds) {
        scheduler.scheduleAtFixedRate(this::logMetrics, 0, intervalSeconds, TimeUnit.SECONDS);
    }

    private void logMetrics() {
        Map<MetricName, ? extends Metric> metrics = producer.metrics();

        // Key metrics for timeout diagnosis
        String[] importantMetrics = {
            "request-latency-avg",
            "request-latency-max",
            "record-send-rate",
            "record-error-rate",
            "record-retry-rate",
            "batch-size-avg",
            "buffer-available-bytes",
            "bufferpool-wait-time-total",
            "waiting-threads",
            "connection-count",
            "outgoing-byte-rate"
        };

        System.out.println("\n=== Producer Metrics ===");
        for (Map.Entry<MetricName, ? extends Metric> entry : metrics.entrySet()) {
            String name = entry.getKey().name();
            for (String important : importantMetrics) {
                if (name.equals(important)) {
                    Object value = entry.getValue().metricValue();
                    System.out.printf("%s: %s%n", name, value);
                }
            }
        }

        // Alert on concerning metrics
        checkForIssues(metrics);
    }

    private void checkForIssues(Map<MetricName, ? extends Metric> metrics) {
        for (Map.Entry<MetricName, ? extends Metric> entry : metrics.entrySet()) {
            String name = entry.getKey().name();
            Object value = entry.getValue().metricValue();

            if (value instanceof Double) {
                double doubleValue = (Double) value;

                if (name.equals("request-latency-avg") && doubleValue > 1000) {
                    System.out.println("WARNING: High average request latency: " + doubleValue);
                }

                if (name.equals("record-error-rate") && doubleValue > 0.01) {
                    System.out.println("WARNING: High error rate: " + doubleValue);
                }

                if (name.equals("buffer-available-bytes") && doubleValue < 1000000) {
                    System.out.println("WARNING: Low buffer available: " + doubleValue);
                }
            }
        }
    }

    public void stop() {
        scheduler.shutdown();
    }
}
```

## Python Solutions

```python
from confluent_kafka import Producer, KafkaError, KafkaException
import time
from typing import Dict, Any, Optional, Callable
import threading
from collections import deque
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TimeoutResilientProducer:
    """Producer with comprehensive timeout handling"""

    def __init__(self, bootstrap_servers: str, max_retries: int = 5):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            # Timeout settings
            'request.timeout.ms': 30000,
            'message.timeout.ms': 120000,
            'socket.timeout.ms': 60000,
            'metadata.max.age.ms': 60000,
            # Retry settings
            'message.send.max.retries': max_retries,
            'retry.backoff.ms': 100,
            # Buffer settings
            'queue.buffering.max.messages': 100000,
            'queue.buffering.max.ms': 50,
            'batch.num.messages': 10000,
            # Connection settings
            'connections.max.idle.ms': 540000,
            'reconnect.backoff.ms': 50,
            'reconnect.backoff.max.ms': 1000
        }
        self.producer = Producer(self.config)
        self.max_retries = max_retries
        self.retry_backoff = 1.0
        self.failed_messages = deque(maxlen=1000)

    def send(self, topic: str, key: str, value: str,
             callback: Optional[Callable] = None):
        """Send message with delivery callback"""
        def delivery_callback(err, msg):
            if err:
                logger.error(f"Delivery failed: {err}")
                self.failed_messages.append({
                    'topic': topic,
                    'key': key,
                    'value': value,
                    'error': str(err)
                })
                if callback:
                    callback(err, None)
            else:
                logger.debug(f"Delivered to {msg.topic()}[{msg.partition()}]")
                if callback:
                    callback(None, msg)

        try:
            self.producer.produce(
                topic,
                key=key.encode('utf-8') if key else None,
                value=value.encode('utf-8'),
                callback=delivery_callback
            )
            self.producer.poll(0)
        except BufferError:
            logger.warning("Buffer full, flushing...")
            self.producer.flush(timeout=30)
            self.producer.produce(
                topic,
                key=key.encode('utf-8') if key else None,
                value=value.encode('utf-8'),
                callback=delivery_callback
            )

    def send_with_retry(self, topic: str, key: str, value: str) -> bool:
        """Send with manual retry logic"""
        attempts = 0
        success = False

        while attempts < self.max_retries and not success:
            try:
                self.producer.produce(
                    topic,
                    key=key.encode('utf-8') if key else None,
                    value=value.encode('utf-8')
                )

                # Wait for delivery with timeout
                remaining = self.producer.flush(timeout=30)
                if remaining > 0:
                    raise Exception(f"{remaining} messages still in queue")

                success = True

            except Exception as e:
                attempts += 1
                logger.warning(f"Attempt {attempts} failed: {e}")

                if attempts < self.max_retries:
                    self._handle_timeout(topic)
                    time.sleep(self.retry_backoff * attempts)

        return success

    def _handle_timeout(self, topic: str):
        """Handle timeout by refreshing metadata"""
        logger.info("Refreshing metadata...")
        try:
            metadata = self.producer.list_topics(topic, timeout=10)
            logger.info(f"Topic metadata: {metadata.topics}")
        except Exception as e:
            logger.error(f"Metadata refresh failed: {e}")

    def get_failed_messages(self):
        """Get list of failed messages for retry or dead letter"""
        return list(self.failed_messages)

    def flush(self, timeout: float = 30):
        """Flush with timeout"""
        return self.producer.flush(timeout=timeout)

    def close(self):
        """Close producer"""
        self.producer.flush(timeout=30)


class ProducerMetricsCollector:
    """Collects and monitors producer metrics"""

    def __init__(self, producer: Producer):
        self.producer = producer
        self.running = False
        self.metrics_history = deque(maxlen=100)

    def collect_metrics(self) -> Dict[str, Any]:
        """Collect current metrics"""
        # Note: confluent-kafka doesn't expose all metrics directly
        # This is a simplified version
        metrics = {
            'timestamp': time.time(),
            'queue_length': len(self.producer),
        }
        return metrics

    def start_monitoring(self, interval_seconds: float = 10):
        """Start background monitoring"""
        self.running = True

        def monitor_loop():
            while self.running:
                metrics = self.collect_metrics()
                self.metrics_history.append(metrics)

                # Check for issues
                self._check_for_issues(metrics)

                time.sleep(interval_seconds)

        thread = threading.Thread(target=monitor_loop, daemon=True)
        thread.start()

    def _check_for_issues(self, metrics: Dict[str, Any]):
        """Alert on potential issues"""
        queue_length = metrics.get('queue_length', 0)

        if queue_length > 10000:
            logger.warning(f"High queue length: {queue_length}")

    def stop_monitoring(self):
        self.running = False


class BatchProducer:
    """Batch producer with timeout handling"""

    def __init__(self, bootstrap_servers: str, batch_size: int = 100,
                 flush_interval_seconds: float = 5):
        self.producer = Producer({
            'bootstrap.servers': bootstrap_servers,
            'batch.num.messages': batch_size,
            'queue.buffering.max.ms': int(flush_interval_seconds * 1000),
            'message.timeout.ms': 120000
        })
        self.batch_size = batch_size
        self.flush_interval = flush_interval_seconds
        self.buffer = []
        self.running = False
        self.lock = threading.Lock()

    def send(self, topic: str, key: str, value: str):
        """Buffer message for batch sending"""
        with self.lock:
            self.buffer.append((topic, key, value))

            if len(self.buffer) >= self.batch_size:
                self._flush_buffer()

    def _flush_buffer(self):
        """Flush buffered messages"""
        if not self.buffer:
            return

        for topic, key, value in self.buffer:
            self.producer.produce(
                topic,
                key=key.encode('utf-8') if key else None,
                value=value.encode('utf-8'),
                callback=self._delivery_callback
            )

        self.buffer.clear()

        # Flush with timeout
        remaining = self.producer.flush(timeout=30)
        if remaining > 0:
            logger.warning(f"Flush timeout: {remaining} messages pending")

    def _delivery_callback(self, err, msg):
        if err:
            logger.error(f"Delivery failed: {err}")

    def start_auto_flush(self):
        """Start background flush thread"""
        self.running = True

        def flush_loop():
            while self.running:
                time.sleep(self.flush_interval)
                with self.lock:
                    self._flush_buffer()

        thread = threading.Thread(target=flush_loop, daemon=True)
        thread.start()

    def stop(self):
        self.running = False
        with self.lock:
            self._flush_buffer()


# Example usage
def main():
    bootstrap_servers = "localhost:9092"

    # Create resilient producer
    producer = TimeoutResilientProducer(bootstrap_servers)

    # Send messages
    for i in range(100):
        success = producer.send_with_retry(
            topic="test-topic",
            key=f"key-{i}",
            value=f"value-{i}"
        )
        if not success:
            logger.error(f"Failed to send message {i}")

    # Check for failures
    failed = producer.get_failed_messages()
    if failed:
        logger.warning(f"Failed messages: {len(failed)}")

    producer.close()


if __name__ == '__main__':
    main()
```

## Configuration Tuning

### For High Latency Networks

```properties
# Increase timeouts
request.timeout.ms=60000
delivery.timeout.ms=300000
max.block.ms=120000

# Increase retry attempts
retries=10
retry.backoff.ms=500

# Larger batches to amortize latency
batch.size=65536
linger.ms=100
```

### For High Throughput

```properties
# Buffer settings
buffer.memory=134217728
batch.size=65536
linger.ms=50

# Compression
compression.type=lz4

# Lower acks for speed (if acceptable)
acks=1
```

## Troubleshooting Checklist

1. **Network issues**: Check connectivity, DNS, firewall rules
2. **Broker health**: Verify brokers are up and responding
3. **Topic exists**: Ensure topic is created and has leaders
4. **Configuration**: Review timeout and retry settings
5. **Resource limits**: Check client memory and connection limits
6. **Broker load**: Monitor broker CPU, memory, and disk I/O

## Conclusion

Producer timeout errors often indicate network issues, broker problems, or misconfiguration. By implementing proper retry logic, monitoring metrics, and tuning configurations, you can build resilient producers that handle transient failures gracefully.
