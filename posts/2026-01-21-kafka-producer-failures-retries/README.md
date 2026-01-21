# How to Handle Kafka Producer Failures and Retries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Producer, Error Handling, Retries, Fault Tolerance, Reliability, Java, Python

Description: A comprehensive guide to handling Kafka producer failures and implementing robust retry strategies, covering transient errors, configuration options, custom error handlers, and dead letter patterns.

---

Kafka producers can encounter various failures when sending messages. Understanding these failures and implementing proper retry strategies is essential for building reliable message-driven applications. This guide covers error types, retry configurations, and advanced error handling patterns.

## Types of Producer Failures

### Retriable Errors

These errors are temporary and can be resolved by retrying:

- **NetworkException**: Network connectivity issues
- **NotLeaderOrFollowerException**: Broker metadata is stale
- **LeaderNotAvailableException**: Partition leader election in progress
- **TimeoutException**: Request timed out
- **NotEnoughReplicasException**: Not enough replicas available

### Non-Retriable Errors

These errors require intervention and cannot be resolved by retrying:

- **SerializationException**: Message serialization failed
- **RecordTooLargeException**: Message exceeds max size
- **InvalidTopicException**: Topic name is invalid
- **AuthorizationException**: Producer not authorized
- **ProducerFencedException**: Another producer with same transactional ID

## Basic Retry Configuration

### Java Producer Retry Settings

```java
import org.apache.kafka.clients.producer.*;
import java.util.Properties;

public class RetryConfiguredProducer {
    public static Producer<String, String> createProducer(String bootstrapServers) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");

        // Retry configuration
        props.put(ProducerConfig.RETRIES_CONFIG, 10);
        props.put(ProducerConfig.RETRY_BACKOFF_MS_CONFIG, 100);

        // Delivery timeout (total time for retries)
        props.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 120000);

        // Request timeout (individual request)
        props.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 30000);

        // Acknowledgment level affects retry behavior
        props.put(ProducerConfig.ACKS_CONFIG, "all");

        // Enable idempotence to prevent duplicates during retries
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        // In-flight requests - set to 1 for strict ordering with retries
        // or use idempotent producer which handles this automatically
        props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);

        return new KafkaProducer<>(props);
    }
}
```

### Python Producer Retry Settings

```python
from confluent_kafka import Producer

def create_retry_producer(bootstrap_servers):
    config = {
        'bootstrap.servers': bootstrap_servers,
        # Retry configuration
        'retries': 10,
        'retry.backoff.ms': 100,
        # Delivery timeout
        'delivery.timeout.ms': 120000,
        # Request timeout
        'request.timeout.ms': 30000,
        # Acknowledgments
        'acks': 'all',
        # Idempotence
        'enable.idempotence': True,
    }
    return Producer(config)
```

## Error Handling with Callbacks

### Java Error Handling

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.errors.*;
import java.util.Properties;
import java.util.concurrent.atomic.AtomicLong;

public class ErrorHandlingProducer {
    private final Producer<String, String> producer;
    private final AtomicLong successCount = new AtomicLong(0);
    private final AtomicLong retriableErrorCount = new AtomicLong(0);
    private final AtomicLong fatalErrorCount = new AtomicLong(0);

