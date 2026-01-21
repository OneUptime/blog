# How to Upgrade Kafka Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Upgrade, Rolling Upgrade, Kafka Operations, Version Compatibility, Zero Downtime

Description: A comprehensive guide to upgrading Apache Kafka clusters without downtime using rolling upgrades, covering version compatibility, protocol versioning, and best practices.

---

Upgrading Apache Kafka in production requires careful planning to ensure zero downtime and data integrity. This guide covers the complete process of performing rolling upgrades, including pre-upgrade checks, protocol version management, and post-upgrade verification.

## Understanding Kafka Upgrades

Kafka supports rolling upgrades, which means you can upgrade brokers one at a time while the cluster continues to serve traffic. The key to successful upgrades is understanding the inter-broker protocol version and the client-broker protocol version.

### Version Compatibility

Kafka maintains backward compatibility between versions. When upgrading:

- Brokers can communicate with brokers running the previous minor version
- Clients can communicate with brokers running newer versions
- New features are only available after all brokers are upgraded and protocol versions are bumped

## Pre-Upgrade Checklist

Before starting the upgrade, complete these checks:

### 1. Review Release Notes

Check the release notes for your target version to understand:
- Breaking changes
- Deprecated features
- Required configuration changes
- Known issues

### 2. Verify Cluster Health

```bash
# Check for under-replicated partitions
bin/kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --under-replicated-partitions

# Check broker status
bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092

# Verify controller status
bin/kafka-metadata.sh --snapshot /var/kafka-logs/__cluster_metadata-0/00000000000000000000.log \
  --command "controller"
```

### 3. Backup Configuration

```bash
# Backup broker configurations
cp -r /etc/kafka/server.properties /etc/kafka/server.properties.backup

# Export topic configurations
bin/kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics --describe --all > topic-configs-backup.txt

# Export ACLs if using security
bin/kafka-acls.sh --bootstrap-server localhost:9092 \
  --list > acls-backup.txt
```

### 4. Test in Staging

Always test the upgrade process in a staging environment that mirrors production.

## Rolling Upgrade Process

### Step 1: Download New Version

```bash
# Download Kafka
wget https://downloads.apache.org/kafka/3.7.0/kafka_2.13-3.7.0.tgz
tar -xzf kafka_2.13-3.7.0.tgz
cd kafka_2.13-3.7.0
```

### Step 2: Set Inter-Broker Protocol Version

Before upgrading, ensure the inter-broker protocol version is set to the current version. This allows mixed-version clusters to communicate properly.

Add to `server.properties` on all brokers:

```properties
# For upgrading from 3.5 to 3.7
inter.broker.protocol.version=3.5
log.message.format.version=3.5
```

### Step 3: Upgrade Brokers One at a Time

For each broker:

```bash
# 1. Stop the broker gracefully
bin/kafka-server-stop.sh

# 2. Wait for partition leadership to transfer
# Monitor until the broker has no leaders
bin/kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe | grep "Leader: $BROKER_ID" | wc -l

# 3. Update broker binaries
cp -r /opt/kafka-new/* /opt/kafka/

# 4. Start the broker with new version
bin/kafka-server-start.sh -daemon config/server.properties

# 5. Wait for broker to rejoin and sync
bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092 | grep "$BROKER_ID"

# 6. Wait for ISR to be complete
bin/kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --under-replicated-partitions
```

### Step 4: Bump Protocol Version

After all brokers are upgraded:

```properties
# Update inter.broker.protocol.version to new version
inter.broker.protocol.version=3.7
log.message.format.version=3.7
```

Perform another rolling restart to apply the new protocol version.

## Java Implementation for Upgrade Automation

Here is a Java program to automate and monitor the upgrade process:

