# How to Fix Kafka NotLeaderForPartition Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, NotLeaderForPartition, Troubleshooting, Leader Election, Metadata Refresh, Error Handling

Description: A comprehensive guide to diagnosing and fixing Kafka NotLeaderForPartition errors, covering leader election issues, metadata refresh problems, and configuration solutions.

---

The NotLeaderForPartition error occurs when a producer or consumer sends a request to a broker that is no longer the leader for a partition. This guide covers how to diagnose, prevent, and handle these errors.

## Understanding the Error

```
org.apache.kafka.common.errors.NotLeaderForPartitionException:
This server is not the leader for that topic-partition
```

### Common Causes

1. **Leader election in progress**: Broker failure triggered new leader election
2. **Stale metadata**: Client has outdated partition leader information
3. **Network issues**: Client cannot reach the actual leader
4. **Broker overload**: Leader broker is too slow to respond
5. **Controller issues**: Controller cannot complete leader election

## Diagnosing the Problem

### Check Partition Leadership

```bash
# View partition leaders
kafka-topics.sh --describe --topic my-topic --bootstrap-server localhost:9092

# Output shows which broker is leader for each partition
Topic: my-topic	Partition: 0	Leader: 1	Replicas: 1,2,3	Isr: 1,2,3
Topic: my-topic	Partition: 1	Leader: 2	Replicas: 2,3,1	Isr: 2,3,1
Topic: my-topic	Partition: 2	Leader: 3	Replicas: 3,1,2	Isr: 3,1,2
```

### Check Controller Status

```bash
# Find current controller
kafka-metadata.sh --snapshot /var/kafka-logs/__cluster_metadata-0/00000000000000000000.log \
  --command controllers

# Or via ZooKeeper (older versions)
zookeeper-shell.sh localhost:2181 get /controller
```

### Check Broker Logs

```bash
# Look for leader election events
grep -i "leader" /var/log/kafka/server.log | tail -50

# Check for broker failures
grep -i "failed\|error\|exception" /var/log/kafka/server.log | tail -100
```

## Java Solutions

### Retry with Metadata Refresh

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.errors.NotLeaderForPartitionException;
import org.apache.kafka.common.errors.RetriableException;

import java.util.*;
import java.util.concurrent.TimeUnit;

public class ResilientProducer {

    private final KafkaProducer<String, String> producer;
    private final int maxRetries;
    private final long retryBackoffMs;

    public ResilientProducer(Properties props, int maxRetries, long retryBackoffMs) {
        // Configure for better metadata handling
        props.put(ProducerConfig.METADATA_MAX_AGE_CONFIG, 60000); // 1 minute
        props.put(ProducerConfig.RETRY_BACKOFF_MS_CONFIG, retryBackoffMs);
        props.put(ProducerConfig.RETRIES_CONFIG, maxRetries);
        props.put(ProducerConfig.MAX_BLOCK_MS_CONFIG, 120000);

        this.producer = new KafkaProducer<>(props);
        this.maxRetries = maxRetries;
        this.retryBackoffMs = retryBackoffMs;
    }

    public void sendWithRetry(String topic, String key, String value) {
        int attempts = 0;

        while (attempts < maxRetries) {
            try {
                ProducerRecord<String, String> record = new ProducerRecord<>(topic, key, value);
                RecordMetadata metadata = producer.send(record).get(30, TimeUnit.SECONDS);
                System.out.printf("Sent to partition %d, offset %d%n",
                    metadata.partition(), metadata.offset());
                return;
            } catch (Exception e) {
                if (isRetriable(e)) {
                    attempts++;
                    System.out.printf("Attempt %d failed, retrying: %s%n", attempts, e.getMessage());

                    // Force metadata refresh
                    forceMetadataRefresh(topic);

                    try {
                        Thread.sleep(retryBackoffMs * attempts);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Interrupted during retry", ie);
                    }
                } else {
                    throw new RuntimeException("Non-retriable error", e);
                }
            }
        }

        throw new RuntimeException("Max retries exceeded");
    }

