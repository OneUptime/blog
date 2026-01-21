# How to Troubleshoot Kafka Under-Replicated Partitions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Kafka, Under-Replicated Partitions, Troubleshooting, Replication, High Availability, Operations

Description: Learn how to diagnose and fix under-replicated partitions in Kafka, including common causes, monitoring strategies, and remediation steps for maintaining data durability.

---

Under-replicated partitions (URP) indicate that some partition replicas are not in sync with the leader. This is a critical health metric that requires immediate attention to maintain data durability.

## Understanding Under-Replicated Partitions

```
Partition 0 - Healthy:
Leader: Broker 1, ISR: [1, 2, 3]
Replicas: [1, 2, 3]

Partition 1 - Under-Replicated:
Leader: Broker 1, ISR: [1, 2]    <- Missing broker 3
Replicas: [1, 2, 3]
```

## Detecting Under-Replicated Partitions

### Kafka CLI

```bash
# List under-replicated partitions
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --under-replicated-partitions

# Describe specific topic
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --topic orders

# Output:
# Topic: orders  Partition: 0  Leader: 1  Replicas: 1,2,3  Isr: 1,2
```

### JMX Metrics

```bash
# Key metrics to monitor
kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions
kafka.server:type=ReplicaManager,name=UnderMinIsrPartitionCount
kafka.controller:type=KafkaController,name=OfflinePartitionsCount
```

### Java Admin Client

```java
public class PartitionHealthCheck {
    public List<TopicPartition> getUnderReplicatedPartitions(AdminClient admin)
            throws Exception {

        List<TopicPartition> underReplicated = new ArrayList<>();

        // Get all topics
        Set<String> topics = admin.listTopics().names().get();

        // Describe topics
        Map<String, TopicDescription> descriptions =
            admin.describeTopics(topics).allTopicNames().get();

        for (TopicDescription desc : descriptions.values()) {
            for (TopicPartitionInfo partition : desc.partitions()) {
                // Compare ISR size with replica count
                if (partition.isr().size() < partition.replicas().size()) {
                    underReplicated.add(new TopicPartition(
                        desc.name(), partition.partition()));

                    System.out.printf("Under-replicated: %s-%d, ISR: %d/%d%n",
                        desc.name(), partition.partition(),
                        partition.isr().size(), partition.replicas().size());
                }
            }
        }

        return underReplicated;
    }
}
```

## Common Causes and Solutions

### 1. Broker Down or Unreachable

```bash
# Check broker status
kafka-broker-api-versions.sh --bootstrap-server broker1:9092,broker2:9092,broker3:9092

# Check broker logs
tail -f /var/log/kafka/server.log | grep -i error
```

**Solution**: Restart the broker or investigate network issues.

### 2. Slow Broker (Disk or Network)

```bash
# Check disk I/O
iostat -x 5

# Check network
sar -n DEV 5

# Check broker lag
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group __kafka_replica_fetcher
```

**Solution**: Investigate disk performance, network latency, or hardware issues.

### 3. Configuration Issues

```properties
# Check these broker settings
replica.lag.time.max.ms=30000      # Max time before replica removed from ISR
replica.fetch.max.bytes=1048576    # Max bytes per fetch
num.replica.fetchers=1             # Number of fetcher threads

# Increase for slow networks/large messages
replica.lag.time.max.ms=60000
replica.fetch.max.bytes=10485760
num.replica.fetchers=4
```

### 4. Unbalanced Partitions

```bash
# Check partition distribution
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --topic orders | grep -c "Leader: 1"

# Rebalance with kafka-reassign-partitions
kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \
  --reassignment-json-file reassignment.json \
  --execute
```

### 5. Log Segment Issues

```bash
# Check for corrupt segments
kafka-log-dirs.sh --bootstrap-server localhost:9092 \
  --describe --topic-list orders

# Look for error logs
grep -i "corrupt\|error\|exception" /var/log/kafka/server.log
```

## Remediation Steps

### Step 1: Identify Affected Partitions

```bash
# Get list of under-replicated partitions
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --under-replicated-partitions > urp_list.txt
```

### Step 2: Check Broker Health

```bash
# Check all brokers
for broker in broker1 broker2 broker3; do
  echo "Checking $broker..."
  kafka-broker-api-versions.sh --bootstrap-server $broker:9092 2>&1 | head -5
done
```

### Step 3: Check ISR Status

```bash
# Get detailed ISR info
kafka-metadata.sh --snapshot /var/kafka-logs/__cluster_metadata-0/00000000000000000000.log \
  --command "cat /brokers/topics/orders/partitions/0/state"
```

### Step 4: Monitor Recovery

```bash
# Watch ISR changes
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --topic orders

# Monitor replication lag
watch -n 5 'kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group __kafka_replica_fetcher 2>/dev/null'
```

## Preventive Measures

### Monitoring Alerts

```yaml
# Prometheus alert rules
groups:
  - name: kafka_replication
    rules:
      - alert: KafkaUnderReplicatedPartitions
        expr: kafka_server_replicamanager_underreplicatedpartitions > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Kafka under-replicated partitions detected"

      - alert: KafkaOfflinePartitions
        expr: kafka_controller_kafkacontroller_offlinepartitionscount > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Kafka offline partitions detected"
```

### Configuration Best Practices

```properties
# Broker settings for reliability
min.insync.replicas=2
unclean.leader.election.enable=false
default.replication.factor=3

# Tune for your network
replica.lag.time.max.ms=30000
replica.socket.timeout.ms=30000
replica.socket.receive.buffer.bytes=65536
```

## Recovery Procedures

### Restart Failing Broker

```bash
# Graceful shutdown
kafka-server-stop.sh

# Clear checkpoint if needed
rm /var/kafka-logs/replication-offset-checkpoint

# Start broker
kafka-server-start.sh -daemon config/server.properties

# Verify recovery
watch 'kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --under-replicated-partitions | wc -l'
```

### Force Leader Election

```bash
# Trigger preferred leader election
kafka-leader-election.sh --bootstrap-server localhost:9092 \
  --election-type preferred --all-topic-partitions

# Or for specific partition
kafka-leader-election.sh --bootstrap-server localhost:9092 \
  --election-type preferred \
  --topic orders --partition 0
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Monitor continuously | Alert on URP count > 0 |
| Avoid unclean elections | Set unclean.leader.election.enable=false |
| Use min.insync.replicas | Ensure writes go to multiple replicas |
| Regular health checks | Automate partition health monitoring |
| Capacity planning | Ensure brokers have adequate resources |

Under-replicated partitions indicate potential data durability issues and should be addressed immediately to maintain Kafka cluster health.
