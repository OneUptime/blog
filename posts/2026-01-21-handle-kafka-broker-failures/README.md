# How to Handle Kafka Broker Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Broker Failure, High Availability, Leader Election, Fault Tolerance, Recovery

Description: A comprehensive guide to handling Apache Kafka broker failures, including automatic leader election, recovery procedures, and best practices for fault-tolerant clusters.

---

Kafka is designed for fault tolerance, but understanding how to handle broker failures effectively is crucial for maintaining service availability. This guide covers how Kafka handles broker failures automatically and what you need to do to ensure quick recovery.

## Understanding Kafka Fault Tolerance

Kafka provides fault tolerance through:

- **Replication**: Each partition has multiple replicas across brokers
- **Leader election**: Automatic failover when a leader becomes unavailable
- **In-Sync Replicas (ISR)**: Only replicas that are caught up can become leaders

## How Leader Election Works

When a broker fails, Kafka automatically elects new leaders for affected partitions.

### Automatic Leader Election Process

1. ZooKeeper (or KRaft controller) detects broker failure
2. Controller identifies partitions where the failed broker was leader
3. Controller selects new leader from ISR
4. Controller updates metadata and notifies all brokers
5. Clients refresh metadata and reconnect

### Leader Election Configuration

```properties
# server.properties

# Time before a broker is considered dead
zookeeper.session.timeout.ms=18000

# For KRaft mode
controller.quorum.election.timeout.ms=1000
controller.quorum.fetch.timeout.ms=2000

# Leader election settings
leader.imbalance.check.interval.seconds=300
leader.imbalance.per.broker.percentage=10

# Unclean leader election (data loss risk)
unclean.leader.election.enable=false
```

## Monitoring Broker Health

### Java Monitoring Tool

```java
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.common.Node;

import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

public class BrokerHealthMonitor {

    private final AdminClient adminClient;

    public BrokerHealthMonitor(String bootstrapServers) {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, 10000);
        this.adminClient = AdminClient.create(props);
    }

    public List<Node> getActiveBrokers() throws ExecutionException, InterruptedException {
        DescribeClusterResult cluster = adminClient.describeCluster();
        return new ArrayList<>(cluster.nodes().get());
    }

    public int getControllerId() throws ExecutionException, InterruptedException {
        DescribeClusterResult cluster = adminClient.describeCluster();
        return cluster.controller().get().id();
    }

    public Map<Integer, BrokerStatus> checkBrokerStatus()
            throws ExecutionException, InterruptedException {

        Map<Integer, BrokerStatus> status = new HashMap<>();
        List<Node> brokers = getActiveBrokers();

        // Get partition assignments
        Set<String> topics = adminClient.listTopics().names().get();
        Map<String, TopicDescription> descriptions =
            adminClient.describeTopics(topics).allTopicNames().get();

        // Count leaders and replicas per broker
        Map<Integer, Integer> leaderCounts = new HashMap<>();
        Map<Integer, Integer> replicaCounts = new HashMap<>();

        for (TopicDescription desc : descriptions.values()) {
            for (var partition : desc.partitions()) {
                int leader = partition.leader().id();
                leaderCounts.merge(leader, 1, Integer::sum);

                for (Node replica : partition.replicas()) {
                    replicaCounts.merge(replica.id(), 1, Integer::sum);
                }
            }
        }

        for (Node broker : brokers) {
            status.put(broker.id(), new BrokerStatus(
                broker.id(),
                broker.host(),
                broker.port(),
                true,
                leaderCounts.getOrDefault(broker.id(), 0),
                replicaCounts.getOrDefault(broker.id(), 0)
            ));
        }

        return status;
    }

    public List<PartitionInfo> getUnderReplicatedPartitions()
            throws ExecutionException, InterruptedException {

        List<PartitionInfo> underReplicated = new ArrayList<>();

        Set<String> topics = adminClient.listTopics().names().get();
        Map<String, TopicDescription> descriptions =
            adminClient.describeTopics(topics).allTopicNames().get();

        for (Map.Entry<String, TopicDescription> entry : descriptions.entrySet()) {
            String topic = entry.getKey();
            TopicDescription desc = entry.getValue();

            for (var partition : desc.partitions()) {
                if (partition.isr().size() < partition.replicas().size()) {
                    underReplicated.add(new PartitionInfo(
                        topic,
                        partition.partition(),
                        partition.leader().id(),
                        partition.replicas().size(),
                        partition.isr().size()
                    ));
                }
            }
        }

        return underReplicated;
    }

    public void printHealthReport() throws ExecutionException, InterruptedException {
        System.out.println("\n" + "=".repeat(70));
        System.out.println("KAFKA CLUSTER HEALTH REPORT");
        System.out.println("=".repeat(70));

        // Controller info
        int controllerId = getControllerId();
        System.out.println("\nController: Broker " + controllerId);

        // Broker status
        Map<Integer, BrokerStatus> brokerStatus = checkBrokerStatus();
        System.out.println("\nBroker Status:");
        System.out.printf("%-10s %-25s %-10s %-10s %-10s%n",
            "ID", "Host", "Port", "Leaders", "Replicas");
        System.out.println("-".repeat(70));

        for (BrokerStatus bs : brokerStatus.values()) {
            System.out.printf("%-10d %-25s %-10d %-10d %-10d%n",
                bs.id, bs.host, bs.port, bs.leaderCount, bs.replicaCount);
        }

        // Under-replicated partitions
        List<PartitionInfo> underReplicated = getUnderReplicatedPartitions();
        System.out.println("\nUnder-Replicated Partitions: " + underReplicated.size());

        if (!underReplicated.isEmpty()) {
            System.out.println("\nDetails:");
            for (PartitionInfo pi : underReplicated) {
                System.out.printf("  %s-%d: Leader=%d, Replicas=%d, ISR=%d%n",
                    pi.topic, pi.partition, pi.leader,
                    pi.replicaCount, pi.isrCount);
            }
        }
    }

    public void close() {
        adminClient.close();
    }

    static class BrokerStatus {
        int id;
        String host;
        int port;
        boolean alive;
        int leaderCount;
        int replicaCount;

        BrokerStatus(int id, String host, int port, boolean alive,
                    int leaderCount, int replicaCount) {
            this.id = id;
            this.host = host;
            this.port = port;
            this.alive = alive;
            this.leaderCount = leaderCount;
            this.replicaCount = replicaCount;
        }
    }

    static class PartitionInfo {
        String topic;
        int partition;
        int leader;
        int replicaCount;
        int isrCount;

        PartitionInfo(String topic, int partition, int leader,
                     int replicaCount, int isrCount) {
            this.topic = topic;
            this.partition = partition;
            this.leader = leader;
            this.replicaCount = replicaCount;
            this.isrCount = isrCount;
        }
    }

    public static void main(String[] args) throws Exception {
        BrokerHealthMonitor monitor = new BrokerHealthMonitor("localhost:9092");
        try {
            monitor.printHealthReport();
        } finally {
            monitor.close();
        }
    }
}
```

