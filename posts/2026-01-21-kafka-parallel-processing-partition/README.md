# How to Implement Parallel Processing per Partition in Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Parallel Processing, Consumer, Concurrency, Performance, Multi-threading, Java, Python

Description: A comprehensive guide to implementing parallel processing within Kafka partitions, covering thread pool strategies, ordering guarantees, concurrent message handling, and patterns for maximizing throughput while maintaining partition-level order.

---

While Kafka guarantees message ordering within a partition, sometimes you need to process messages concurrently for better throughput. This guide covers patterns for implementing parallel processing while understanding and managing ordering trade-offs.

## Understanding the Challenge

### Kafka's Ordering Guarantee

- Messages within a partition are ordered
- A single consumer thread processes one partition
- Parallel processing may break ordering

### When to Use Parallel Processing

- Processing is CPU-bound or I/O-bound
- Messages are independent within a partition
- Order can be restored later
- Throughput is more important than strict ordering

## Thread Pool per Consumer

The simplest approach - use a thread pool to process messages in parallel.

### Java Implementation

```java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.TopicPartition;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;

public class ThreadPoolConsumer {
    private final Consumer<String, String> consumer;
    private final ExecutorService executor;
    private final int parallelism;
    private final Map<TopicPartition, Long> pendingOffsets =
        new ConcurrentHashMap<>();
    private final Map<TopicPartition, Long> committedOffsets =
        new ConcurrentHashMap<>();

    public ThreadPoolConsumer(String bootstrapServers, String groupId,
                              int parallelism) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, parallelism * 2);
        props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 300000);

        this.consumer = new KafkaConsumer<>(props);
        this.executor = Executors.newFixedThreadPool(parallelism);
        this.parallelism = parallelism;
    }

    public void consume(String topic, MessageProcessor processor) {
        consumer.subscribe(Collections.singletonList(topic));

        try {
            while (true) {
                ConsumerRecords<String, String> records =
                    consumer.poll(Duration.ofMillis(100));

                if (records.isEmpty()) {
                    continue;
                }

                // Submit all records for parallel processing
                List<Future<ProcessingResult>> futures = new ArrayList<>();

                for (ConsumerRecord<String, String> record : records) {
                    Future<ProcessingResult> future = executor.submit(() -> {
                        try {
                            processor.process(record);
                            return new ProcessingResult(record, true, null);
                        } catch (Exception e) {
                            return new ProcessingResult(record, false, e);
                        }
                    });
                    futures.add(future);
                }

                // Wait for all to complete
                for (Future<ProcessingResult> future : futures) {
                    ProcessingResult result = future.get();
                    if (result.success) {
                        trackOffset(result.record);
                    } else {
                        handleError(result.record, result.error);
                    }
                }

                // Commit processed offsets
                commitOffsets();
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            executor.shutdown();
            consumer.close();
        }
    }

    private void trackOffset(ConsumerRecord<String, String> record) {
        TopicPartition tp = new TopicPartition(record.topic(), record.partition());
        pendingOffsets.merge(tp, record.offset(), Math::max);
    }

    private void commitOffsets() {
        Map<TopicPartition, OffsetAndMetadata> toCommit = new HashMap<>();

        for (Map.Entry<TopicPartition, Long> entry : pendingOffsets.entrySet()) {
            TopicPartition tp = entry.getKey();
            long offset = entry.getValue();
            Long committed = committedOffsets.get(tp);

            if (committed == null || offset > committed) {
                toCommit.put(tp, new OffsetAndMetadata(offset + 1));
                committedOffsets.put(tp, offset);
            }
        }

        if (!toCommit.isEmpty()) {
            consumer.commitSync(toCommit);
        }
    }

    private void handleError(ConsumerRecord<String, String> record, Exception e) {
        System.err.printf("Error processing record: partition=%d, offset=%d, error=%s%n",
            record.partition(), record.offset(), e.getMessage());
        // Send to DLQ or handle error
    }

    static class ProcessingResult {
        final ConsumerRecord<String, String> record;
        final boolean success;
        final Exception error;

        ProcessingResult(ConsumerRecord<String, String> record, boolean success,
                        Exception error) {
            this.record = record;
            this.success = success;
            this.error = error;
        }
    }

    interface MessageProcessor {
        void process(ConsumerRecord<String, String> record) throws Exception;
    }
}
```

