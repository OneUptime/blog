# How to Implement Kafka Rack Awareness

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Rack Awareness, High Availability, Fault Tolerance, Data Center, Replica Placement

Description: A comprehensive guide to implementing Apache Kafka rack awareness to spread replicas across failure domains for improved fault tolerance.

---

Rack awareness in Kafka ensures that partition replicas are distributed across different racks, availability zones, or data centers. This prevents a single rack failure from causing data loss or unavailability. This guide covers how to configure and verify rack-aware replica placement.

## Understanding Rack Awareness

Without rack awareness, Kafka may place all replicas of a partition on brokers in the same rack. If that rack fails, you lose access to the partition. Rack awareness distributes replicas across failure domains.

### Benefits

- **Improved fault tolerance**: Survive rack-level failures
- **Better availability**: Continue serving traffic during rack maintenance
- **Data durability**: Replicas in different racks protect against correlated failures

## Configuring Rack Awareness

### Broker Configuration

Each broker needs a rack identifier in its configuration:

```properties
# server.properties

# Unique broker ID
broker.id=1

# Rack identifier
broker.rack=rack1

# Other settings
# ...
```

For cloud deployments, use availability zones as rack IDs:

```properties
# AWS example
broker.rack=us-east-1a

# GCP example
broker.rack=us-central1-a

# Azure example
broker.rack=eastus-1
```

### Multi-Rack Cluster Setup

Example configuration for a 6-broker cluster across 3 racks:

```properties
# Broker 1 (Rack A)
broker.id=1
broker.rack=rack-a

# Broker 2 (Rack A)
broker.id=2
broker.rack=rack-a

# Broker 3 (Rack B)
broker.id=3
broker.rack=rack-b

# Broker 4 (Rack B)
broker.id=4
broker.rack=rack-b

# Broker 5 (Rack C)
broker.id=5
broker.rack=rack-c

# Broker 6 (Rack C)
broker.id=6
broker.rack=rack-c
```

## Verifying Rack Configuration

### Java Verification Tool

```java
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.common.Node;

import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

public class RackAwarenessVerifier {

    private final AdminClient adminClient;

    public RackAwarenessVerifier(String bootstrapServers) {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        this.adminClient = AdminClient.create(props);
    }

    public Map<Integer, String> getBrokerRacks()
            throws ExecutionException, InterruptedException {

        DescribeClusterResult cluster = adminClient.describeCluster();
        Collection<Node> nodes = cluster.nodes().get();

        Map<Integer, String> brokerRacks = new HashMap<>();
        for (Node node : nodes) {
            String rack = node.rack() != null ? node.rack() : "NO_RACK";
            brokerRacks.put(node.id(), rack);
        }

        return brokerRacks;
    }

    public boolean verifyRackDistribution(String topic)
            throws ExecutionException, InterruptedException {

        Map<Integer, String> brokerRacks = getBrokerRacks();

        TopicDescription description = adminClient
            .describeTopics(Collections.singletonList(topic))
            .topicNameValues()
            .get(topic)
            .get();

        boolean allDistributed = true;

        for (var partition : description.partitions()) {
            Set<String> racks = partition.replicas().stream()
                .map(node -> brokerRacks.getOrDefault(node.id(), "UNKNOWN"))
                .collect(Collectors.toSet());

            int numReplicas = partition.replicas().size();
            int numRacks = racks.size();

            if (numRacks < Math.min(numReplicas, brokerRacks.values().stream()
                    .collect(Collectors.toSet()).size())) {
                System.out.printf("WARNING: Partition %d has replicas in only %d rack(s): %s%n",
                    partition.partition(), numRacks, racks);
                allDistributed = false;
            }
        }

        return allDistributed;
    }

    public void printRackDistributionReport()
            throws ExecutionException, InterruptedException {

        Map<Integer, String> brokerRacks = getBrokerRacks();

        System.out.println("\n" + "=".repeat(60));
        System.out.println("RACK AWARENESS REPORT");
        System.out.println("=".repeat(60));

        // Print broker-to-rack mapping
        System.out.println("\nBroker Rack Assignment:");
        System.out.printf("%-12s %-20s%n", "Broker ID", "Rack");
        System.out.println("-".repeat(35));

        Map<String, List<Integer>> rackToBrokers = new HashMap<>();
        for (Map.Entry<Integer, String> entry : brokerRacks.entrySet()) {
            System.out.printf("%-12d %-20s%n", entry.getKey(), entry.getValue());
            rackToBrokers.computeIfAbsent(entry.getValue(), k -> new ArrayList<>())
                .add(entry.getKey());
        }

        // Print rack summary
        System.out.println("\nRack Summary:");
        System.out.printf("%-20s %-30s%n", "Rack", "Brokers");
        System.out.println("-".repeat(50));

        for (Map.Entry<String, List<Integer>> entry : rackToBrokers.entrySet()) {
            System.out.printf("%-20s %-30s%n", entry.getKey(), entry.getValue());
        }

        // Verify all topics
        System.out.println("\nTopic Rack Distribution:");
        Set<String> topics = adminClient.listTopics().names().get();

        for (String topic : topics) {
            if (topic.startsWith("__")) continue;

            boolean distributed = verifyRackDistribution(topic);
            String status = distributed ? "OK" : "NEEDS ATTENTION";
            System.out.printf("  %-40s %s%n", topic, status);
        }
    }

    public void close() {
        adminClient.close();
    }

    public static void main(String[] args) throws Exception {
        RackAwarenessVerifier verifier = new RackAwarenessVerifier("localhost:9092");
        try {
            verifier.printRackDistributionReport();
        } finally {
            verifier.close();
        }
    }
}
```