    public ErrorHandlingProducer(String bootstrapServers) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.RETRIES_CONFIG, 10);
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        this.producer = new KafkaProducer<>(props);
    }

    public void send(String topic, String key, String value) {
        ProducerRecord<String, String> record =
            new ProducerRecord<>(topic, key, value);

        producer.send(record, (metadata, exception) -> {
            if (exception == null) {
                successCount.incrementAndGet();
                System.out.printf("Sent to %s-%d @ offset %d%n",
                    metadata.topic(), metadata.partition(), metadata.offset());
            } else {
                handleError(record, exception);
            }
        });
    }

    private void handleError(ProducerRecord<String, String> record,
                            Exception exception) {
        if (isRetriable(exception)) {
            retriableErrorCount.incrementAndGet();
            System.err.println("Retriable error (exhausted retries): " +
                exception.getMessage());
            // Log for manual retry or send to dead letter queue
            sendToDeadLetterQueue(record, exception);
        } else {
            fatalErrorCount.incrementAndGet();
            System.err.println("Fatal error: " + exception.getMessage());
            handleFatalError(record, exception);
        }
    }

    private boolean isRetriable(Exception e) {
        return e instanceof TimeoutException ||
               e instanceof NotLeaderOrFollowerException ||
               e instanceof LeaderNotAvailableException ||
               e instanceof NotEnoughReplicasException ||
               e instanceof NetworkException;
    }

    private void sendToDeadLetterQueue(ProducerRecord<String, String> record,
                                       Exception exception) {
        // Send to DLQ topic
        String dlqTopic = record.topic() + "-dlq";
        ProducerRecord<String, String> dlqRecord = new ProducerRecord<>(
            dlqTopic,
            record.key(),
            record.value()
        );
        dlqRecord.headers().add("error", exception.getMessage().getBytes());
        dlqRecord.headers().add("original-topic", record.topic().getBytes());

        producer.send(dlqRecord, (metadata, ex) -> {
            if (ex != null) {
                System.err.println("Failed to send to DLQ: " + ex.getMessage());
            }
        });
    }

    private void handleFatalError(ProducerRecord<String, String> record,
                                  Exception exception) {
        if (exception instanceof RecordTooLargeException) {
            System.err.println("Record too large. Consider chunking: " +
                record.value().length() + " bytes");
        } else if (exception instanceof SerializationException) {
            System.err.println("Serialization failed. Check data format.");
        } else if (exception instanceof AuthorizationException) {
            System.err.println("Authorization failed. Check ACLs.");
        }
        // Log to error tracking system
        logError(record, exception);
    }

    private void logError(ProducerRecord<String, String> record,
                         Exception exception) {
        // Log to external system (e.g., Sentry, CloudWatch)
        System.err.printf("ERROR: topic=%s, key=%s, error=%s%n",
            record.topic(), record.key(), exception.getClass().getName());
    }

    public void printStats() {
        System.out.printf("Success: %d, Retriable Errors: %d, Fatal Errors: %d%n",
            successCount.get(), retriableErrorCount.get(), fatalErrorCount.get());
    }

    public void close() {
        producer.close();
    }
}
```

### Python Error Handling

```python
from confluent_kafka import Producer, KafkaException, KafkaError
import json
from dataclasses import dataclass
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class MessageStats:
    success: int = 0
    retriable_errors: int = 0
    fatal_errors: int = 0


