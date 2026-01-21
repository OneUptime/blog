# How to Expand a Kafka Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Cluster Expansion, Kafka Operations, Distributed Systems, Scalability

Description: A comprehensive guide to expanding Apache Kafka clusters by adding new brokers and rebalancing partitions for improved performance and capacity.

---

As your Apache Kafka workloads grow, you will eventually need to expand your cluster by adding new brokers. This guide covers the complete process of expanding a Kafka cluster, from planning to execution and verification.

## Understanding Kafka Cluster Expansion

When you add new brokers to a Kafka cluster, they do not automatically receive any partition replicas. Existing topics continue to use the original brokers until you explicitly reassign partitions. This means expansion is a two-step process:

1. Add new brokers to the cluster
2. Rebalance partitions across all brokers (including new ones)

## Prerequisites

Before expanding your cluster, ensure you have:

- Kafka installed and running (version 2.4+ recommended for KRaft, or ZooKeeper-based clusters)
- Administrative access to the cluster
- Sufficient disk space and network capacity on new brokers
- A maintenance window for partition reassignment

## Step 1: Configure New Brokers

Create the configuration file for each new broker. Here is an example `server.properties` for a new broker:

```properties
# Unique broker ID - must be unique across the cluster
broker.id=4

# Listeners
listeners=PLAINTEXT://new-broker-host:9092
advertised.listeners=PLAINTEXT://new-broker-host:9092

# Log directories
log.dirs=/var/kafka-logs

# ZooKeeper connection (for ZooKeeper-based clusters)
zookeeper.connect=zk1:2181,zk2:2181,zk3:2181/kafka

# For KRaft mode, use controller.quorum.voters instead
# controller.quorum.voters=1@controller1:9093,2@controller2:9093,3@controller3:9093

# Replication settings
default.replication.factor=3
min.insync.replicas=2

# Other recommended settings
num.partitions=12
log.retention.hours=168
log.segment.bytes=1073741824
```

## Step 2: Start New Brokers

Start each new broker using the Kafka startup script:

```bash
# Start the new broker
bin/kafka-server-start.sh -daemon config/server.properties

# Verify the broker joined the cluster
bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092 | grep "id:4"
```

## Step 3: Verify Cluster Membership

Check that all brokers are visible in the cluster:

```bash
# List all brokers in the cluster
bin/kafka-metadata.sh --snapshot /var/kafka-logs/__cluster_metadata-0/00000000000000000000.log --command "broker"

# Or using kafka-broker-api-versions
bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092
```

## Step 4: Generate Partition Reassignment Plan

Kafka provides the `kafka-reassign-partitions.sh` tool to create and execute reassignment plans.

First, create a JSON file listing the topics to rebalance:

```json
{
  "topics": [
    {"topic": "orders"},
    {"topic": "events"},
    {"topic": "logs"}
  ],
  "version": 1
}
```

Save this as `topics-to-move.json`, then generate a reassignment plan:

```bash
bin/kafka-reassign-partitions.sh \
  --bootstrap-server localhost:9092 \
  --topics-to-move-json-file topics-to-move.json \
  --broker-list "1,2,3,4" \
  --generate
```

This outputs two JSON plans:
- Current partition assignment (save this for rollback)
- Proposed partition assignment

Save the proposed assignment to `reassignment.json`.

## Step 5: Execute Partition Reassignment

Execute the reassignment plan:

```bash
bin/kafka-reassign-partitions.sh \
  --bootstrap-server localhost:9092 \
  --reassignment-json-file reassignment.json \
  --execute
```

### Throttling Reassignment

To prevent reassignment from overwhelming your cluster, apply throttling:

```bash
bin/kafka-reassign-partitions.sh \
  --bootstrap-server localhost:9092 \
  --reassignment-json-file reassignment.json \
  --execute \
  --throttle 50000000
```

The throttle value is in bytes per second (50MB/s in this example).

## Step 6: Monitor Reassignment Progress

Check the status of the reassignment:

```bash
bin/kafka-reassign-partitions.sh \
  --bootstrap-server localhost:9092 \
  --reassignment-json-file reassignment.json \
  --verify
```