    private boolean isRetriable(Exception e) {
        Throwable cause = e.getCause();
        return cause instanceof NotLeaderForPartitionException
            || cause instanceof RetriableException;
    }

    private void forceMetadataRefresh(String topic) {
        // Calling partitionsFor forces metadata refresh
        producer.partitionsFor(topic);
    }

    public void close() {
        producer.close();
    }
}
```

### Consumer with Leader Handling

```java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.errors.NotLeaderForPartitionException;

import java.time.Duration;
import java.util.*;

public class ResilientConsumer {

    private final KafkaConsumer<String, String> consumer;

    public ResilientConsumer(Properties props) {
        // Configure for metadata issues
        props.put(ConsumerConfig.METADATA_MAX_AGE_CONFIG, 30000);
        props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 30000);
        props.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, 10000);
        props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 300000);

        this.consumer = new KafkaConsumer<>(props);
    }

    public void consume(String topic) {
        consumer.subscribe(Collections.singletonList(topic));

        while (true) {
            try {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));

                for (ConsumerRecord<String, String> record : records) {
                    processRecord(record);
                }

                consumer.commitSync();

            } catch (NotLeaderForPartitionException e) {
                System.out.println("NotLeaderForPartition - refreshing metadata");
                handleNotLeaderError(topic);

            } catch (Exception e) {
                System.err.println("Error consuming: " + e.getMessage());
                e.printStackTrace();
            }
        }
    }

    private void handleNotLeaderError(String topic) {
        // Force metadata refresh by unsubscribing and resubscribing
        consumer.unsubscribe();

        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        consumer.subscribe(Collections.singletonList(topic));
    }

    private void processRecord(ConsumerRecord<String, String> record) {
        System.out.printf("Received: key=%s, value=%s, partition=%d%n",
            record.key(), record.value(), record.partition());
    }

    public void close() {
        consumer.close();
    }
}
```

### Monitoring Partition Leaders

```java
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.common.Node;
import org.apache.kafka.common.TopicPartitionInfo;

import java.util.*;
import java.util.concurrent.*;

public class PartitionLeaderMonitor {

    private final AdminClient adminClient;
    private final Map<String, Map<Integer, Integer>> leaderHistory = new ConcurrentHashMap<>();

    public PartitionLeaderMonitor(String bootstrapServers) {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, 30000);
        this.adminClient = AdminClient.create(props);
    }

    public void monitorTopic(String topic) throws Exception {
        DescribeTopicsResult result = adminClient.describeTopics(Collections.singletonList(topic));
        TopicDescription description = result.topicNameValues().get(topic).get();

        for (TopicPartitionInfo partitionInfo : description.partitions()) {
            int partition = partitionInfo.partition();
            Node leader = partitionInfo.leader();

            int currentLeader = leader != null ? leader.id() : -1;

            // Check for leader change
            Map<Integer, Integer> partitionLeaders =
                leaderHistory.computeIfAbsent(topic, k -> new ConcurrentHashMap<>());

            Integer previousLeader = partitionLeaders.put(partition, currentLeader);

            if (previousLeader != null && previousLeader != currentLeader) {
                System.out.printf("Leader changed for %s-%d: %d -> %d%n",
                    topic, partition, previousLeader, currentLeader);
            }

            // Check ISR
            List<Node> isr = partitionInfo.isr();
            List<Node> replicas = partitionInfo.replicas();

            if (isr.size() < replicas.size()) {
                System.out.printf("WARNING: %s-%d has under-replicated ISR: %d/%d%n",
                    topic, partition, isr.size(), replicas.size());
            }
        }
    }

    public void startMonitoring(String topic, long intervalMs) {
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
        scheduler.scheduleAtFixedRate(() -> {
            try {
                monitorTopic(topic);
            } catch (Exception e) {
                System.err.println("Monitoring error: " + e.getMessage());
            }
        }, 0, intervalMs, TimeUnit.MILLISECONDS);
    }

    public void close() {
        adminClient.close();
    }
}
```

## Python Solutions

```python
from confluent_kafka import Producer, Consumer, KafkaError, KafkaException
from confluent_kafka.admin import AdminClient, NewTopic
import time
from typing import Dict, Optional
import threading