class ErrorHandlingProducer:
    RETRIABLE_ERRORS = {
        KafkaError._TIMED_OUT,
        KafkaError.REQUEST_TIMED_OUT,
        KafkaError.NOT_LEADER_FOR_PARTITION,
        KafkaError.LEADER_NOT_AVAILABLE,
        KafkaError.NOT_ENOUGH_REPLICAS,
        KafkaError._TRANSPORT,
    }

    def __init__(self, bootstrap_servers):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            'retries': 10,
            'retry.backoff.ms': 100,
            'acks': 'all',
            'enable.idempotence': True,
        }
        self.producer = Producer(self.config)
        self.stats = MessageStats()
        self.failed_messages = []

    def delivery_callback(self, err, msg):
        if err is None:
            self.stats.success += 1
            logger.info(f"Delivered to {msg.topic()}[{msg.partition()}] @ {msg.offset()}")
        else:
            self._handle_error(err, msg)

    def _handle_error(self, err, msg):
        if self._is_retriable(err):
            self.stats.retriable_errors += 1
            logger.warning(f"Retriable error (exhausted): {err}")
            self._send_to_dlq(msg, err)
        else:
            self.stats.fatal_errors += 1
            logger.error(f"Fatal error: {err}")
            self._handle_fatal_error(msg, err)

    def _is_retriable(self, err):
        return err.code() in self.RETRIABLE_ERRORS

    def _send_to_dlq(self, msg, err):
        dlq_topic = f"{msg.topic()}-dlq"
        headers = [
            ('error', str(err).encode()),
            ('original-topic', msg.topic().encode()),
        ]
        try:
            self.producer.produce(
                dlq_topic,
                key=msg.key(),
                value=msg.value(),
                headers=headers
            )
        except Exception as e:
            logger.error(f"Failed to send to DLQ: {e}")
            self.failed_messages.append({
                'topic': msg.topic(),
                'key': msg.key(),
                'value': msg.value(),
                'error': str(err)
            })

    def _handle_fatal_error(self, msg, err):
        error_code = err.code()

        if error_code == KafkaError.MSG_SIZE_TOO_LARGE:
            logger.error(f"Message too large: {len(msg.value())} bytes")
        elif error_code == KafkaError.TOPIC_AUTHORIZATION_FAILED:
            logger.error(f"Authorization failed for topic: {msg.topic()}")
        elif error_code == KafkaError.INVALID_MSG:
            logger.error("Invalid message format")

        self.failed_messages.append({
            'topic': msg.topic(),
            'key': msg.key(),
            'value': msg.value(),
            'error': str(err)
        })

    def send(self, topic, key, value):
        try:
            self.producer.produce(
                topic,
                key=key,
                value=json.dumps(value) if isinstance(value, dict) else value,
                callback=self.delivery_callback
            )
        except BufferError:
            logger.warning("Buffer full, waiting...")
            self.producer.poll(1)
            self.send(topic, key, value)  # Retry
        except KafkaException as e:
            logger.error(f"Producer error: {e}")
            raise

    def flush(self):
        self.producer.flush()

    def get_stats(self):
        return {
            'success': self.stats.success,
            'retriable_errors': self.stats.retriable_errors,
            'fatal_errors': self.stats.fatal_errors,
            'failed_messages': len(self.failed_messages)
        }


def main():
    producer = ErrorHandlingProducer('localhost:9092')

    for i in range(100):
        producer.send('test-topic', f'key-{i}', {'id': i, 'data': f'message-{i}'})
        producer.producer.poll(0)

    producer.flush()
    print(f"Stats: {producer.get_stats()}")


if __name__ == '__main__':
    main()
```

## Custom Retry Logic

### Java Custom Retry with Backoff

```java
import org.apache.kafka.clients.producer.*;
import java.util.Properties;
import java.util.concurrent.*;

public class CustomRetryProducer {
    private final Producer<String, String> producer;
    private final ScheduledExecutorService scheduler;
    private final int maxRetries;
    private final long initialBackoffMs;
    private final double backoffMultiplier;

    public CustomRetryProducer(String bootstrapServers) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        // Disable built-in retries to handle manually
        props.put(ProducerConfig.RETRIES_CONFIG, 0);
        props.put(ProducerConfig.ACKS_CONFIG, "all");