## Automating Cluster Expansion with Java

Here is a Java program to automate partition reassignment:

```java
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.TopicPartitionReplica;

import java.util.*;
import java.util.concurrent.ExecutionException;

public class KafkaClusterExpander {

    private final AdminClient adminClient;

    public KafkaClusterExpander(String bootstrapServers) {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, 30000);
        this.adminClient = AdminClient.create(props);
    }

    public List<Integer> getClusterBrokers() throws ExecutionException, InterruptedException {
        DescribeClusterResult cluster = adminClient.describeCluster();
        List<Integer> brokerIds = new ArrayList<>();
        cluster.nodes().get().forEach(node -> brokerIds.add(node.id()));
        Collections.sort(brokerIds);
        return brokerIds;
    }

    public void rebalanceTopic(String topicName, List<Integer> targetBrokers)
            throws ExecutionException, InterruptedException {

        // Get current topic description
        DescribeTopicsResult topicsResult = adminClient.describeTopics(
            Collections.singletonList(topicName));
        TopicDescription description = topicsResult.topicNameValues()
            .get(topicName).get();

        // Create new assignment
        Map<TopicPartition, Optional<NewPartitionReassignment>> reassignments = new HashMap<>();

        int numBrokers = targetBrokers.size();
        int replicationFactor = description.partitions().get(0).replicas().size();

        for (int partition = 0; partition < description.partitions().size(); partition++) {
            List<Integer> newReplicas = new ArrayList<>();

            // Distribute replicas across brokers using round-robin
            for (int r = 0; r < replicationFactor; r++) {
                int brokerIndex = (partition + r) % numBrokers;
                newReplicas.add(targetBrokers.get(brokerIndex));
            }

            TopicPartition tp = new TopicPartition(topicName, partition);
            reassignments.put(tp, Optional.of(new NewPartitionReassignment(newReplicas)));
        }

        // Execute reassignment
        AlterPartitionReassignmentsResult result =
            adminClient.alterPartitionReassignments(reassignments);
        result.all().get();

        System.out.println("Reassignment started for topic: " + topicName);
    }

    public void monitorReassignment(String topicName)
            throws ExecutionException, InterruptedException {

        DescribeTopicsResult topicsResult = adminClient.describeTopics(
            Collections.singletonList(topicName));
        TopicDescription description = topicsResult.topicNameValues()
            .get(topicName).get();

        Set<TopicPartition> partitions = new HashSet<>();
        for (int i = 0; i < description.partitions().size(); i++) {
            partitions.add(new TopicPartition(topicName, i));
        }

        ListPartitionReassignmentsResult reassignmentResult =
            adminClient.listPartitionReassignments(partitions);
        Map<TopicPartition, PartitionReassignment> ongoing =
            reassignmentResult.reassignments().get();

        if (ongoing.isEmpty()) {
            System.out.println("No ongoing reassignments for topic: " + topicName);
        } else {
            ongoing.forEach((tp, reassignment) -> {
                System.out.printf("Partition %d: adding=%s, removing=%s%n",
                    tp.partition(),
                    reassignment.addingReplicas(),
                    reassignment.removingReplicas());
            });
        }
    }

    public void close() {
        adminClient.close();
    }

    public static void main(String[] args) throws Exception {
        KafkaClusterExpander expander = new KafkaClusterExpander("localhost:9092");

        try {
            // Get all brokers including newly added ones
            List<Integer> brokers = expander.getClusterBrokers();
            System.out.println("Cluster brokers: " + brokers);

            // Rebalance a topic across all brokers
            expander.rebalanceTopic("my-topic", brokers);

            // Monitor progress
            Thread.sleep(5000);
            expander.monitorReassignment("my-topic");

        } finally {
            expander.close();
        }
    }
}
```

## Automating Cluster Expansion with Python

Here is a Python implementation using `kafka-python` and `confluent-kafka`:

```python
from confluent_kafka.admin import AdminClient, NewPartitions
from confluent_kafka import KafkaException
import json
import time

class KafkaClusterExpander:
    def __init__(self, bootstrap_servers: str):
        self.admin_client = AdminClient({
            'bootstrap.servers': bootstrap_servers,
            'request.timeout.ms': 30000
        })

    def get_cluster_brokers(self) -> list:
        """Get list of all broker IDs in the cluster."""
        metadata = self.admin_client.list_topics(timeout=10)
        brokers = [broker.id for broker in metadata.brokers.values()]
        return sorted(brokers)

    def get_topic_partitions(self, topic_name: str) -> dict:
        """Get current partition assignment for a topic."""
        metadata = self.admin_client.list_topics(timeout=10)

        if topic_name not in metadata.topics:
            raise ValueError(f"Topic {topic_name} not found")

        topic_metadata = metadata.topics[topic_name]
        partitions = {}

        for partition_id, partition_metadata in topic_metadata.partitions.items():
            partitions[partition_id] = {
                'leader': partition_metadata.leader,
                'replicas': list(partition_metadata.replicas),
                'isrs': list(partition_metadata.isrs)
            }

        return partitions

    def generate_reassignment_plan(self, topic_name: str, target_brokers: list) -> dict:
        """Generate a balanced partition reassignment plan."""
        current_partitions = self.get_topic_partitions(topic_name)
        num_partitions = len(current_partitions)
        replication_factor = len(current_partitions[0]['replicas'])
        num_brokers = len(target_brokers)

        reassignment = {
            "version": 1,
            "partitions": []
        }

        for partition_id in range(num_partitions):
            new_replicas = []
            for r in range(replication_factor):
                broker_index = (partition_id + r) % num_brokers
                new_replicas.append(target_brokers[broker_index])

            reassignment["partitions"].append({
                "topic": topic_name,
                "partition": partition_id,
                "replicas": new_replicas
            })

        return reassignment

    def print_partition_distribution(self, topics: list = None):
        """Print current partition distribution across brokers."""
        metadata = self.admin_client.list_topics(timeout=10)

        broker_partitions = {}
        for broker in metadata.brokers.values():
            broker_partitions[broker.id] = {'leader': 0, 'replica': 0}

        topics_to_check = topics if topics else list(metadata.topics.keys())

        for topic_name in topics_to_check:
            if topic_name.startswith('__'):
                continue

            topic = metadata.topics.get(topic_name)
            if not topic:
                continue

            for partition_metadata in topic.partitions.values():
                leader = partition_metadata.leader
                if leader in broker_partitions:
                    broker_partitions[leader]['leader'] += 1

                for replica in partition_metadata.replicas:
                    if replica in broker_partitions:
                        broker_partitions[replica]['replica'] += 1

        print("\nPartition Distribution:")
        print("-" * 50)
        print(f"{'Broker ID':<12} {'Leaders':<12} {'Replicas':<12}")
        print("-" * 50)

        for broker_id, counts in sorted(broker_partitions.items()):
            print(f"{broker_id:<12} {counts['leader']:<12} {counts['replica']:<12}")

    def wait_for_reassignment(self, topic_name: str, timeout_seconds: int = 300):
        """Wait for partition reassignment to complete."""
        start_time = time.time()

        while time.time() - start_time < timeout_seconds:
            partitions = self.get_topic_partitions(topic_name)

            all_synced = True
            for partition_id, info in partitions.items():
                if set(info['replicas']) != set(info['isrs']):
                    all_synced = False
                    print(f"Partition {partition_id}: waiting for ISR sync "
                          f"(replicas={info['replicas']}, isrs={info['isrs']})")
                    break

            if all_synced:
                print(f"Reassignment complete for topic: {topic_name}")
                return True

            time.sleep(5)

        print(f"Timeout waiting for reassignment to complete")
        return False


def main():
    expander = KafkaClusterExpander("localhost:9092")

    # Get current broker list
    brokers = expander.get_cluster_brokers()
    print(f"Current cluster brokers: {brokers}")

    # Show current partition distribution
    expander.print_partition_distribution()

    # Generate reassignment plan for a topic
    topic_name = "my-topic"
    plan = expander.generate_reassignment_plan(topic_name, brokers)

    # Save plan to file for use with kafka-reassign-partitions.sh
    with open("reassignment.json", "w") as f:
        json.dump(plan, f, indent=2)

    print(f"\nReassignment plan saved to reassignment.json")
    print("Execute with:")
    print("  kafka-reassign-partitions.sh --bootstrap-server localhost:9092 "
          "--reassignment-json-file reassignment.json --execute")


if __name__ == "__main__":
    main()
```