class ResilientProducer:
    """Producer with NotLeaderForPartition handling"""

    def __init__(self, bootstrap_servers: str, max_retries: int = 5):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            'metadata.max.age.ms': 60000,
            'retry.backoff.ms': 100,
            'message.send.max.retries': max_retries,
            'socket.timeout.ms': 30000
        }
        self.producer = Producer(self.config)
        self.max_retries = max_retries

    def send_with_retry(self, topic: str, key: str, value: str):
        attempts = 0
        last_error = None

        while attempts < self.max_retries:
            try:
                self.producer.produce(
                    topic,
                    key=key.encode('utf-8'),
                    value=value.encode('utf-8'),
                    callback=self._delivery_callback
                )
                self.producer.flush(timeout=30)
                return
            except KafkaException as e:
                last_error = e
                if self._is_retriable(e):
                    attempts += 1
                    print(f"Attempt {attempts} failed: {e}")
                    self._force_metadata_refresh(topic)
                    time.sleep(0.1 * attempts)
                else:
                    raise

        raise last_error or Exception("Max retries exceeded")

    def _delivery_callback(self, err, msg):
        if err:
            print(f"Delivery failed: {err}")
        else:
            print(f"Delivered to {msg.topic()}[{msg.partition()}] @ {msg.offset()}")

    def _is_retriable(self, error: KafkaException) -> bool:
        retriable_codes = [
            KafkaError.NOT_LEADER_FOR_PARTITION,
            KafkaError.LEADER_NOT_AVAILABLE,
            KafkaError.REQUEST_TIMED_OUT
        ]
        return error.args[0].code() in retriable_codes

    def _force_metadata_refresh(self, topic: str):
        """Force metadata refresh by listing topic partitions"""
        try:
            self.producer.list_topics(topic, timeout=10)
        except Exception as e:
            print(f"Metadata refresh error: {e}")


class ResilientConsumer:
    """Consumer with NotLeaderForPartition handling"""

    def __init__(self, bootstrap_servers: str, group_id: str):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'auto.offset.reset': 'earliest',
            'metadata.max.age.ms': 30000,
            'session.timeout.ms': 30000,
            'heartbeat.interval.ms': 10000
        }
        self.consumer = Consumer(self.config)

    def consume(self, topic: str):
        self.consumer.subscribe([topic])

        while True:
            try:
                msg = self.consumer.poll(1.0)

                if msg is None:
                    continue

                if msg.error():
                    self._handle_error(msg.error(), topic)
                    continue

                self._process_message(msg)

            except KafkaException as e:
                print(f"Kafka error: {e}")
                self._handle_kafka_exception(e, topic)

    def _handle_error(self, error: KafkaError, topic: str):
        if error.code() == KafkaError.NOT_LEADER_FOR_PARTITION:
            print("NotLeaderForPartition - refreshing metadata")
            self._refresh_subscription(topic)
        elif error.code() == KafkaError._PARTITION_EOF:
            pass  # End of partition is normal
        else:
            print(f"Consumer error: {error}")

    def _handle_kafka_exception(self, error: KafkaException, topic: str):
        if error.args[0].code() == KafkaError.NOT_LEADER_FOR_PARTITION:
            self._refresh_subscription(topic)
        else:
            raise

    def _refresh_subscription(self, topic: str):
        """Force metadata refresh"""
        self.consumer.unsubscribe()
        time.sleep(1)
        self.consumer.subscribe([topic])

    def _process_message(self, msg):
        print(f"Received: key={msg.key()}, value={msg.value()}, "
              f"partition={msg.partition()}")

    def close(self):
        self.consumer.close()