        this.producer = new KafkaProducer<>(props);
        this.scheduler = Executors.newScheduledThreadPool(2);
        this.maxRetries = 5;
        this.initialBackoffMs = 100;
        this.backoffMultiplier = 2.0;
    }

    public CompletableFuture<RecordMetadata> sendWithRetry(
            String topic, String key, String value) {
        return sendWithRetry(topic, key, value, 0);
    }

    private CompletableFuture<RecordMetadata> sendWithRetry(
            String topic, String key, String value, int attempt) {

        CompletableFuture<RecordMetadata> future = new CompletableFuture<>();
        ProducerRecord<String, String> record =
            new ProducerRecord<>(topic, key, value);

        producer.send(record, (metadata, exception) -> {
            if (exception == null) {
                future.complete(metadata);
            } else if (isRetriable(exception) && attempt < maxRetries) {
                long backoff = calculateBackoff(attempt);
                System.out.printf("Retry %d after %d ms: %s%n",
                    attempt + 1, backoff, exception.getMessage());

                scheduler.schedule(() -> {
                    sendWithRetry(topic, key, value, attempt + 1)
                        .whenComplete((m, e) -> {
                            if (e != null) {
                                future.completeExceptionally(e);
                            } else {
                                future.complete(m);
                            }
                        });
                }, backoff, TimeUnit.MILLISECONDS);
            } else {
                future.completeExceptionally(exception);
            }
        });

        return future;
    }

    private boolean isRetriable(Exception e) {
        return e instanceof org.apache.kafka.common.errors.TimeoutException ||
               e instanceof org.apache.kafka.common.errors.NotLeaderOrFollowerException ||
               e instanceof org.apache.kafka.common.errors.RetriableException;
    }

    private long calculateBackoff(int attempt) {
        return (long) (initialBackoffMs * Math.pow(backoffMultiplier, attempt));
    }

    public void close() {
        scheduler.shutdown();
        producer.close();
    }

    public static void main(String[] args) throws Exception {
        CustomRetryProducer producer = new CustomRetryProducer("localhost:9092");

        CompletableFuture<RecordMetadata> future =
            producer.sendWithRetry("test-topic", "key", "value");

        future.whenComplete((metadata, exception) -> {
            if (exception != null) {
                System.err.println("Send failed after all retries: " +
                    exception.getMessage());
            } else {
                System.out.println("Sent successfully: " + metadata);
            }
        });

        Thread.sleep(5000);
        producer.close();
    }
}
```

### Python Custom Retry with Backoff

```python
from confluent_kafka import Producer
import json
import time
import asyncio
from typing import Optional, Callable
import logging

logger = logging.getLogger(__name__)


class CustomRetryProducer:
    def __init__(self, bootstrap_servers, max_retries=5,
                 initial_backoff_ms=100, backoff_multiplier=2.0):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            'retries': 0,  # Disable built-in retries
            'acks': 'all',
        }
        self.producer = Producer(self.config)
        self.max_retries = max_retries
        self.initial_backoff_ms = initial_backoff_ms
        self.backoff_multiplier = backoff_multiplier

    def _is_retriable(self, err):
        from confluent_kafka import KafkaError
        retriable_codes = {
            KafkaError._TIMED_OUT,
            KafkaError.REQUEST_TIMED_OUT,
            KafkaError.NOT_LEADER_FOR_PARTITION,
            KafkaError.LEADER_NOT_AVAILABLE,
        }
        return err.code() in retriable_codes

    def _calculate_backoff(self, attempt):
        return self.initial_backoff_ms * (self.backoff_multiplier ** attempt) / 1000

    def send_with_retry(self, topic, key, value,
                        on_success: Optional[Callable] = None,
                        on_failure: Optional[Callable] = None):
        """Synchronous send with retry."""

        def attempt_send(attempt):
            result = {'success': False, 'metadata': None, 'error': None}

            def delivery_callback(err, msg):
                if err is None:
                    result['success'] = True
                    result['metadata'] = {
                        'topic': msg.topic(),
                        'partition': msg.partition(),
                        'offset': msg.offset()
                    }
                else:
                    result['error'] = err

            try:
                self.producer.produce(
                    topic,
                    key=key,
                    value=json.dumps(value) if isinstance(value, dict) else value,
                    callback=delivery_callback
                )
                self.producer.flush()

                if result['success']:
                    if on_success:
                        on_success(result['metadata'])
                    return result['metadata']

                err = result['error']
                if self._is_retriable(err) and attempt < self.max_retries:
                    backoff = self._calculate_backoff(attempt)
                    logger.warning(f"Retry {attempt + 1} after {backoff:.2f}s: {err}")
                    time.sleep(backoff)
                    return attempt_send(attempt + 1)
                else:
                    if on_failure:
                        on_failure(err)
                    raise Exception(f"Send failed after {attempt + 1} attempts: {err}")

            except Exception as e:
                if attempt < self.max_retries:
                    backoff = self._calculate_backoff(attempt)
                    logger.warning(f"Retry {attempt + 1} after {backoff:.2f}s: {e}")
                    time.sleep(backoff)
                    return attempt_send(attempt + 1)
                raise

        return attempt_send(0)

    async def send_with_retry_async(self, topic, key, value):
        """Async send with retry."""
        for attempt in range(self.max_retries + 1):
            try:
                result = await self._async_produce(topic, key, value)
                return result
            except Exception as e:
                if attempt < self.max_retries:
                    backoff = self._calculate_backoff(attempt)
                    logger.warning(f"Retry {attempt + 1} after {backoff:.2f}s: {e}")
                    await asyncio.sleep(backoff)
                else:
                    raise

    async def _async_produce(self, topic, key, value):
        loop = asyncio.get_event_loop()
        future = loop.create_future()

        def callback(err, msg):
            if err:
                loop.call_soon_threadsafe(
                    future.set_exception, Exception(str(err)))
            else:
                loop.call_soon_threadsafe(
                    future.set_result, {
                        'topic': msg.topic(),
                        'partition': msg.partition(),
                        'offset': msg.offset()
                    })

        self.producer.produce(
            topic,
            key=key,
            value=json.dumps(value) if isinstance(value, dict) else value,
            callback=callback
        )
        self.producer.poll(0)

        return await future