### Python Monitoring Tool

```python
from confluent_kafka.admin import AdminClient
from confluent_kafka import KafkaException
from typing import Dict, List, Tuple
from dataclasses import dataclass
import time

@dataclass
class BrokerStatus:
    id: int
    host: str
    port: int
    leader_count: int
    replica_count: int
    is_controller: bool

@dataclass
class UnderReplicatedPartition:
    topic: str
    partition: int
    leader: int
    replicas: int
    isr: int

class BrokerHealthMonitor:
    def __init__(self, bootstrap_servers: str):
        self.admin_client = AdminClient({
            'bootstrap.servers': bootstrap_servers,
            'socket.timeout.ms': 10000
        })

    def get_cluster_info(self) -> Tuple[List[BrokerStatus], int]:
        """Get broker status and controller ID."""
        metadata = self.admin_client.list_topics(timeout=10)

        # Count leaders and replicas per broker
        leader_counts = {}
        replica_counts = {}

        for topic_name, topic_metadata in metadata.topics.items():
            if topic_name.startswith('__'):
                continue

            for partition_id, partition in topic_metadata.partitions.items():
                leader = partition.leader
                if leader >= 0:
                    leader_counts[leader] = leader_counts.get(leader, 0) + 1

                for replica in partition.replicas:
                    replica_counts[replica] = replica_counts.get(replica, 0) + 1

        # Build broker status
        brokers = []
        controller_id = metadata.controller_id

        for broker_id, broker in metadata.brokers.items():
            brokers.append(BrokerStatus(
                id=broker_id,
                host=broker.host,
                port=broker.port,
                leader_count=leader_counts.get(broker_id, 0),
                replica_count=replica_counts.get(broker_id, 0),
                is_controller=(broker_id == controller_id)
            ))

        return brokers, controller_id

    def get_under_replicated_partitions(self) -> List[UnderReplicatedPartition]:
        """Get list of under-replicated partitions."""
        metadata = self.admin_client.list_topics(timeout=10)
        under_replicated = []

        for topic_name, topic_metadata in metadata.topics.items():
            if topic_name.startswith('__'):
                continue

            for partition_id, partition in topic_metadata.partitions.items():
                replicas = len(partition.replicas)
                isrs = len(partition.isrs)

                if isrs < replicas:
                    under_replicated.append(UnderReplicatedPartition(
                        topic=topic_name,
                        partition=partition_id,
                        leader=partition.leader,
                        replicas=replicas,
                        isr=isrs
                    ))

        return under_replicated

    def print_health_report(self):
        """Print comprehensive health report."""
        print("\n" + "=" * 70)
        print("KAFKA CLUSTER HEALTH REPORT")
        print("=" * 70)

        brokers, controller_id = self.get_cluster_info()

        print(f"\nController: Broker {controller_id}")
        print(f"Total Brokers: {len(brokers)}")

        print("\nBroker Status:")
        print(f"{'ID':<10} {'Host':<25} {'Port':<10} {'Leaders':<10} "
              f"{'Replicas':<10} {'Role':<10}")
        print("-" * 70)

        for broker in sorted(brokers, key=lambda b: b.id):
            role = "Controller" if broker.is_controller else "Broker"
            print(f"{broker.id:<10} {broker.host:<25} {broker.port:<10} "
                  f"{broker.leader_count:<10} {broker.replica_count:<10} {role:<10}")

        # Under-replicated partitions
        under_replicated = self.get_under_replicated_partitions()
        print(f"\nUnder-Replicated Partitions: {len(under_replicated)}")

        if under_replicated:
            print("\nDetails:")
            for urp in under_replicated[:20]:  # Show first 20
                print(f"  {urp.topic}-{urp.partition}: Leader={urp.leader}, "
                      f"Replicas={urp.replicas}, ISR={urp.isr}")
            if len(under_replicated) > 20:
                print(f"  ... and {len(under_replicated) - 20} more")

    def wait_for_recovery(self, timeout_seconds: int = 300) -> bool:
        """Wait for all partitions to be fully replicated."""
        print("\nWaiting for cluster recovery...")
        start_time = time.time()

        while time.time() - start_time < timeout_seconds:
            under_replicated = self.get_under_replicated_partitions()

            if not under_replicated:
                print("All partitions are fully replicated!")
                return True

            print(f"Still {len(under_replicated)} under-replicated partitions...")
            time.sleep(10)

        print("Timeout waiting for recovery")
        return False


def main():
    monitor = BrokerHealthMonitor("localhost:9092")
    monitor.print_health_report()


if __name__ == '__main__':
    main()
```