```java
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.common.Node;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.TopicPartitionInfo;

import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

public class KafkaUpgradeManager {

    private final AdminClient adminClient;
    private final String bootstrapServers;

    public KafkaUpgradeManager(String bootstrapServers) {
        this.bootstrapServers = bootstrapServers;
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, 30000);
        this.adminClient = AdminClient.create(props);
    }

    public boolean isClusterHealthy() throws ExecutionException, InterruptedException {
        // Check for under-replicated partitions
        Map<String, TopicDescription> topics = adminClient.describeTopics(
            adminClient.listTopics().names().get()
        ).allTopicNames().get();

        for (TopicDescription topic : topics.values()) {
            for (TopicPartitionInfo partition : topic.partitions()) {
                if (partition.isr().size() < partition.replicas().size()) {
                    System.out.printf("Under-replicated: %s-%d (ISR: %d, Replicas: %d)%n",
                        topic.name(), partition.partition(),
                        partition.isr().size(), partition.replicas().size());
                    return false;
                }
            }
        }
        return true;
    }

    public Map<Integer, List<TopicPartition>> getLeaderPartitions()
            throws ExecutionException, InterruptedException {

        Map<Integer, List<TopicPartition>> brokerLeaders = new HashMap<>();

        Map<String, TopicDescription> topics = adminClient.describeTopics(
            adminClient.listTopics().names().get()
        ).allTopicNames().get();

        for (TopicDescription topic : topics.values()) {
            for (TopicPartitionInfo partition : topic.partitions()) {
                int leaderId = partition.leader().id();
                brokerLeaders.computeIfAbsent(leaderId, k -> new ArrayList<>())
                    .add(new TopicPartition(topic.name(), partition.partition()));
            }
        }

        return brokerLeaders;
    }

    public void waitForBrokerDrain(int brokerId, int timeoutSeconds)
            throws ExecutionException, InterruptedException {

        System.out.printf("Waiting for broker %d to drain leaders...%n", brokerId);
        long startTime = System.currentTimeMillis();
        long timeoutMs = timeoutSeconds * 1000L;

        while (System.currentTimeMillis() - startTime < timeoutMs) {
            Map<Integer, List<TopicPartition>> leaders = getLeaderPartitions();
            List<TopicPartition> brokerLeaders = leaders.getOrDefault(brokerId, Collections.emptyList());

            if (brokerLeaders.isEmpty()) {
                System.out.printf("Broker %d has no leaders, safe to upgrade%n", brokerId);
                return;
            }

            System.out.printf("Broker %d still has %d leader partitions%n",
                brokerId, brokerLeaders.size());
            Thread.sleep(5000);
        }

        throw new RuntimeException("Timeout waiting for broker " + brokerId + " to drain");
    }

    public void waitForISRComplete(int timeoutSeconds)
            throws ExecutionException, InterruptedException {

        System.out.println("Waiting for all partitions to be in-sync...");
        long startTime = System.currentTimeMillis();
        long timeoutMs = timeoutSeconds * 1000L;

        while (System.currentTimeMillis() - startTime < timeoutMs) {
            if (isClusterHealthy()) {
                System.out.println("All partitions are in-sync");
                return;
            }
            Thread.sleep(5000);
        }

        throw new RuntimeException("Timeout waiting for ISR to complete");
    }

    public List<Node> getBrokers() throws ExecutionException, InterruptedException {
        DescribeClusterResult cluster = adminClient.describeCluster();
        return new ArrayList<>(cluster.nodes().get());
    }

    public void printUpgradeStatus() throws ExecutionException, InterruptedException {
        List<Node> brokers = getBrokers();
        Map<Integer, List<TopicPartition>> leaders = getLeaderPartitions();

        System.out.println("\n=== Cluster Status ===");
        System.out.printf("%-12s %-30s %-10s %-10s%n",
            "Broker ID", "Host", "Port", "Leaders");
        System.out.println("-".repeat(65));

        for (Node broker : brokers) {
            int leaderCount = leaders.getOrDefault(broker.id(), Collections.emptyList()).size();
            System.out.printf("%-12d %-30s %-10d %-10d%n",
                broker.id(), broker.host(), broker.port(), leaderCount);
        }

        System.out.println("\nCluster healthy: " + isClusterHealthy());
    }

    public void close() {
        adminClient.close();
    }

    public static void main(String[] args) throws Exception {
        KafkaUpgradeManager manager = new KafkaUpgradeManager("localhost:9092");

        try {
            // Print current status
            manager.printUpgradeStatus();

            // Check cluster health before upgrade
            if (!manager.isClusterHealthy()) {
                System.err.println("Cluster is not healthy. Fix issues before upgrading.");
                System.exit(1);
            }

            // Example: Wait for broker 1 to be ready for upgrade
            // manager.waitForBrokerDrain(1, 300);

            // After broker restart, wait for ISR
            // manager.waitForISRComplete(600);

        } finally {
            manager.close();
        }
    }
}
```