def main():
    producer = CustomRetryProducer('localhost:9092')

    # Sync send
    try:
        result = producer.send_with_retry(
            'test-topic',
            'key-1',
            {'id': 1, 'data': 'test'}
        )
        print(f"Sent: {result}")
    except Exception as e:
        print(f"Failed: {e}")


if __name__ == '__main__':
    main()
```

## Dead Letter Queue Pattern

### Java DLQ Implementation

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.header.internals.RecordHeader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

public class DeadLetterQueueProducer {
    private final Producer<String, String> producer;
    private final String dlqTopicSuffix;

    public DeadLetterQueueProducer(String bootstrapServers) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        this.producer = new KafkaProducer<>(props);
        this.dlqTopicSuffix = "-dlq";
    }

    public void send(String topic, String key, String value) {
        ProducerRecord<String, String> record =
            new ProducerRecord<>(topic, key, value);

        producer.send(record, (metadata, exception) -> {
            if (exception != null) {
                sendToDeadLetterQueue(record, exception, 0);
            }
        });
    }

    private void sendToDeadLetterQueue(
            ProducerRecord<String, String> originalRecord,
            Exception exception,
            int retryCount) {

        String dlqTopic = originalRecord.topic() + dlqTopicSuffix;

        ProducerRecord<String, String> dlqRecord = new ProducerRecord<>(
            dlqTopic,
            null,  // partition
            originalRecord.key(),
            originalRecord.value()
        );

        // Add metadata headers
        dlqRecord.headers()
            .add(new RecordHeader("original-topic",
                originalRecord.topic().getBytes(StandardCharsets.UTF_8)))
            .add(new RecordHeader("error-message",
                exception.getMessage().getBytes(StandardCharsets.UTF_8)))
            .add(new RecordHeader("error-class",
                exception.getClass().getName().getBytes(StandardCharsets.UTF_8)))
            .add(new RecordHeader("timestamp",
                Instant.now().toString().getBytes(StandardCharsets.UTF_8)))
            .add(new RecordHeader("retry-count",
                String.valueOf(retryCount).getBytes(StandardCharsets.UTF_8)));

        // Copy original headers
        if (originalRecord.headers() != null) {
            originalRecord.headers().forEach(header ->
                dlqRecord.headers().add(new RecordHeader(
                    "original-" + header.key(), header.value())));
        }

        producer.send(dlqRecord, (metadata, ex) -> {
            if (ex != null) {
                System.err.println("Failed to send to DLQ: " + ex.getMessage());
                // Log to file or external system as last resort
                logFailedMessage(originalRecord, exception);
            } else {
                System.out.println("Sent to DLQ: " + metadata);
            }
        });
    }

    private void logFailedMessage(ProducerRecord<String, String> record,
                                  Exception exception) {
        // Log to file or external monitoring system
        System.err.printf("CRITICAL: Failed to send to DLQ - topic=%s, key=%s, error=%s%n",
            record.topic(), record.key(), exception.getMessage());
    }

    public void close() {
        producer.close();
    }
}
```