## Handling Different Failure Scenarios

### Scenario 1: Single Broker Failure

When one broker fails in a properly configured cluster:

```bash
# Check cluster status
bin/kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --under-replicated-partitions

# If partitions are under-replicated, wait for automatic recovery
# or manually trigger leader election if needed
bin/kafka-leader-election.sh --bootstrap-server localhost:9092 \
  --election-type PREFERRED --all-topic-partitions
```

### Scenario 2: Controller Failure

When the controller broker fails:

```java
public class ControllerFailoverHandler {

    public void handleControllerFailure(String bootstrapServers)
            throws Exception {

        AdminClient adminClient = createAdminClient(bootstrapServers);

        // New controller should be elected automatically
        // Wait and verify
        int maxWaitSeconds = 60;
        int waited = 0;

        while (waited < maxWaitSeconds) {
            try {
                int controllerId = adminClient.describeCluster()
                    .controller().get().id();
                System.out.println("New controller elected: " + controllerId);
                return;
            } catch (Exception e) {
                System.out.println("Waiting for controller election...");
                Thread.sleep(5000);
                waited += 5;
            }
        }

        throw new RuntimeException("Controller election timeout");
    }

    private AdminClient createAdminClient(String bootstrapServers) {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        return AdminClient.create(props);
    }
}
```

### Scenario 3: Multiple Broker Failures

When multiple brokers fail simultaneously:

```python
def handle_multiple_broker_failure(bootstrap_servers: str,
                                   expected_brokers: int) -> dict:
    """Handle multiple broker failure scenario."""
    admin_client = AdminClient({
        'bootstrap.servers': bootstrap_servers
    })

    result = {
        'status': 'unknown',
        'active_brokers': 0,
        'missing_brokers': 0,
        'actions_needed': []
    }

    try:
        metadata = admin_client.list_topics(timeout=10)
        active_brokers = len(metadata.brokers)
        missing_brokers = expected_brokers - active_brokers

        result['active_brokers'] = active_brokers
        result['missing_brokers'] = missing_brokers

        if missing_brokers == 0:
            result['status'] = 'healthy'
        elif active_brokers > expected_brokers // 2:
            result['status'] = 'degraded'
            result['actions_needed'] = [
                'Investigate failed brokers',
                'Check for under-replicated partitions',
                'Plan broker recovery'
            ]
        else:
            result['status'] = 'critical'
            result['actions_needed'] = [
                'URGENT: Cluster may lose quorum',
                'Prioritize bringing brokers back online',
                'Consider enabling unclean leader election if data loss acceptable'
            ]

        # Check under-replicated partitions
        under_replicated = []
        for topic_name, topic_metadata in metadata.topics.items():
            for partition_id, partition in topic_metadata.partitions.items():
                if len(partition.isrs) < len(partition.replicas):
                    under_replicated.append(f"{topic_name}-{partition_id}")

        result['under_replicated_count'] = len(under_replicated)

    except KafkaException as e:
        result['status'] = 'unreachable'
        result['error'] = str(e)
        result['actions_needed'] = [
            'Check network connectivity',
            'Verify bootstrap servers',
            'Check if any broker is reachable'
        ]

    return result
```

## Recovery Procedures

### Recovering a Failed Broker

```bash
#!/bin/bash
# recover-broker.sh

BROKER_ID=$1
KAFKA_HOME=/opt/kafka

echo "Recovering broker $BROKER_ID..."

# 1. Check disk health
echo "Checking disk health..."
df -h $KAFKA_HOME/data

# 2. Verify log directory integrity
echo "Verifying log directories..."
$KAFKA_HOME/bin/kafka-log-dirs.sh --describe \
  --bootstrap-server localhost:9092 \
  --broker-list $BROKER_ID

# 3. Start the broker
echo "Starting broker..."
$KAFKA_HOME/bin/kafka-server-start.sh -daemon \
  $KAFKA_HOME/config/server.properties

# 4. Wait for broker to join
sleep 30

# 5. Verify broker joined
$KAFKA_HOME/bin/kafka-broker-api-versions.sh \
  --bootstrap-server localhost:9092 | grep "id:$BROKER_ID"

# 6. Check replication status
echo "Checking replication status..."
$KAFKA_HOME/bin/kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --under-replicated-partitions

# 7. Trigger preferred leader election
echo "Triggering preferred leader election..."
$KAFKA_HOME/bin/kafka-leader-election.sh \
  --bootstrap-server localhost:9092 \
  --election-type PREFERRED \
  --all-topic-partitions
```

### Replacing a Permanently Failed Broker

```java
import org.apache.kafka.clients.admin.*;
import java.util.*;

public class BrokerReplacement {

    public void replaceFailedBroker(String bootstrapServers,
                                    int failedBrokerId,
                                    int newBrokerId) throws Exception {

        AdminClient adminClient = createAdminClient(bootstrapServers);

        try {
            // 1. Get all partitions that had replicas on failed broker
            Set<String> topics = adminClient.listTopics().names().get();
            Map<String, TopicDescription> descriptions =
                adminClient.describeTopics(topics).allTopicNames().get();

            List<String> affectedPartitions = new ArrayList<>();

            for (Map.Entry<String, TopicDescription> entry : descriptions.entrySet()) {
                String topic = entry.getKey();
                for (var partition : entry.getValue().partitions()) {
                    boolean hadReplica = partition.replicas().stream()
                        .anyMatch(n -> n.id() == failedBrokerId);
                    if (hadReplica) {
                        affectedPartitions.add(topic + "-" + partition.partition());
                    }
                }
            }

            System.out.println("Affected partitions: " + affectedPartitions.size());

            // 2. The new broker will automatically receive replicas
            // based on partition reassignment

            // 3. Verify new broker is catching up
            System.out.println("Waiting for new broker to sync...");
            waitForReplicaSync(adminClient, 600);

            System.out.println("Broker replacement complete");

        } finally {
            adminClient.close();
        }
    }

    private void waitForReplicaSync(AdminClient adminClient, int timeoutSeconds)
            throws Exception {

        long startTime = System.currentTimeMillis();
        long timeoutMs = timeoutSeconds * 1000L;

        while (System.currentTimeMillis() - startTime < timeoutMs) {
            Set<String> topics = adminClient.listTopics().names().get();
            Map<String, TopicDescription> descriptions =
                adminClient.describeTopics(topics).allTopicNames().get();

            int underReplicated = 0;
            for (TopicDescription desc : descriptions.values()) {
                for (var partition : desc.partitions()) {
                    if (partition.isr().size() < partition.replicas().size()) {
                        underReplicated++;
                    }
                }
            }

            if (underReplicated == 0) {
                return;
            }

            System.out.println("Under-replicated partitions: " + underReplicated);
            Thread.sleep(10000);
        }

        throw new RuntimeException("Timeout waiting for replica sync");
    }

    private AdminClient createAdminClient(String bootstrapServers) {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        return AdminClient.create(props);
    }
}
```