## Python Implementation

Here is a Python script for monitoring and automating upgrades:

```python
from confluent_kafka.admin import AdminClient
from confluent_kafka import KafkaException
import time
import sys
from typing import Dict, List, Set, Tuple

class KafkaUpgradeManager:
    def __init__(self, bootstrap_servers: str):
        self.admin_client = AdminClient({
            'bootstrap.servers': bootstrap_servers,
            'request.timeout.ms': 30000
        })

    def get_cluster_metadata(self):
        """Get cluster metadata including brokers and topics."""
        return self.admin_client.list_topics(timeout=10)

    def get_under_replicated_partitions(self) -> List[Tuple[str, int]]:
        """Get list of under-replicated partitions."""
        metadata = self.get_cluster_metadata()
        under_replicated = []

        for topic_name, topic_metadata in metadata.topics.items():
            if topic_name.startswith('__'):
                continue

            for partition_id, partition in topic_metadata.partitions.items():
                replicas = set(partition.replicas)
                isrs = set(partition.isrs)

                if isrs != replicas:
                    under_replicated.append((topic_name, partition_id))

        return under_replicated

    def is_cluster_healthy(self) -> bool:
        """Check if the cluster has no under-replicated partitions."""
        under_replicated = self.get_under_replicated_partitions()
        if under_replicated:
            print(f"Under-replicated partitions: {len(under_replicated)}")
            for topic, partition in under_replicated[:5]:
                print(f"  - {topic}-{partition}")
            if len(under_replicated) > 5:
                print(f"  ... and {len(under_replicated) - 5} more")
            return False
        return True

    def get_leader_distribution(self) -> Dict[int, int]:
        """Get the number of leader partitions per broker."""
        metadata = self.get_cluster_metadata()
        leader_counts = {}

        for broker in metadata.brokers.values():
            leader_counts[broker.id] = 0

        for topic_name, topic_metadata in metadata.topics.items():
            if topic_name.startswith('__'):
                continue

            for partition in topic_metadata.partitions.values():
                leader_id = partition.leader
                if leader_id in leader_counts:
                    leader_counts[leader_id] += 1

        return leader_counts

    def wait_for_broker_drain(self, broker_id: int, timeout_seconds: int = 300) -> bool:
        """Wait for a broker to have no leader partitions."""
        print(f"Waiting for broker {broker_id} to drain leaders...")
        start_time = time.time()

        while time.time() - start_time < timeout_seconds:
            leaders = self.get_leader_distribution()
            leader_count = leaders.get(broker_id, 0)

            if leader_count == 0:
                print(f"Broker {broker_id} has no leaders, safe to upgrade")
                return True

            print(f"Broker {broker_id} still has {leader_count} leader partitions")
            time.sleep(5)

        print(f"Timeout: Broker {broker_id} still has leader partitions")
        return False

    def wait_for_isr_complete(self, timeout_seconds: int = 600) -> bool:
        """Wait for all partitions to be fully in-sync."""
        print("Waiting for all partitions to be in-sync...")
        start_time = time.time()

        while time.time() - start_time < timeout_seconds:
            if self.is_cluster_healthy():
                print("All partitions are in-sync")
                return True
            time.sleep(5)

        print("Timeout: Some partitions are still under-replicated")
        return False

    def print_cluster_status(self):
        """Print current cluster status."""
        metadata = self.get_cluster_metadata()
        leaders = self.get_leader_distribution()

        print("\n" + "=" * 60)
        print("CLUSTER STATUS")
        print("=" * 60)

        print(f"\n{'Broker ID':<12} {'Host':<30} {'Port':<8} {'Leaders':<10}")
        print("-" * 60)

        for broker in sorted(metadata.brokers.values(), key=lambda b: b.id):
            leader_count = leaders.get(broker.id, 0)
            print(f"{broker.id:<12} {broker.host:<30} {broker.port:<8} {leader_count:<10}")

        print("\n" + "-" * 60)
        print(f"Total brokers: {len(metadata.brokers)}")
        print(f"Total topics: {len([t for t in metadata.topics if not t.startswith('__')])}")
        print(f"Cluster healthy: {self.is_cluster_healthy()}")
        print("=" * 60)

    def generate_upgrade_script(self, broker_order: List[int]) -> str:
        """Generate a shell script for rolling upgrade."""
        script = """#!/bin/bash
set -e

# Kafka Rolling Upgrade Script
# Generated by KafkaUpgradeManager

KAFKA_HOME=/opt/kafka
NEW_KAFKA_HOME=/opt/kafka-new
BOOTSTRAP_SERVER=localhost:9092

check_cluster_health() {
    echo "Checking cluster health..."
    $KAFKA_HOME/bin/kafka-topics.sh --bootstrap-server $BOOTSTRAP_SERVER \\
        --describe --under-replicated-partitions 2>&1 | grep -q "^$"
}

wait_for_isr() {
    local max_wait=600
    local waited=0
    while ! check_cluster_health; do
        if [ $waited -ge $max_wait ]; then
            echo "ERROR: Timeout waiting for ISR to complete"
            exit 1
        fi
        echo "Waiting for ISR... ($waited seconds)"
        sleep 10
        waited=$((waited + 10))
    done
    echo "Cluster is healthy"
}

upgrade_broker() {
    local broker_id=$1
    echo ""
    echo "=========================================="
    echo "Upgrading broker $broker_id"
    echo "=========================================="

    # Trigger controlled shutdown
    echo "Stopping broker $broker_id..."
    ssh broker-$broker_id "$KAFKA_HOME/bin/kafka-server-stop.sh"
    sleep 10

    # Update binaries
    echo "Updating binaries on broker $broker_id..."
    ssh broker-$broker_id "cp -r $NEW_KAFKA_HOME/* $KAFKA_HOME/"

    # Start broker
    echo "Starting broker $broker_id..."
    ssh broker-$broker_id "$KAFKA_HOME/bin/kafka-server-start.sh -daemon $KAFKA_HOME/config/server.properties"

    # Wait for broker to rejoin
    echo "Waiting for broker $broker_id to rejoin..."
    sleep 30

    # Wait for ISR
    wait_for_isr

    echo "Broker $broker_id upgraded successfully"
}

# Pre-upgrade checks
echo "Performing pre-upgrade checks..."
if ! check_cluster_health; then
    echo "ERROR: Cluster is not healthy. Fix issues before upgrading."
    exit 1
fi
echo "Pre-upgrade checks passed"

"""
        for broker_id in broker_order:
            script += f"upgrade_broker {broker_id}\n"

        script += """
echo ""
echo "=========================================="
echo "All brokers upgraded successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Verify cluster health"
echo "2. Update inter.broker.protocol.version"
echo "3. Perform another rolling restart"
"""
        return script


def main():
    manager = KafkaUpgradeManager("localhost:9092")

    # Print current status
    manager.print_cluster_status()

    # Check cluster health
    if not manager.is_cluster_healthy():
        print("\nWARNING: Cluster has under-replicated partitions.")
        print("Please fix these issues before upgrading.")
        sys.exit(1)

    # Generate upgrade script
    metadata = manager.get_cluster_metadata()
    broker_ids = sorted([b.id for b in metadata.brokers.values()])

    script = manager.generate_upgrade_script(broker_ids)
    with open("rolling-upgrade.sh", "w") as f:
        f.write(script)

    print("\nUpgrade script generated: rolling-upgrade.sh")
    print("Review and execute the script to perform the rolling upgrade.")


if __name__ == "__main__":
    main()
```

