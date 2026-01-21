# How to Set Up Kafka Replication and ISR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Replication, ISR, High Availability, Durability, Fault Tolerance

Description: A comprehensive guide to Kafka replication and In-Sync Replicas (ISR), covering configuration options, durability guarantees, leader election, and best practices for building highly available Kafka clusters.

---

Replication is Kafka's core mechanism for fault tolerance and durability. Understanding how replicas and In-Sync Replicas (ISR) work is essential for building reliable Kafka deployments. This guide covers replication concepts, configuration, and operational best practices.

## Understanding Kafka Replication

### Key Concepts

- **Replication Factor**: Number of copies of each partition
- **Leader**: Handles all reads and writes for a partition
- **Follower**: Passively replicates from leader
- **ISR (In-Sync Replicas)**: Followers that are caught up with leader
- **Min ISR**: Minimum replicas that must acknowledge writes

### Replication Flow

```
Producer -> Leader Broker -> Follower Brokers (async replication)
                |
                v
         Acknowledge (based on acks setting)
```

## Configuring Replication

### Broker Configuration

```properties
# server.properties

# Default replication factor for auto-created topics
default.replication.factor=3

# Minimum ISR for acks=all to succeed
min.insync.replicas=2

# Replica lag settings
replica.lag.time.max.ms=30000
replica.lag.max.messages=10000

# Number of fetcher threads for replication
num.replica.fetchers=4

# Replica fetch settings
replica.fetch.min.bytes=1
replica.fetch.wait.max.ms=500
replica.fetch.max.bytes=1048576

# Unclean leader election (should be false in production)
unclean.leader.election.enable=false

# Auto leader balancing
auto.leader.rebalance.enable=true
leader.imbalance.check.interval.seconds=300
leader.imbalance.per.broker.percentage=10
```

### Topic-Level Configuration

```bash
# Create topic with replication factor
kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic my-topic \
  --partitions 12 \
  --replication-factor 3 \
  --config min.insync.replicas=2

# Alter existing topic
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name my-topic \
  --alter --add-config min.insync.replicas=2
```

### Producer Configuration for Durability

```java
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");

// Wait for all ISR to acknowledge
props.put(ProducerConfig.ACKS_CONFIG, "all");

// Enable idempotence for exactly-once
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

// Retries on failure
props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);
```

## Understanding ISR

### ISR Membership Criteria

A replica stays in ISR if it:

1. Has fetched messages within `replica.lag.time.max.ms`
2. Has an active session with ZooKeeper/Controller
3. Has not exceeded `replica.lag.max.messages` (deprecated)

### ISR Shrink and Expand

```
Initial ISR: [broker-1 (leader), broker-2, broker-3]

Broker-2 falls behind:
ISR: [broker-1 (leader), broker-3]  <- ISR shrunk

Broker-2 catches up:
ISR: [broker-1 (leader), broker-2, broker-3]  <- ISR expanded
```

### Monitoring ISR

```bash
# Describe topic to see ISR
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --topic my-topic

# Output shows:
# Topic: my-topic  Partition: 0  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3
```

## Java Code for Monitoring Replication

```java
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.common.TopicPartition;
import java.util.*;

public class ReplicationMonitor {
    private final AdminClient admin;

    public ReplicationMonitor(String bootstrapServers) {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        this.admin = AdminClient.create(props);
    }

    public void checkReplicationStatus(String topic) throws Exception {
        DescribeTopicsResult result = admin.describeTopics(Collections.singletonList(topic));
        TopicDescription description = result.topicNameValues().get(topic).get();

        System.out.println("Topic: " + description.name());
        System.out.println("Partitions: " + description.partitions().size());

        for (TopicPartitionInfo partition : description.partitions()) {
            int partitionId = partition.partition();
            int leader = partition.leader() != null ? partition.leader().id() : -1;
            List<Integer> replicas = partition.replicas().stream()
                .map(n -> n.id()).toList();
            List<Integer> isr = partition.isr().stream()
                .map(n -> n.id()).toList();

            boolean underReplicated = isr.size() < replicas.size();
            boolean leaderless = leader == -1;

            System.out.printf("  Partition %d: leader=%d, replicas=%s, isr=%s%s%s%n",
                partitionId, leader, replicas, isr,
                underReplicated ? " [UNDER-REPLICATED]" : "",
                leaderless ? " [NO-LEADER]" : "");
        }
    }

    public void findUnderReplicatedPartitions() throws Exception {
        ListTopicsResult topics = admin.listTopics();
        Set<String> topicNames = topics.names().get();

        DescribeTopicsResult result = admin.describeTopics(topicNames);
        Map<String, TopicDescription> descriptions = result.allTopicNames().get();

        System.out.println("Under-replicated partitions:");

        for (TopicDescription desc : descriptions.values()) {
            for (TopicPartitionInfo partition : desc.partitions()) {
                if (partition.isr().size() < partition.replicas().size()) {
                    System.out.printf("  %s-%d: isr=%d, replicas=%d%n",
                        desc.name(),
                        partition.partition(),
                        partition.isr().size(),
                        partition.replicas().size());
                }
            }
        }
    }

    public void checkReplicationLag() throws Exception {
        // Get log end offsets for all partitions
        Map<TopicPartition, OffsetSpec> requests = new HashMap<>();
        // Add partitions to check...

        Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> endOffsets =
            admin.listOffsets(requests).all().get();

        // Compare with replica offsets via JMX or other metrics
    }

    public void close() {
        admin.close();
    }
}
```

## Leader Election

### Preferred Leader Election