## Partition-Level Thread Pools

Maintain ordering within partitions by using a separate queue per partition.

### Java Partition Queue Implementation

```java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.TopicPartition;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;

public class PartitionParallelConsumer {
    private final Consumer<String, String> consumer;
    private final Map<Integer, BlockingQueue<ConsumerRecord<String, String>>>
        partitionQueues = new ConcurrentHashMap<>();
    private final Map<Integer, PartitionProcessor> processors =
        new ConcurrentHashMap<>();
    private final ExecutorService executor;
    private volatile boolean running = true;

    public PartitionParallelConsumer(String bootstrapServers, String groupId,
                                     int partitionCount) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");

        this.consumer = new KafkaConsumer<>(props);
        this.executor = Executors.newFixedThreadPool(partitionCount);
    }

    public void consume(String topic, MessageProcessor processor) {
        consumer.subscribe(Collections.singletonList(topic),
            new ConsumerRebalanceListener() {
                @Override
                public void onPartitionsRevoked(Collection<TopicPartition> partitions) {
                    // Stop processors for revoked partitions
                    for (TopicPartition tp : partitions) {
                        PartitionProcessor pp = processors.remove(tp.partition());
                        if (pp != null) {
                            pp.stop();
                        }
                    }
                }

                @Override
                public void onPartitionsAssigned(Collection<TopicPartition> partitions) {
                    // Start processors for new partitions
                    for (TopicPartition tp : partitions) {
                        BlockingQueue<ConsumerRecord<String, String>> queue =
                            new LinkedBlockingQueue<>();
                        partitionQueues.put(tp.partition(), queue);

                        PartitionProcessor pp = new PartitionProcessor(
                            tp.partition(), queue, processor, consumer);
                        processors.put(tp.partition(), pp);
                        executor.submit(pp);
                    }
                }
            });

        try {
            while (running) {
                ConsumerRecords<String, String> records =
                    consumer.poll(Duration.ofMillis(100));

                for (ConsumerRecord<String, String> record : records) {
                    BlockingQueue<ConsumerRecord<String, String>> queue =
                        partitionQueues.get(record.partition());
                    if (queue != null) {
                        queue.put(record);
                    }
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            running = false;
            processors.values().forEach(PartitionProcessor::stop);
            executor.shutdown();
            consumer.close();
        }
    }

    public void shutdown() {
        running = false;
    }

    class PartitionProcessor implements Runnable {
        private final int partition;
        private final BlockingQueue<ConsumerRecord<String, String>> queue;
        private final MessageProcessor processor;
        private final Consumer<String, String> consumer;
        private volatile boolean running = true;
        private long lastCommittedOffset = -1;

        PartitionProcessor(int partition,
                          BlockingQueue<ConsumerRecord<String, String>> queue,
                          MessageProcessor processor,
                          Consumer<String, String> consumer) {
            this.partition = partition;
            this.queue = queue;
            this.processor = processor;
            this.consumer = consumer;
        }

        @Override
        public void run() {
            List<ConsumerRecord<String, String>> batch = new ArrayList<>();

            while (running) {
                try {
                    // Drain available records
                    ConsumerRecord<String, String> record =
                        queue.poll(100, TimeUnit.MILLISECONDS);

                    if (record != null) {
                        batch.add(record);
                        queue.drainTo(batch, 99);  // Get up to 100 total

                        // Process batch in order
                        for (ConsumerRecord<String, String> r : batch) {
                            processor.process(r);
                            lastCommittedOffset = r.offset();
                        }

                        // Commit batch
                        synchronized (consumer) {
                            consumer.commitSync(Collections.singletonMap(
                                new TopicPartition(record.topic(), partition),
                                new OffsetAndMetadata(lastCommittedOffset + 1)
                            ));
                        }

                        batch.clear();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                } catch (Exception e) {
                    System.err.printf("Error in partition %d: %s%n",
                        partition, e.getMessage());
                }
            }
        }

        void stop() {
            running = false;
        }
    }

    interface MessageProcessor {
        void process(ConsumerRecord<String, String> record) throws Exception;
    }
}
```