### Python Verification Tool

```python
from confluent_kafka.admin import AdminClient
from typing import Dict, List, Set
from collections import defaultdict

class RackAwarenessVerifier:
    def __init__(self, bootstrap_servers: str):
        self.admin_client = AdminClient({
            'bootstrap.servers': bootstrap_servers
        })

    def get_broker_racks(self) -> Dict[int, str]:
        """Get rack assignment for each broker."""
        metadata = self.admin_client.list_topics(timeout=10)
        broker_racks = {}

        for broker_id, broker in metadata.brokers.items():
            # Note: confluent-kafka may not expose rack info directly
            # This might need JMX or other mechanisms
            rack = getattr(broker, 'rack', None) or 'UNKNOWN'
            broker_racks[broker_id] = rack

        return broker_racks

    def verify_topic_rack_distribution(self, topic: str,
                                        broker_racks: Dict[int, str]) -> dict:
        """Verify rack distribution for a topic."""
        metadata = self.admin_client.list_topics(timeout=10)

        if topic not in metadata.topics:
            return {'error': f'Topic {topic} not found'}

        topic_metadata = metadata.topics[topic]
        results = {
            'topic': topic,
            'partitions': [],
            'well_distributed': True
        }

        unique_racks = set(broker_racks.values())
        num_racks = len(unique_racks)

        for partition_id, partition in topic_metadata.partitions.items():
            replica_racks = set()
            for replica in partition.replicas:
                rack = broker_racks.get(replica, 'UNKNOWN')
                replica_racks.add(rack)

            num_replicas = len(partition.replicas)
            expected_racks = min(num_replicas, num_racks)

            is_distributed = len(replica_racks) >= expected_racks

            results['partitions'].append({
                'partition': partition_id,
                'replicas': list(partition.replicas),
                'racks': list(replica_racks),
                'distributed': is_distributed
            })

            if not is_distributed:
                results['well_distributed'] = False

        return results

    def print_rack_report(self):
        """Print comprehensive rack awareness report."""
        metadata = self.admin_client.list_topics(timeout=10)

        print("\n" + "=" * 60)
        print("RACK AWARENESS REPORT")
        print("=" * 60)

        # Build broker-to-rack mapping (may need alternative method)
        broker_racks = {}
        rack_to_brokers = defaultdict(list)

        for broker_id, broker in metadata.brokers.items():
            # Try to get rack info
            rack = f"rack-{broker_id % 3 + 1}"  # Simulated for demo
            broker_racks[broker_id] = rack
            rack_to_brokers[rack].append(broker_id)

        print("\nBroker Rack Assignment:")
        print(f"{'Broker ID':<12} {'Host':<25} {'Rack':<15}")
        print("-" * 52)

        for broker_id, broker in sorted(metadata.brokers.items()):
            rack = broker_racks.get(broker_id, 'UNKNOWN')
            print(f"{broker_id:<12} {broker.host:<25} {rack:<15}")

        print("\nRack Summary:")
        print(f"{'Rack':<15} {'Brokers':<30}")
        print("-" * 45)

        for rack, brokers in sorted(rack_to_brokers.items()):
            print(f"{rack:<15} {str(brokers):<30}")

        # Check topic distribution
        print("\nTopic Rack Distribution:")
        for topic_name in sorted(metadata.topics.keys()):
            if topic_name.startswith('__'):
                continue

            result = self.verify_topic_rack_distribution(topic_name, broker_racks)
            status = "OK" if result.get('well_distributed', False) else "CHECK"
            print(f"  {topic_name:<40} {status}")


def main():
    verifier = RackAwarenessVerifier("localhost:9092")
    verifier.print_rack_report()


if __name__ == '__main__':
    main()
```