## Controlled Shutdown

Kafka supports controlled shutdown, which ensures clean handoff of partition leadership before a broker stops:

```properties
# Enable controlled shutdown in server.properties
controlled.shutdown.enable=true
controlled.shutdown.max.retries=3
controlled.shutdown.retry.backoff.ms=5000
```

When controlled shutdown is enabled, the broker will:
1. Transfer leadership of all partitions to other replicas
2. Wait for the transfers to complete
3. Shut down gracefully

## Handling ZooKeeper to KRaft Migration

If migrating from ZooKeeper to KRaft mode:

```bash
# 1. First upgrade to a version that supports both modes (3.3+)

# 2. Format storage for KRaft
bin/kafka-storage.sh format -t $(bin/kafka-storage.sh random-uuid) \
  -c config/kraft/server.properties

# 3. Start migration controller
bin/kafka-server-start.sh config/kraft/controller.properties

# 4. Enable migration mode on brokers
# Add to server.properties:
# zookeeper.metadata.migration.enable=true

# 5. Complete migration
bin/kafka-metadata.sh --snapshot /var/kafka-logs/__cluster_metadata-0/00000000000000000000.log \
  --command "migrate"
```

## Rollback Plan

Always have a rollback plan ready:

```bash
#!/bin/bash
# rollback.sh - Rollback Kafka upgrade

KAFKA_HOME=/opt/kafka
BACKUP_HOME=/opt/kafka-backup

# Stop the broker
$KAFKA_HOME/bin/kafka-server-stop.sh

# Restore old binaries
rm -rf $KAFKA_HOME/*
cp -r $BACKUP_HOME/* $KAFKA_HOME/

# Restore old configuration
cp /etc/kafka/server.properties.backup /etc/kafka/server.properties

# Start with old version
$KAFKA_HOME/bin/kafka-server-start.sh -daemon /etc/kafka/server.properties
```