## Client-Side Failure Handling

### Producer Retry Configuration

```java
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "broker1:9092,broker2:9092,broker3:9092");

// Retry configuration
props.put(ProducerConfig.RETRIES_CONFIG, 3);
props.put(ProducerConfig.RETRY_BACKOFF_MS_CONFIG, 100);
props.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 120000);
props.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 30000);

// Metadata refresh
props.put(ProducerConfig.METADATA_MAX_AGE_CONFIG, 30000);

// Ensure durability
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
```

### Consumer Failure Handling

```python
from confluent_kafka import Consumer, KafkaError
import time

class ResilientConsumer:
    def __init__(self, bootstrap_servers: str, group_id: str, topics: list):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'auto.offset.reset': 'earliest',
            'enable.auto.commit': False,
            'session.timeout.ms': 30000,
            'heartbeat.interval.ms': 10000,
            'max.poll.interval.ms': 300000,
            # Reconnection settings
            'reconnect.backoff.ms': 100,
            'reconnect.backoff.max.ms': 10000,
        }
        self.topics = topics
        self.consumer = None

    def connect(self):
        """Create consumer with retry logic."""
        max_retries = 5
        retry_delay = 5

        for attempt in range(max_retries):
            try:
                self.consumer = Consumer(self.config)
                self.consumer.subscribe(self.topics)
                print("Connected to Kafka")
                return
            except Exception as e:
                print(f"Connection attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    retry_delay *= 2

        raise Exception("Failed to connect to Kafka after retries")

    def consume(self):
        """Consume messages with failure handling."""
        while True:
            try:
                if self.consumer is None:
                    self.connect()

                msg = self.consumer.poll(1.0)

                if msg is None:
                    continue

                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        continue
                    elif msg.error().code() == KafkaError._ALL_BROKERS_DOWN:
                        print("All brokers down, reconnecting...")
                        self.reconnect()
                        continue
                    else:
                        print(f"Error: {msg.error()}")
                        continue

                # Process message
                self.process_message(msg)

                # Commit offset
                self.consumer.commit(msg)

            except Exception as e:
                print(f"Consumer error: {e}")
                self.reconnect()

    def process_message(self, msg):
        """Process a single message."""
        print(f"Received: {msg.value().decode()}")

    def reconnect(self):
        """Reconnect after failure."""
        if self.consumer:
            try:
                self.consumer.close()
            except:
                pass
        self.consumer = None
        time.sleep(5)
        self.connect()

    def close(self):
        if self.consumer:
            self.consumer.close()
```

## Best Practices

### 1. Configure Proper Replication

```properties
# Topic-level settings
default.replication.factor=3
min.insync.replicas=2
```

### 2. Use Multiple Bootstrap Servers

Always specify multiple brokers in client configurations:

```java
props.put("bootstrap.servers", "broker1:9092,broker2:9092,broker3:9092");
```

### 3. Set Up Monitoring and Alerting

```yaml
# prometheus-alerts.yml
groups:
  - name: kafka-broker-alerts
    rules:
      - alert: KafkaBrokerDown
        expr: kafka_server_replicamanager_leadercount == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Kafka broker {{ $labels.instance }} is down"

      - alert: KafkaUnderReplicatedPartitions
        expr: kafka_server_replicamanager_underreplicatedpartitions > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Under-replicated partitions detected"
```

### 4. Regular Health Checks

Schedule regular health checks:

```bash
# cron job
*/5 * * * * /opt/kafka/scripts/health-check.sh >> /var/log/kafka/health.log 2>&1
```

## Conclusion

Handling Kafka broker failures effectively requires understanding the automatic recovery mechanisms, having proper monitoring in place, and knowing the manual recovery procedures when needed. Key practices include configuring proper replication factors, using multiple bootstrap servers in clients, setting appropriate timeout and retry configurations, and maintaining runbooks for different failure scenarios. With proper preparation, Kafka clusters can handle broker failures with minimal impact on data availability and processing continuity.