class PartitionLeaderMonitor:
    """Monitors partition leader changes"""

    def __init__(self, bootstrap_servers: str):
        self.admin = AdminClient({'bootstrap.servers': bootstrap_servers})
        self.leader_history: Dict[str, Dict[int, int]] = {}
        self.running = False

    def get_partition_leaders(self, topic: str) -> Dict[int, Optional[int]]:
        """Get current leader for each partition"""
        metadata = self.admin.list_topics(topic, timeout=10)
        topic_metadata = metadata.topics[topic]

        leaders = {}
        for partition_id, partition_metadata in topic_metadata.partitions.items():
            leaders[partition_id] = partition_metadata.leader
        return leaders

    def check_for_changes(self, topic: str):
        """Check for leader changes"""
        current_leaders = self.get_partition_leaders(topic)

        if topic not in self.leader_history:
            self.leader_history[topic] = current_leaders
            return

        for partition, leader in current_leaders.items():
            previous = self.leader_history[topic].get(partition)
            if previous is not None and previous != leader:
                print(f"Leader changed for {topic}-{partition}: {previous} -> {leader}")

        self.leader_history[topic] = current_leaders

    def start_monitoring(self, topic: str, interval_seconds: float = 10):
        """Start continuous monitoring"""
        self.running = True

        def monitor_loop():
            while self.running:
                try:
                    self.check_for_changes(topic)
                except Exception as e:
                    print(f"Monitoring error: {e}")
                time.sleep(interval_seconds)

        thread = threading.Thread(target=monitor_loop, daemon=True)
        thread.start()

    def stop_monitoring(self):
        self.running = False


# Example usage
def main():
    bootstrap_servers = "localhost:9092"

    # Test producer
    producer = ResilientProducer(bootstrap_servers)
    producer.send_with_retry("test-topic", "key-1", "value-1")

    # Start leader monitoring
    monitor = PartitionLeaderMonitor(bootstrap_servers)
    monitor.start_monitoring("test-topic", interval_seconds=5)

    # Test consumer
    consumer = ResilientConsumer(bootstrap_servers, "test-group")
    try:
        consumer.consume("test-topic")
    finally:
        consumer.close()
        monitor.stop_monitoring()


if __name__ == '__main__':
    main()
```

## Configuration Recommendations

### Producer Configuration

```properties
# Metadata refresh
metadata.max.age.ms=60000

# Retry configuration
retries=5
retry.backoff.ms=100
delivery.timeout.ms=120000

# Request timeout
request.timeout.ms=30000

# Block time for send
max.block.ms=60000
```

### Consumer Configuration

```properties
# Metadata refresh
metadata.max.age.ms=30000

# Session management
session.timeout.ms=30000
heartbeat.interval.ms=10000

# Poll interval
max.poll.interval.ms=300000
```

### Broker Configuration

```properties
# Controller settings
controller.socket.timeout.ms=30000

# Leader election
leader.imbalance.check.interval.seconds=300
leader.imbalance.per.broker.percentage=10

# Replica settings
replica.lag.time.max.ms=30000
```

## Prevention Strategies

1. **Proper metadata configuration**: Set appropriate metadata refresh intervals
2. **Adequate timeouts**: Configure request timeouts based on network latency
3. **Monitor cluster health**: Track under-replicated partitions and leader changes
4. **Maintain broker capacity**: Ensure brokers are not overloaded
5. **Use rack awareness**: Spread replicas across failure domains

## Conclusion

NotLeaderForPartition errors are often transient and can be handled with proper retry logic and metadata refresh. By implementing resilient producers and consumers, configuring appropriate timeouts, and monitoring partition leadership, you can minimize the impact of these errors on your Kafka applications.