## Python Parallel Processing

```python
from confluent_kafka import Consumer, TopicPartition
from concurrent.futures import ThreadPoolExecutor, as_completed
from queue import Queue
from threading import Thread, Event
from typing import Callable, Dict
import json

class ParallelConsumer:
    def __init__(self, bootstrap_servers: str, group_id: str,
                 parallelism: int = 4):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'enable.auto.commit': False,
            'auto.offset.reset': 'earliest',
        }
        self.consumer = Consumer(self.config)
        self.executor = ThreadPoolExecutor(max_workers=parallelism)
        self.parallelism = parallelism
        self.running = True

    def consume(self, topic: str, processor: Callable):
        self.consumer.subscribe([topic])

        try:
            while self.running:
                msg = self.consumer.poll(timeout=1.0)

                if msg is None:
                    continue

                if msg.error():
                    print(f"Error: {msg.error()}")
                    continue

                # Submit for parallel processing
                future = self.executor.submit(processor, msg)
                future.add_done_callback(
                    lambda f: self._handle_completion(f, msg))

        finally:
            self.executor.shutdown(wait=True)
            self.consumer.close()

    def _handle_completion(self, future, msg):
        try:
            future.result()
            # Commit on success
            self.consumer.commit(msg)
        except Exception as e:
            print(f"Processing failed: {e}")
            # Handle error - send to DLQ

    def shutdown(self):
        self.running = False


class PartitionParallelConsumer:
    """Parallel processing with ordering per partition."""

    def __init__(self, bootstrap_servers: str, group_id: str):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'enable.auto.commit': False,
        }
        self.consumer = Consumer(self.config)
        self.partition_queues: Dict[int, Queue] = {}
        self.partition_threads: Dict[int, Thread] = {}
        self.stop_events: Dict[int, Event] = {}
        self.running = True

    def _on_assign(self, consumer, partitions):
        for tp in partitions:
            queue = Queue()
            stop_event = Event()

            self.partition_queues[tp.partition] = queue
            self.stop_events[tp.partition] = stop_event

            thread = Thread(
                target=self._partition_worker,
                args=(tp.partition, queue, stop_event)
            )
            thread.start()
            self.partition_threads[tp.partition] = thread

    def _on_revoke(self, consumer, partitions):
        for tp in partitions:
            if tp.partition in self.stop_events:
                self.stop_events[tp.partition].set()

            if tp.partition in self.partition_threads:
                self.partition_threads[tp.partition].join(timeout=5)

            self.partition_queues.pop(tp.partition, None)
            self.partition_threads.pop(tp.partition, None)
            self.stop_events.pop(tp.partition, None)

    def _partition_worker(self, partition: int, queue: Queue, stop_event: Event):
        while not stop_event.is_set():
            try:
                msg = queue.get(timeout=0.1)
                self.processor(msg)

                # Commit offset
                self.consumer.commit(msg)
            except Exception:
                pass  # Queue.get timeout

    def consume(self, topic: str, processor: Callable):
        self.processor = processor
        self.consumer.subscribe(
            [topic],
            on_assign=self._on_assign,
            on_revoke=self._on_revoke
        )

        try:
            while self.running:
                msg = self.consumer.poll(timeout=1.0)

                if msg is None:
                    continue

                if msg.error():
                    print(f"Error: {msg.error()}")
                    continue

                # Route to partition queue
                if msg.partition() in self.partition_queues:
                    self.partition_queues[msg.partition()].put(msg)

        finally:
            # Stop all partition workers
            for event in self.stop_events.values():
                event.set()

            for thread in self.partition_threads.values():
                thread.join(timeout=5)

            self.consumer.close()

    def shutdown(self):
        self.running = False
```

## Async Processing with CompletableFuture

### Java Async Implementation