```bash
# Trigger preferred leader election for all partitions
kafka-leader-election.sh --bootstrap-server localhost:9092 \
  --election-type preferred --all-topic-partitions

# For specific topic
kafka-leader-election.sh --bootstrap-server localhost:9092 \
  --election-type preferred --topic my-topic --partition 0
```

### Unclean Leader Election

```bash
# Trigger unclean leader election (use with caution - may lose data)
kafka-leader-election.sh --bootstrap-server localhost:9092 \
  --election-type unclean --topic my-topic --partition 0
```

### Configuration

```properties
# Disable unclean leader election (recommended for production)
unclean.leader.election.enable=false

# Enable auto leader balancing
auto.leader.rebalance.enable=true
leader.imbalance.check.interval.seconds=300
leader.imbalance.per.broker.percentage=10
```

## Durability Guarantees

### Acks Settings Comparison

| acks | Durability | Latency | Throughput |
|------|------------|---------|------------|
| 0 | None | Lowest | Highest |
| 1 | Leader only | Low | High |
| all | Full ISR | Higher | Lower |

### Combining acks and min.insync.replicas

```
Replication Factor = 3
min.insync.replicas = 2
acks = all

Scenario 1: All brokers healthy
- Write succeeds when 2+ replicas acknowledge
- Full durability

Scenario 2: One broker down
- Write succeeds (2 remaining brokers >= min.insync.replicas)
- Reduced but acceptable durability

Scenario 3: Two brokers down
- Write fails (1 remaining < min.insync.replicas)
- Prevents data loss

```

## Rack-Aware Replication

### Configuration

```properties
# Broker configuration
broker.rack=us-east-1a

# Or for multiple racks
# broker-1: broker.rack=rack-1
# broker-2: broker.rack=rack-2
# broker-3: broker.rack=rack-3
```

### Verifying Rack Distribution

```java
public void checkRackDistribution(String topic) throws Exception {
    DescribeTopicsResult result = admin.describeTopics(Collections.singletonList(topic));
    TopicDescription description = result.topicNameValues().get(topic).get();

    DescribeClusterResult cluster = admin.describeCluster();
    Map<Integer, Node> nodes = new HashMap<>();
    for (Node node : cluster.nodes().get()) {
        nodes.put(node.id(), node);
    }

    for (TopicPartitionInfo partition : description.partitions()) {
        Set<String> racks = new HashSet<>();
        for (Node replica : partition.replicas()) {
            String rack = nodes.get(replica.id()).rack();
            racks.add(rack);
        }

        System.out.printf("Partition %d: replicas span %d racks: %s%n",
            partition.partition(), racks.size(), racks);

        if (racks.size() < partition.replicas().size()) {
            System.out.println("  WARNING: Not all replicas are in different racks");
        }
    }
}
```

## Reassigning Replicas

### Generate Reassignment Plan

```bash
# Create topics-to-move.json
echo '{"topics": [{"topic": "my-topic"}], "version": 1}' > topics-to-move.json

# Generate reassignment plan
kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \
  --topics-to-move-json-file topics-to-move.json \
  --broker-list "1,2,3,4" --generate
```

### Execute Reassignment

```bash
# Create reassignment.json with the generated plan
kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \
  --reassignment-json-file reassignment.json --execute

# Monitor progress
kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \
  --reassignment-json-file reassignment.json --verify
```

### Throttle Reassignment

```bash
# Set replication throttle
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type brokers --entity-default \
  --alter --add-config 'leader.replication.throttled.rate=100000000,follower.replication.throttled.rate=100000000'

# Clear throttle after completion
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type brokers --entity-default \
  --alter --delete-config 'leader.replication.throttled.rate,follower.replication.throttled.rate'
```

## Troubleshooting

### Under-Replicated Partitions

```bash
# Find under-replicated partitions
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --under-replicated-partitions
```

Common causes:
1. Broker is down or unreachable
2. Disk I/O bottleneck
3. Network issues
4. Insufficient replication threads

### ISR Not Growing

Check:
1. `replica.lag.time.max.ms` setting
2. Network connectivity
3. Disk space on followers
4. Replication thread count

### Leader Imbalance

```bash
# Check leader distribution
kafka-topics.sh --bootstrap-server localhost:9092 --describe | \
  grep "Leader:" | awk '{print $4}' | sort | uniq -c

# Trigger preferred leader election
kafka-leader-election.sh --bootstrap-server localhost:9092 \
  --election-type preferred --all-topic-partitions
```

## Best Practices

### 1. Use Replication Factor of 3

```bash
# Creates 3 copies of data
kafka-topics.sh --create --topic critical-data \
  --replication-factor 3 --partitions 12
```

### 2. Set min.insync.replicas to 2

```properties
# Ensures at least 2 replicas acknowledge
min.insync.replicas=2
```

### 3. Always Use acks=all for Critical Data

```java
props.put(ProducerConfig.ACKS_CONFIG, "all");
```

### 4. Disable Unclean Leader Election

```properties
unclean.leader.election.enable=false
```

### 5. Monitor ISR Health

- Alert on under-replicated partitions
- Track ISR shrink rate
- Monitor replication lag

## Conclusion

Kafka replication provides strong durability guarantees when configured correctly:

1. **Replication factor 3** with **min.insync.replicas 2** for critical data
2. **acks=all** on producers for durability
3. **Disable unclean leader election** to prevent data loss
4. **Rack-aware placement** for physical fault tolerance
5. **Monitor ISR health** continuously

Understanding these concepts ensures your Kafka cluster can survive broker failures without losing data.