## Using Cruise Control for Automated Rebalancing

LinkedIn's Cruise Control is an excellent tool for automating Kafka cluster rebalancing:

```bash
# Install Cruise Control
git clone https://github.com/linkedin/cruise-control.git
cd cruise-control
./gradlew jar

# Configure Cruise Control
cat > config/cruisecontrol.properties << EOF
bootstrap.servers=localhost:9092
zookeeper.connect=localhost:2181
num.metric.fetchers=1
metric.sampler.class=com.linkedin.kafka.cruisecontrol.monitor.sampling.CruiseControlMetricsReporterSampler
sample.store.class=com.linkedin.kafka.cruisecontrol.monitor.sampling.KafkaSampleStore
EOF

# Start Cruise Control
./kafka-cruise-control-start.sh config/cruisecontrol.properties

# Trigger rebalance via REST API
curl -X POST 'http://localhost:9090/kafkacruisecontrol/rebalance?dryrun=false'
```

## Best Practices for Cluster Expansion

### 1. Plan for Capacity

Before adding brokers, calculate the expected load distribution:

```python
def calculate_partition_distribution(num_partitions: int,
                                      replication_factor: int,
                                      num_brokers: int) -> dict:
    """Calculate expected partition distribution after rebalancing."""
    total_replicas = num_partitions * replication_factor
    replicas_per_broker = total_replicas // num_brokers
    extra_replicas = total_replicas % num_brokers

    distribution = {}
    for i in range(num_brokers):
        distribution[f"broker_{i}"] = replicas_per_broker + (1 if i < extra_replicas else 0)

    return distribution


# Example: 100 partitions, RF=3, expanding from 3 to 5 brokers
print("Before expansion (3 brokers):")
print(calculate_partition_distribution(100, 3, 3))

print("\nAfter expansion (5 brokers):")
print(calculate_partition_distribution(100, 3, 5))
```

### 2. Throttle Reassignment Traffic

Always throttle reassignment to avoid impacting production traffic:

```bash
# Set throttle to 100MB/s per broker
bin/kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type brokers \
  --entity-default \
  --alter \
  --add-config follower.replication.throttled.rate=104857600,leader.replication.throttled.rate=104857600
```

### 3. Monitor During Reassignment

Watch these key metrics during reassignment:

- `kafka.server:type=BrokerTopicMetrics,name=BytesInPerSec`
- `kafka.server:type=BrokerTopicMetrics,name=BytesOutPerSec`
- `kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions`
- `kafka.network:type=RequestMetrics,name=RequestQueueTimeMs`

### 4. Verify After Expansion

After reassignment completes, verify the cluster health:

```bash
# Check for under-replicated partitions
bin/kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --under-replicated-partitions

# Verify leader distribution
bin/kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe | grep -o "Leader: [0-9]*" | sort | uniq -c
```

## Troubleshooting Common Issues

### New Broker Not Joining Cluster

If a new broker fails to join:

1. Check broker logs for errors
2. Verify ZooKeeper/Controller connectivity
3. Ensure broker.id is unique
4. Check network connectivity between brokers

### Reassignment Stuck

If reassignment is not progressing:

```bash
# Check reassignment status
bin/kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \
  --reassignment-json-file reassignment.json --verify

# Check for under-replicated partitions
bin/kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --under-replicated-partitions

# Increase throttle if it is too low
bin/kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type brokers --entity-default \
  --alter --add-config leader.replication.throttled.rate=209715200
```

## Conclusion

Expanding a Kafka cluster requires careful planning and execution. The key steps are adding new brokers with proper configuration, generating a balanced partition reassignment plan, executing the reassignment with appropriate throttling, and monitoring the process until completion. Using tools like Cruise Control can automate much of this process and ensure optimal partition distribution across your cluster.

Remember to always test your expansion process in a staging environment before applying it to production, and maintain a rollback plan in case issues arise during the expansion.