## Best Practices

### 1. Upgrade During Low Traffic

Schedule upgrades during periods of low traffic to minimize impact:

```python
def get_traffic_metrics(bootstrap_servers: str) -> dict:
    """Get current traffic metrics to determine optimal upgrade window."""
    # Use JMX or Prometheus metrics to get traffic data
    pass
```

### 2. Monitor Key Metrics

Watch these metrics during upgrade:

- `kafka.server:type=BrokerTopicMetrics,name=MessagesInPerSec`
- `kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions`
- `kafka.controller:type=KafkaController,name=OfflinePartitionsCount`
- `kafka.network:type=RequestMetrics,name=RequestQueueTimeMs`

### 3. Test Client Compatibility

Verify clients work with the new broker version:

```java
// Test producer
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

try (KafkaProducer<String, String> producer = new KafkaProducer<>(props)) {
    producer.send(new ProducerRecord<>("test-topic", "test-message")).get();
    System.out.println("Producer test passed");
}
```

### 4. Document Everything

Keep detailed records of:
- Current versions before upgrade
- Configuration changes made
- Timestamp of each broker upgrade
- Any issues encountered

## Troubleshooting

### Broker Fails to Start After Upgrade

```bash
# Check logs for errors
tail -f /var/log/kafka/server.log

# Verify configuration compatibility
bin/kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type brokers --describe --all
```

### Prolonged Under-Replication

```bash
# Check replication status
bin/kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --under-replicated-partitions

# Force leader election if needed
bin/kafka-leader-election.sh --bootstrap-server localhost:9092 \
  --election-type PREFERRED --all-topic-partitions
```

## Conclusion

Upgrading Kafka without downtime requires careful planning and execution. The key steps are: verifying cluster health before starting, performing rolling upgrades one broker at a time, managing protocol versions correctly, and having a solid rollback plan. By following the procedures in this guide and using automation scripts to monitor the process, you can safely upgrade your Kafka clusters while maintaining continuous service availability.
