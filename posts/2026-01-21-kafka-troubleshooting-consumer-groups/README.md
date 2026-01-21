# How to Debug Kafka Consumer Group Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Troubleshooting, Consumer Groups, Debugging, Rebalancing, Performance

Description: A comprehensive guide to debugging Kafka consumer group issues, covering rebalancing problems, lag analysis, stuck consumers, offset management, and practical troubleshooting techniques.

---

Consumer group issues are among the most common problems in Kafka deployments. This guide covers diagnosing and fixing issues with rebalancing, consumer lag, stuck consumers, and offset management.

## Common Consumer Group Issues

1. Frequent rebalancing
2. Consumers stuck or not making progress
3. High consumer lag
4. Partition assignment problems
5. Offset commit failures

## Diagnostic Commands

### Basic Consumer Group Info

```bash
# List all consumer groups
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# Describe consumer group
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group my-consumer-group

# Describe with verbose member info
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group my-consumer-group --members --verbose

# Show state of consumer group
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group my-consumer-group --state
```

### Understanding Output

```
GROUP           TOPIC           PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG      CONSUMER-ID                                   HOST            CLIENT-ID
my-group        my-topic        0          1000            1050            50       consumer-1-abc123                             /10.0.0.1       consumer-1
my-group        my-topic        1          2000            2000            0        consumer-2-def456                             /10.0.0.2       consumer-2
my-group        my-topic        2          1500            1800            300      -                                             -               -
```

Key columns:
- **CURRENT-OFFSET**: Last committed offset
- **LOG-END-OFFSET**: Latest available offset
- **LAG**: Messages behind (LOG-END-OFFSET - CURRENT-OFFSET)
- **CONSUMER-ID**: Active consumer (- means unassigned)

## Rebalancing Issues

### Symptoms

- Consumers frequently rejoin group
- Processing stops during rebalances
- Log messages: "Revoking previously assigned partitions"

### Diagnosing Rebalances

```java
// Add logging to rebalance listener
consumer.subscribe(topics, new ConsumerRebalanceListener() {
    @Override
    public void onPartitionsRevoked(Collection<TopicPartition> partitions) {
        System.out.println("Partitions revoked: " + partitions);
        System.out.println("Timestamp: " + Instant.now());
    }

    @Override
    public void onPartitionsAssigned(Collection<TopicPartition> partitions) {
        System.out.println("Partitions assigned: " + partitions);
        System.out.println("Timestamp: " + Instant.now());
    }
});
```

### Common Causes and Fixes

#### 1. Poll Interval Exceeded

```properties
# Problem: Processing takes too long between polls
# Consumer kicked out because max.poll.interval.ms exceeded

# Solution: Increase interval or reduce processing time
max.poll.interval.ms=600000  # 10 minutes
max.poll.records=100         # Fewer records per poll
```

#### 2. Session Timeout

```properties
# Problem: Consumer heartbeat missed
# Solution: Increase timeout or ensure network stability

session.timeout.ms=30000       # 30 seconds
heartbeat.interval.ms=10000    # 10 seconds (should be 1/3 of session.timeout)
```

#### 3. Frequent Deployments

```java
// Use static membership to survive restarts
props.put(ConsumerConfig.GROUP_INSTANCE_ID_CONFIG,
    "instance-" + hostname);
props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, "60000");
```

#### 4. Use Cooperative Rebalancing

```java
// Incremental rebalancing - less disruptive
props.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG,
    CooperativeStickyAssignor.class.getName());
```

## Stuck Consumers

### Symptoms

- Consumer not making progress
- Lag continuously growing
- No errors in logs

### Diagnostic Steps

```bash
# Check if consumer is connected
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group my-group --members

# Check consumer position
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group my-group
```

### Common Causes

#### 1. Processing Blocked

```java
// Check if processing is blocking
for (ConsumerRecord<String, String> record : records) {
    long startTime = System.currentTimeMillis();

    processRecord(record);  // Is this blocking?

    long duration = System.currentTimeMillis() - startTime;
    if (duration > 5000) {
        System.out.println("Slow processing: " + duration + "ms");
    }
}
```

#### 2. Commit Failure

```java
// Ensure commits are succeeding
try {
    consumer.commitSync();
} catch (CommitFailedException e) {
    System.err.println("Commit failed: " + e.getMessage());
    // Handle rebalance - consumer was kicked out
}
```

#### 3. Deserialization Error

```java
// Use safe deserializer
props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
    ErrorHandlingDeserializer.class.getName());
props.put("spring.deserializer.value.delegate.class",
    StringDeserializer.class.getName());
```

## High Consumer Lag

### Analyzing Lag

```bash
# Check current lag
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group my-group | grep -v "^$" | tail -n +3 | awk '{sum += $6} END {print "Total lag: " sum}'

# Monitor lag over time
watch -n 5 'kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group my-group'
```

### Reducing Lag

#### 1. Scale Consumers

```bash
# Add more consumers (up to partition count)
# Each partition can only be consumed by one consumer in a group
```

#### 2. Increase Throughput

```java
// Fetch more data
props.put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, 1048576);  // 1MB
props.put(ConsumerConfig.FETCH_MAX_BYTES_CONFIG, 52428800);  // 50MB
props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 1000);
```

#### 3. Parallel Processing

```java
// Process records in parallel
ExecutorService executor = Executors.newFixedThreadPool(10);

for (ConsumerRecord<String, String> record : records) {
    executor.submit(() -> processRecord(record));
}
// Wait and commit after all complete
```