## Creating Topics with Rack Awareness

When creating topics, Kafka automatically distributes replicas across racks if rack awareness is configured:

```bash
# Create a topic with replication factor 3
# Kafka will automatically spread replicas across racks
bin/kafka-topics.sh --bootstrap-server localhost:9092 \
  --create \
  --topic my-topic \
  --partitions 12 \
  --replication-factor 3
```

### Verifying Replica Placement

```bash
# Check replica placement
bin/kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --topic my-topic
```

## Manual Replica Reassignment

If replicas are not well-distributed, you can manually reassign them:

### Generate Reassignment Plan

```java
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.common.TopicPartition;

import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

public class RackAwareReassignment {

    private final AdminClient adminClient;

    public RackAwareReassignment(String bootstrapServers) {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        this.adminClient = AdminClient.create(props);
    }

    public Map<TopicPartition, List<Integer>> generateRackAwarePlan(
            String topic, int replicationFactor)
            throws ExecutionException, InterruptedException {

        // Get broker-to-rack mapping
        Map<Integer, String> brokerRacks = new HashMap<>();
        Map<String, List<Integer>> rackToBrokers = new HashMap<>();

        DescribeClusterResult cluster = adminClient.describeCluster();
        for (var node : cluster.nodes().get()) {
            String rack = node.rack() != null ? node.rack() : "default";
            brokerRacks.put(node.id(), rack);
            rackToBrokers.computeIfAbsent(rack, k -> new ArrayList<>()).add(node.id());
        }

        // Get topic info
        TopicDescription description = adminClient
            .describeTopics(Collections.singletonList(topic))
            .topicNameValues()
            .get(topic)
            .get();

        Map<TopicPartition, List<Integer>> reassignment = new HashMap<>();
        List<String> racks = new ArrayList<>(rackToBrokers.keySet());
        Collections.sort(racks);

        for (var partition : description.partitions()) {
            TopicPartition tp = new TopicPartition(topic, partition.partition());
            List<Integer> newReplicas = new ArrayList<>();

            // Distribute across racks
            for (int i = 0; i < replicationFactor; i++) {
                String rack = racks.get(i % racks.size());
                List<Integer> brokersInRack = rackToBrokers.get(rack);

                // Find a broker not already selected
                for (int broker : brokersInRack) {
                    if (!newReplicas.contains(broker)) {
                        newReplicas.add(broker);
                        break;
                    }
                }
            }

            reassignment.put(tp, newReplicas);
        }

        return reassignment;
    }

    public void executeReassignment(Map<TopicPartition, List<Integer>> plan)
            throws ExecutionException, InterruptedException {

        Map<TopicPartition, Optional<NewPartitionReassignment>> reassignments =
            new HashMap<>();

        for (Map.Entry<TopicPartition, List<Integer>> entry : plan.entrySet()) {
            reassignments.put(entry.getKey(),
                Optional.of(new NewPartitionReassignment(entry.getValue())));
        }

        AlterPartitionReassignmentsResult result =
            adminClient.alterPartitionReassignments(reassignments);
        result.all().get();

        System.out.println("Reassignment initiated for " + plan.size() + " partitions");
    }

    public void close() {
        adminClient.close();
    }

    public static void main(String[] args) throws Exception {
        RackAwareReassignment reassignment =
            new RackAwareReassignment("localhost:9092");

        try {
            Map<TopicPartition, List<Integer>> plan =
                reassignment.generateRackAwarePlan("my-topic", 3);

            System.out.println("Reassignment plan:");
            for (Map.Entry<TopicPartition, List<Integer>> entry : plan.entrySet()) {
                System.out.printf("  %s: %s%n", entry.getKey(), entry.getValue());
            }

            // Uncomment to execute
            // reassignment.executeReassignment(plan);

        } finally {
            reassignment.close();
        }
    }
}
```