## Circuit Breaker Pattern

```java
import org.apache.kafka.clients.producer.*;
import java.util.Properties;
import java.util.concurrent.atomic.*;

public class CircuitBreakerProducer {
    private final Producer<String, String> producer;
    private final AtomicInteger failureCount = new AtomicInteger(0);
    private final AtomicLong lastFailureTime = new AtomicLong(0);
    private final AtomicReference<State> state =
        new AtomicReference<>(State.CLOSED);

    private final int failureThreshold;
    private final long resetTimeoutMs;

    enum State { CLOSED, OPEN, HALF_OPEN }

    public CircuitBreakerProducer(String bootstrapServers,
                                  int failureThreshold,
                                  long resetTimeoutMs) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");

        this.producer = new KafkaProducer<>(props);
        this.failureThreshold = failureThreshold;
        this.resetTimeoutMs = resetTimeoutMs;
    }

    public void send(String topic, String key, String value)
            throws CircuitBreakerOpenException {

        if (!canSend()) {
            throw new CircuitBreakerOpenException("Circuit breaker is open");
        }

        ProducerRecord<String, String> record =
            new ProducerRecord<>(topic, key, value);

        producer.send(record, (metadata, exception) -> {
            if (exception != null) {
                recordFailure();
            } else {
                recordSuccess();
            }
        });
    }

    private boolean canSend() {
        State currentState = state.get();

        if (currentState == State.CLOSED) {
            return true;
        }

        if (currentState == State.OPEN) {
            long timeSinceLastFailure =
                System.currentTimeMillis() - lastFailureTime.get();

            if (timeSinceLastFailure >= resetTimeoutMs) {
                state.compareAndSet(State.OPEN, State.HALF_OPEN);
                return true;
            }
            return false;
        }

        // HALF_OPEN - allow one request
        return true;
    }

    private void recordFailure() {
        int failures = failureCount.incrementAndGet();
        lastFailureTime.set(System.currentTimeMillis());

        if (failures >= failureThreshold) {
            state.set(State.OPEN);
            System.out.println("Circuit breaker opened");
        }
    }

    private void recordSuccess() {
        failureCount.set(0);
        state.set(State.CLOSED);
    }

    public State getState() {
        return state.get();
    }

    public void close() {
        producer.close();
    }

    public static class CircuitBreakerOpenException extends Exception {
        public CircuitBreakerOpenException(String message) {
            super(message);
        }
    }
}
```

## Best Practices

### 1. Configure Appropriate Timeouts

```properties
# Total time to deliver a message
delivery.timeout.ms=120000

# Individual request timeout
request.timeout.ms=30000

# Metadata fetch timeout
metadata.max.age.ms=300000
```

### 2. Enable Idempotence

```properties
enable.idempotence=true
acks=all
max.in.flight.requests.per.connection=5
```

### 3. Monitor Producer Metrics

```java
// Key metrics to monitor
// record-error-rate
// record-retry-rate
// request-latency-avg
// bufferpool-wait-time-total
```

### 4. Implement Proper Shutdown

```java
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    producer.flush();
    producer.close(Duration.ofSeconds(30));
}));
```

## Conclusion

Handling Kafka producer failures requires a multi-layered approach:

1. **Configure built-in retries** for transient errors
2. **Implement custom retry logic** for specific requirements
3. **Use dead letter queues** for undeliverable messages
4. **Add circuit breakers** for system protection
5. **Monitor and alert** on error rates

By implementing these patterns, you can build resilient Kafka producers that gracefully handle failures while maintaining message delivery guarantees.