## Offset Issues

### Reset Consumer Group Offsets

```bash
# Reset to earliest
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-group --reset-offsets --to-earliest --topic my-topic --execute

# Reset to latest
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-group --reset-offsets --to-latest --topic my-topic --execute

# Reset to specific offset
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-group --reset-offsets --to-offset 1000 --topic my-topic:0 --execute

# Reset to timestamp
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-group --reset-offsets --to-datetime 2024-01-15T00:00:00.000 \
  --topic my-topic --execute

# Dry run first
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-group --reset-offsets --to-earliest --topic my-topic --dry-run
```

### Delete Consumer Group

```bash
# Delete consumer group (must be inactive)
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-group --delete
```

## Java Diagnostic Tool

```java
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;
import java.util.*;

public class ConsumerGroupDiagnostic {
    private final AdminClient admin;

    public ConsumerGroupDiagnostic(String bootstrapServers) {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        this.admin = AdminClient.create(props);
    }

    public void diagnose(String groupId) throws Exception {
        System.out.println("=== Consumer Group Diagnostic: " + groupId + " ===\n");

        // Get group description
        DescribeConsumerGroupsResult descResult =
            admin.describeConsumerGroups(Collections.singletonList(groupId));
        ConsumerGroupDescription description =
            descResult.describedGroups().get(groupId).get();

        System.out.println("State: " + description.state());
        System.out.println("Protocol: " + description.partitionAssignor());
        System.out.println("Coordinator: " + description.coordinator());
        System.out.println("Members: " + description.members().size());

        // Check for issues
        if (description.state() == ConsumerGroupState.EMPTY) {
            System.out.println("\n[WARNING] Group is EMPTY - no active consumers");
        }

        if (description.state() == ConsumerGroupState.PREPARING_REBALANCE ||
            description.state() == ConsumerGroupState.COMPLETING_REBALANCE) {
            System.out.println("\n[WARNING] Group is rebalancing");
        }

        // List members
        System.out.println("\n--- Members ---");
        for (MemberDescription member : description.members()) {
            System.out.printf("  %s (%s) @ %s%n",
                member.consumerId(),
                member.clientId(),
                member.host());
            System.out.println("    Partitions: " + member.assignment().topicPartitions());
        }

        // Check lag
        System.out.println("\n--- Partition Lag ---");
        ListConsumerGroupOffsetsResult offsetsResult =
            admin.listConsumerGroupOffsets(groupId);
        Map<TopicPartition, OffsetAndMetadata> offsets =
            offsetsResult.partitionsToOffsetAndMetadata().get();

        Map<TopicPartition, OffsetSpec> endOffsetRequest = new HashMap<>();
        for (TopicPartition tp : offsets.keySet()) {
            endOffsetRequest.put(tp, OffsetSpec.latest());
        }
        Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> endOffsets =
            admin.listOffsets(endOffsetRequest).all().get();

        long totalLag = 0;
        for (TopicPartition tp : offsets.keySet()) {
            long committed = offsets.get(tp).offset();
            long end = endOffsets.get(tp).offset();
            long lag = end - committed;
            totalLag += lag;

            String warning = lag > 10000 ? " [HIGH LAG]" : "";
            System.out.printf("  %s: committed=%d, end=%d, lag=%d%s%n",
                tp, committed, end, lag, warning);
        }

        System.out.println("\nTotal Lag: " + totalLag);

        // Check for unassigned partitions
        Set<TopicPartition> assigned = new HashSet<>();
        for (MemberDescription member : description.members()) {
            assigned.addAll(member.assignment().topicPartitions());
        }

        Set<TopicPartition> unassigned = new HashSet<>(offsets.keySet());
        unassigned.removeAll(assigned);

        if (!unassigned.isEmpty()) {
            System.out.println("\n[WARNING] Unassigned partitions: " + unassigned);
        }
    }

    public void close() {
        admin.close();
    }

    public static void main(String[] args) throws Exception {
        ConsumerGroupDiagnostic diag = new ConsumerGroupDiagnostic("localhost:9092");
        diag.diagnose("my-consumer-group");
        diag.close();
    }
}
```

## Troubleshooting Checklist

### Rebalancing Issues

- [ ] Check `max.poll.interval.ms` vs processing time
- [ ] Check `session.timeout.ms` vs network latency
- [ ] Verify `heartbeat.interval.ms` < `session.timeout.ms / 3`
- [ ] Consider static membership for k8s
- [ ] Use cooperative rebalancing

### Stuck Consumer

- [ ] Check if consumer is in group (`--members`)
- [ ] Check for blocking operations
- [ ] Verify deserialization works
- [ ] Check commit success
- [ ] Look for exceptions in logs

### High Lag

- [ ] Compare consumer count vs partition count
- [ ] Check processing throughput
- [ ] Verify no partitions are unassigned
- [ ] Consider parallel processing
- [ ] Increase fetch sizes

### Offset Issues

- [ ] Verify auto.offset.reset setting
- [ ] Check enable.auto.commit setting
- [ ] Verify commit success
- [ ] Check for duplicate group.id usage

## Conclusion

Debugging consumer group issues requires systematic investigation:

1. **Start with basics**: Group state, member count, lag
2. **Check rebalancing**: Frequency, duration, cause
3. **Analyze processing**: Throughput, blocking, errors
4. **Verify offsets**: Commit success, position, lag

Use the diagnostic tools and checklist to quickly identify and resolve consumer group problems.