## Kubernetes Deployment with Rack Awareness

### Using Strimzi Operator

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: my-cluster
spec:
  kafka:
    replicas: 6
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
    rack:
      topologyKey: topology.kubernetes.io/zone
    storage:
      type: persistent-claim
      size: 100Gi
      class: fast-ssd
    template:
      pod:
        affinity:
          podAntiAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              - labelSelector:
                  matchExpressions:
                    - key: strimzi.io/name
                      operator: In
                      values:
                        - my-cluster-kafka
                topologyKey: topology.kubernetes.io/zone
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 50Gi
```

### Node Labels for Rack Assignment

```bash
# Label nodes with zone information
kubectl label node node1 topology.kubernetes.io/zone=zone-a
kubectl label node node2 topology.kubernetes.io/zone=zone-a
kubectl label node node3 topology.kubernetes.io/zone=zone-b
kubectl label node node4 topology.kubernetes.io/zone=zone-b
kubectl label node node5 topology.kubernetes.io/zone=zone-c
kubectl label node node6 topology.kubernetes.io/zone=zone-c
```

## Consumer Rack Awareness

Kafka 2.4+ supports consumer rack awareness for fetching from the nearest replica:

### Consumer Configuration

```java
Properties props = new Properties();
props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "broker1:9092,broker2:9092");
props.put(ConsumerConfig.GROUP_ID_CONFIG, "my-group");

// Enable rack-aware fetching
props.put(ConsumerConfig.CLIENT_RACK_CONFIG, "rack-a");

KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
```

### Python Consumer with Rack Awareness

```python
from confluent_kafka import Consumer

consumer = Consumer({
    'bootstrap.servers': 'broker1:9092,broker2:9092',
    'group.id': 'my-group',
    'client.rack': 'rack-a',  # Fetch from nearest replica
    'auto.offset.reset': 'earliest'
})
```

## Monitoring Rack Distribution

### Prometheus Metrics

```yaml
# prometheus-rules.yml
groups:
  - name: kafka-rack-awareness
    rules:
      - alert: KafkaReplicasNotDistributed
        expr: |
          count by(topic)(
            kafka_topic_partition_replicas_count
          ) <
          count(group by(rack)(kafka_server_broker_rack))
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Topic replicas not distributed across all racks"
```

## Best Practices

### 1. Ensure Sufficient Racks

Have at least as many racks as your replication factor:

```
Replication Factor = 3 -> At least 3 racks
```

### 2. Balance Brokers Across Racks

Distribute brokers evenly:

```
Rack A: Brokers 1, 2
Rack B: Brokers 3, 4
Rack C: Brokers 5, 6
```

### 3. Test Rack Failure Scenarios

```bash
# Simulate rack failure by stopping all brokers in a rack
# Then verify topics remain available
bin/kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --under-replicated-partitions
```

### 4. Use Rack-Aware Consumers

Configure consumers with their rack ID to reduce cross-rack traffic:

```properties
client.rack=rack-a
```

## Conclusion

Rack awareness is essential for building highly available Kafka clusters. By configuring broker rack IDs and verifying replica distribution, you can ensure that your cluster survives rack-level failures. Remember to balance brokers across racks, configure consumer rack awareness for optimal performance, and regularly verify that replicas are properly distributed. With proper rack awareness configuration, Kafka can provide strong fault tolerance guarantees even in the face of infrastructure failures.