```java
import org.apache.kafka.clients.consumer.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;

public class AsyncConsumer {
    private final Consumer<String, String> consumer;
    private final int maxConcurrent;
    private final Semaphore semaphore;

    public AsyncConsumer(String bootstrapServers, String groupId,
                         int maxConcurrent) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");

        this.consumer = new KafkaConsumer<>(props);
        this.maxConcurrent = maxConcurrent;
        this.semaphore = new Semaphore(maxConcurrent);
    }

    public void consume(String topic, AsyncProcessor processor) {
        consumer.subscribe(Collections.singletonList(topic));
        List<CompletableFuture<Void>> pending = new ArrayList<>();

        try {
            while (true) {
                ConsumerRecords<String, String> records =
                    consumer.poll(Duration.ofMillis(100));

                for (ConsumerRecord<String, String> record : records) {
                    // Acquire permit (blocks if at max concurrency)
                    semaphore.acquire();

                    CompletableFuture<Void> future = processor.processAsync(record)
                        .whenComplete((result, error) -> {
                            semaphore.release();
                            if (error != null) {
                                handleError(record, error);
                            }
                        });

                    pending.add(future);
                }

                // Remove completed futures and commit
                pending.removeIf(CompletableFuture::isDone);

                // Periodic commit when no pending
                if (pending.isEmpty() && !records.isEmpty()) {
                    consumer.commitSync();
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            // Wait for pending to complete
            CompletableFuture.allOf(pending.toArray(new CompletableFuture[0]))
                .join();
            consumer.commitSync();
            consumer.close();
        }
    }

    private void handleError(ConsumerRecord<String, String> record, Throwable error) {
        System.err.printf("Async processing failed: %s%n", error.getMessage());
    }

    interface AsyncProcessor {
        CompletableFuture<Void> processAsync(ConsumerRecord<String, String> record);
    }
}
```

## Maintaining Order During Parallel Processing

### Key-Based Ordering

```java
public class KeyOrderedParallelConsumer {
    private final Map<String, Queue<ConsumerRecord<String, String>>> keyQueues =
        new ConcurrentHashMap<>();
    private final Map<String, CompletableFuture<Void>> keyFutures =
        new ConcurrentHashMap<>();
    private final ExecutorService executor;

    public void process(ConsumerRecord<String, String> record,
                        MessageProcessor processor) {
        String key = record.key() != null ? record.key() : "null";

        // Get or create queue for this key
        Queue<ConsumerRecord<String, String>> queue =
            keyQueues.computeIfAbsent(key, k -> new ConcurrentLinkedQueue<>());

        // Add to queue
        queue.add(record);

        // Chain processing to ensure order per key
        keyFutures.compute(key, (k, existingFuture) -> {
            CompletableFuture<Void> newFuture = CompletableFuture.runAsync(() -> {
                ConsumerRecord<String, String> r = queue.poll();
                if (r != null) {
                    processor.process(r);
                }
            }, executor);

            if (existingFuture == null) {
                return newFuture;
            } else {
                return existingFuture.thenCompose(v -> newFuture);
            }
        });
    }
}
```

## Best Practices

### 1. Control Concurrency

```java
// Limit concurrent processing
Semaphore semaphore = new Semaphore(maxConcurrent);
props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, maxConcurrent * 2);
```

### 2. Handle Backpressure

```java
// Pause partitions when queue is full
if (queue.size() > threshold) {
    consumer.pause(consumer.assignment());
}

// Resume when drained
if (queue.size() < resumeThreshold) {
    consumer.resume(consumer.assignment());
}
```

### 3. Commit Carefully

```java
// Only commit what's been processed
// Track minimum processed offset per partition
```

### 4. Monitor Processing Times

```java
long startTime = System.nanoTime();
processor.process(record);
long duration = System.nanoTime() - startTime;
metrics.recordProcessingTime(duration);
```

## Conclusion

Parallel processing in Kafka consumers can significantly improve throughput:

1. **Thread pools** for simple parallel processing
2. **Partition queues** to maintain partition-level ordering
3. **Key-based ordering** for entity-level consistency
4. **Async processing** for I/O-bound workloads

Choose the right pattern based on your ordering requirements and throughput needs. Always test thoroughly to ensure your parallel processing strategy meets both performance and correctness requirements.
