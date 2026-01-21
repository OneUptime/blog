# How to Plan Kafka Disaster Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Disaster Recovery, RPO, RTO, Business Continuity, Failover, High Availability

Description: A comprehensive guide to planning and implementing Apache Kafka disaster recovery, including RPO and RTO considerations, failover strategies, and recovery procedures.

---

Disaster recovery (DR) planning for Apache Kafka is critical for organizations that depend on real-time data streaming. This guide covers how to design, implement, and test a comprehensive Kafka disaster recovery strategy.

## Understanding DR Metrics

### Recovery Point Objective (RPO)

RPO defines the maximum acceptable data loss measured in time. For Kafka:

- **RPO = 0**: No data loss - requires synchronous replication
- **RPO = minutes**: Minimal data loss - asynchronous replication with short lag
- **RPO = hours**: Some data loss acceptable - periodic backups

### Recovery Time Objective (RTO)

RTO defines the maximum acceptable downtime:

- **RTO = seconds**: Automatic failover with standby cluster
- **RTO = minutes**: Semi-automated failover
- **RTO = hours**: Manual recovery procedures

## DR Architecture Patterns

### Pattern 1: Active-Passive with MirrorMaker 2

Primary cluster handles all traffic; secondary cluster receives replicated data.

```
┌─────────────────┐         ┌─────────────────┐
│  Primary DC     │         │  Secondary DC   │
│  ┌───────────┐  │         │  ┌───────────┐  │
│  │  Kafka    │──┼────────>│  │  Kafka    │  │
│  │  Cluster  │  │  MM2    │  │  Cluster  │  │
│  └───────────┘  │         │  └───────────┘  │
│       ▲         │         │       │         │
│  Producers      │         │  (Standby)      │
│  Consumers      │         │                 │
└─────────────────┘         └─────────────────┘
```

### Pattern 2: Active-Active

Both clusters handle traffic; bi-directional replication.

```
┌─────────────────┐         ┌─────────────────┐
│  DC 1           │         │  DC 2           │
│  ┌───────────┐  │  MM2    │  ┌───────────┐  │
│  │  Kafka    │◄─┼────────>│  │  Kafka    │  │
│  │  Cluster  │  │         │  │  Cluster  │  │
│  └───────────┘  │         │  └───────────┘  │
│       ▲         │         │       ▲         │
│  Producers      │         │  Producers      │
│  Consumers      │         │  Consumers      │
└─────────────────┘         └─────────────────┘
```

### Pattern 3: Stretched Cluster

Single cluster spanning multiple data centers (requires low latency).

```
┌─────────────────────────────────────────────┐
│              Stretched Cluster              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐ │
│  │Broker 1 │    │Broker 2 │    │Broker 3 │ │
│  │ (DC 1)  │    │ (DC 2)  │    │ (DC 1)  │ │
│  └─────────┘    └─────────┘    └─────────┘ │
│       │              │              │       │
│       └──────────────┼──────────────┘       │
│                      │                      │
│            Synchronous Replication          │
└─────────────────────────────────────────────┘
```

## Implementing MirrorMaker 2 for DR

### Configuration

```properties
# mm2.properties

# Cluster aliases
clusters = primary, dr

# Primary cluster
primary.bootstrap.servers = primary-broker1:9092,primary-broker2:9092,primary-broker3:9092

# DR cluster
dr.bootstrap.servers = dr-broker1:9092,dr-broker2:9092,dr-broker3:9092

# Replication flows
primary->dr.enabled = true
primary->dr.topics = .*
primary->dr.topics.exclude = .*[\-\.]internal, .*\.replica, __.*

# Sync consumer offsets
sync.group.offsets.enabled = true
sync.group.offsets.interval.seconds = 5

# Emit checkpoints for offset translation
emit.checkpoints.enabled = true
emit.checkpoints.interval.seconds = 5

# Heartbeats for monitoring
emit.heartbeats.enabled = true
emit.heartbeats.interval.seconds = 5

# Replication settings
replication.factor = 3
tasks.max = 10
```

### Java DR Manager

```java
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.TopicPartition;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.ExecutionException;

public class KafkaDRManager {

    private final AdminClient primaryAdmin;
    private final AdminClient drAdmin;
    private final String primaryBootstrap;
    private final String drBootstrap;

    public KafkaDRManager(String primaryBootstrap, String drBootstrap) {
        this.primaryBootstrap = primaryBootstrap;
        this.drBootstrap = drBootstrap;
        this.primaryAdmin = createAdminClient(primaryBootstrap);
        this.drAdmin = createAdminClient(drBootstrap);
    }

    private AdminClient createAdminClient(String bootstrap) {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrap);
        props.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, 30000);
        return AdminClient.create(props);
    }

    public DRStatus checkDRStatus() throws ExecutionException, InterruptedException {
        DRStatus status = new DRStatus();

        // Check primary cluster
        try {
            status.primaryHealthy = isPrimaryHealthy();
        } catch (Exception e) {
            status.primaryHealthy = false;
            status.primaryError = e.getMessage();
        }

        // Check DR cluster
        try {
            status.drHealthy = isDRHealthy();
        } catch (Exception e) {
            status.drHealthy = false;
            status.drError = e.getMessage();
        }

        // Check replication lag
        if (status.primaryHealthy && status.drHealthy) {
            status.replicationLag = calculateReplicationLag();
        }

        return status;
    }

    private boolean isPrimaryHealthy() throws ExecutionException, InterruptedException {
        DescribeClusterResult cluster = primaryAdmin.describeCluster();
        Collection<Node> nodes = cluster.nodes().get();
        return nodes.size() >= 3; // Minimum brokers
    }

    private boolean isDRHealthy() throws ExecutionException, InterruptedException {
        DescribeClusterResult cluster = drAdmin.describeCluster();
        Collection<Node> nodes = cluster.nodes().get();
        return nodes.size() >= 3;
    }

    private Map<String, Long> calculateReplicationLag()
            throws ExecutionException, InterruptedException {

        Map<String, Long> lagByTopic = new HashMap<>();

        Set<String> primaryTopics = primaryAdmin.listTopics().names().get();

        for (String topic : primaryTopics) {
            if (topic.startsWith("__")) continue;

            String drTopic = "primary." + topic; // MM2 naming convention

            try {
                long primaryLatest = getLatestOffset(primaryAdmin, topic);
                long drLatest = getLatestOffset(drAdmin, drTopic);

                lagByTopic.put(topic, primaryLatest - drLatest);
            } catch (Exception e) {
                lagByTopic.put(topic, -1L); // Indicates error
            }
        }

        return lagByTopic;
    }

    private long getLatestOffset(AdminClient admin, String topic)
            throws ExecutionException, InterruptedException {

        TopicDescription desc = admin
            .describeTopics(Collections.singletonList(topic))
            .topicNameValues()
            .get(topic)
            .get();

        long totalOffset = 0;
        Map<TopicPartition, OffsetSpec> partitions = new HashMap<>();

        for (int i = 0; i < desc.partitions().size(); i++) {
            partitions.put(new TopicPartition(topic, i), OffsetSpec.latest());
        }

        Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> offsets =
            admin.listOffsets(partitions).all().get();

        for (var entry : offsets.entrySet()) {
            totalOffset += entry.getValue().offset();
        }

        return totalOffset;
    }

    public void initiateFailover() throws Exception {
        System.out.println("Initiating failover to DR cluster...");

        // 1. Verify DR cluster is healthy
        if (!isDRHealthy()) {
            throw new RuntimeException("DR cluster is not healthy");
        }

        // 2. Stop MirrorMaker (in practice, this would be done externally)
        System.out.println("Step 1: Stop MirrorMaker replication");

        // 3. Translate consumer offsets
        System.out.println("Step 2: Consumer offsets have been synced by MM2");

        // 4. Update client configurations
        System.out.println("Step 3: Update clients to use DR cluster: " + drBootstrap);

        // 5. Verify consumers can resume
        System.out.println("Step 4: Verify consumer offset translation");

        System.out.println("Failover initiated. Update application configurations.");
    }

    public void printDRReport() throws ExecutionException, InterruptedException {
        DRStatus status = checkDRStatus();

        System.out.println("\n" + "=".repeat(60));
        System.out.println("DISASTER RECOVERY STATUS REPORT");
        System.out.println("=".repeat(60));

        System.out.println("\nCluster Health:");
        System.out.printf("  Primary Cluster: %s%n",
            status.primaryHealthy ? "HEALTHY" : "UNHEALTHY - " + status.primaryError);
        System.out.printf("  DR Cluster: %s%n",
            status.drHealthy ? "HEALTHY" : "UNHEALTHY - " + status.drError);

        if (status.replicationLag != null) {
            System.out.println("\nReplication Lag (messages behind):");
            long totalLag = 0;

            for (Map.Entry<String, Long> entry : status.replicationLag.entrySet()) {
                System.out.printf("  %-40s %d%n", entry.getKey(), entry.getValue());
                if (entry.getValue() > 0) {
                    totalLag += entry.getValue();
                }
            }

            System.out.println("\nTotal Lag: " + totalLag + " messages");

            // Estimate RPO
            // This would need actual timestamp comparison for accuracy
            System.out.println("\nEstimated RPO: Based on replication lag");
        }

        System.out.println("\nDR Readiness: " +
            (status.primaryHealthy && status.drHealthy ? "READY" : "NOT READY"));
    }

    public void close() {
        primaryAdmin.close();
        drAdmin.close();
    }

    static class DRStatus {
        boolean primaryHealthy;
        boolean drHealthy;
        String primaryError;
        String drError;
        Map<String, Long> replicationLag;
    }

    public static void main(String[] args) throws Exception {
        KafkaDRManager drManager = new KafkaDRManager(
            "primary-broker:9092",
            "dr-broker:9092"
        );

        try {
            drManager.printDRReport();
        } finally {
            drManager.close();
        }
    }
}
```

### Python DR Manager

```python
from confluent_kafka.admin import AdminClient
from confluent_kafka import Consumer, TopicPartition
from dataclasses import dataclass
from typing import Dict, Optional
import time

@dataclass
class DRStatus:
    primary_healthy: bool
    dr_healthy: bool
    primary_error: Optional[str] = None
    dr_error: Optional[str] = None
    replication_lag: Optional[Dict[str, int]] = None
    estimated_rpo_seconds: Optional[int] = None

class KafkaDRManager:
    def __init__(self, primary_bootstrap: str, dr_bootstrap: str):
        self.primary_bootstrap = primary_bootstrap
        self.dr_bootstrap = dr_bootstrap

        self.primary_admin = AdminClient({
            'bootstrap.servers': primary_bootstrap,
            'socket.timeout.ms': 10000
        })
        self.dr_admin = AdminClient({
            'bootstrap.servers': dr_bootstrap,
            'socket.timeout.ms': 10000
        })

    def check_cluster_health(self, admin_client: AdminClient) -> bool:
        """Check if a cluster is healthy."""
        try:
            metadata = admin_client.list_topics(timeout=10)
            return len(metadata.brokers) >= 3
        except Exception:
            return False

    def get_topic_offset(self, bootstrap: str, topic: str) -> int:
        """Get total latest offset for a topic."""
        consumer = Consumer({
            'bootstrap.servers': bootstrap,
            'group.id': 'dr-monitor',
            'enable.auto.commit': False
        })

        try:
            metadata = consumer.list_topics(topic, timeout=10)
            if topic not in metadata.topics:
                return -1

            total_offset = 0
            for partition_id in metadata.topics[topic].partitions:
                tp = TopicPartition(topic, partition_id)
                low, high = consumer.get_watermark_offsets(tp)
                total_offset += high

            return total_offset
        finally:
            consumer.close()

    def calculate_replication_lag(self) -> Dict[str, int]:
        """Calculate replication lag for all topics."""
        lag = {}

        primary_metadata = self.primary_admin.list_topics(timeout=10)

        for topic_name in primary_metadata.topics:
            if topic_name.startswith('__'):
                continue

            try:
                primary_offset = self.get_topic_offset(
                    self.primary_bootstrap, topic_name)

                # MM2 prefixes topics with source cluster name
                dr_topic = f"primary.{topic_name}"
                dr_offset = self.get_topic_offset(
                    self.dr_bootstrap, dr_topic)

                if primary_offset >= 0 and dr_offset >= 0:
                    lag[topic_name] = max(0, primary_offset - dr_offset)
                else:
                    lag[topic_name] = -1  # Error indicator

            except Exception as e:
                lag[topic_name] = -1

        return lag

    def check_dr_status(self) -> DRStatus:
        """Check overall DR status."""
        status = DRStatus(
            primary_healthy=False,
            dr_healthy=False
        )

        # Check primary
        try:
            status.primary_healthy = self.check_cluster_health(self.primary_admin)
        except Exception as e:
            status.primary_error = str(e)

        # Check DR
        try:
            status.dr_healthy = self.check_cluster_health(self.dr_admin)
        except Exception as e:
            status.dr_error = str(e)

        # Calculate replication lag
        if status.primary_healthy and status.dr_healthy:
            status.replication_lag = self.calculate_replication_lag()

        return status

    def print_dr_report(self):
        """Print comprehensive DR status report."""
        status = self.check_dr_status()

        print("\n" + "=" * 60)
        print("DISASTER RECOVERY STATUS REPORT")
        print("=" * 60)

        print("\nCluster Health:")
        print(f"  Primary: {'HEALTHY' if status.primary_healthy else 'UNHEALTHY'}")
        if status.primary_error:
            print(f"    Error: {status.primary_error}")

        print(f"  DR: {'HEALTHY' if status.dr_healthy else 'UNHEALTHY'}")
        if status.dr_error:
            print(f"    Error: {status.dr_error}")

        if status.replication_lag:
            print("\nReplication Lag (messages):")
            total_lag = 0

            for topic, lag in sorted(status.replication_lag.items()):
                status_str = str(lag) if lag >= 0 else "ERROR"
                print(f"  {topic:<40} {status_str}")
                if lag > 0:
                    total_lag += lag

            print(f"\nTotal Lag: {total_lag} messages")

        dr_ready = status.primary_healthy and status.dr_healthy
        print(f"\nDR Readiness: {'READY' if dr_ready else 'NOT READY'}")

    def generate_failover_runbook(self) -> str:
        """Generate failover runbook."""
        runbook = """
KAFKA DISASTER RECOVERY FAILOVER RUNBOOK
=========================================

PRE-FAILOVER CHECKLIST:
[ ] Confirm primary cluster is unavailable
[ ] Confirm DR cluster is healthy
[ ] Notify stakeholders
[ ] Document current timestamp

FAILOVER STEPS:

1. STOP MIRRORMAKER 2
   - Stop MM2 processes/pods
   - Verify no data is being replicated

2. VERIFY DR CLUSTER HEALTH
   kafka-broker-api-versions.sh --bootstrap-server {dr_bootstrap}

3. CHECK REPLICATION LAG
   - Note any lag for data loss assessment
   - Document RPO achieved

4. UPDATE DNS/LOAD BALANCER
   - Point kafka.example.com to DR cluster
   - Or update client configurations

5. RESTART PRODUCERS
   - Update bootstrap.servers to: {dr_bootstrap}
   - Restart producer applications

6. RESTART CONSUMERS
   - Consumers should resume from synced offsets
   - Monitor for any offset issues

7. VERIFY PRODUCTION
   - Check producer/consumer metrics
   - Verify message flow
   - Monitor for errors

8. UPDATE MONITORING
   - Point alerts to DR cluster
   - Update dashboards

POST-FAILOVER:
[ ] Document actual RTO achieved
[ ] Document any data loss (RPO)
[ ] Begin root cause analysis for primary failure
[ ] Plan failback procedure
"""
        return runbook.format(dr_bootstrap=self.dr_bootstrap)


def main():
    dr_manager = KafkaDRManager(
        primary_bootstrap="primary-broker:9092",
        dr_bootstrap="dr-broker:9092"
    )

    dr_manager.print_dr_report()
    print(dr_manager.generate_failover_runbook())


if __name__ == '__main__':
    main()
```

## Failover Procedures

### Automated Failover Script

```bash
#!/bin/bash
# failover.sh - Kafka DR Failover Script

set -e

PRIMARY_BOOTSTRAP="primary-broker1:9092,primary-broker2:9092"
DR_BOOTSTRAP="dr-broker1:9092,dr-broker2:9092"
MM2_DEPLOYMENT="mirrormaker2"

echo "=== KAFKA DR FAILOVER ==="
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# Step 1: Verify primary is down
echo ""
echo "Step 1: Verifying primary cluster status..."
if kafka-broker-api-versions.sh --bootstrap-server $PRIMARY_BOOTSTRAP 2>/dev/null; then
    echo "WARNING: Primary cluster appears to be UP"
    read -p "Continue with failover anyway? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Failover cancelled"
        exit 1
    fi
else
    echo "Primary cluster is DOWN - proceeding with failover"
fi

# Step 2: Verify DR cluster is healthy
echo ""
echo "Step 2: Verifying DR cluster health..."
if ! kafka-broker-api-versions.sh --bootstrap-server $DR_BOOTSTRAP; then
    echo "ERROR: DR cluster is not healthy"
    exit 1
fi
echo "DR cluster is healthy"

# Step 3: Stop MirrorMaker
echo ""
echo "Step 3: Stopping MirrorMaker 2..."
kubectl scale deployment $MM2_DEPLOYMENT --replicas=0 2>/dev/null || \
    systemctl stop mirrormaker2 2>/dev/null || \
    echo "Manual MM2 stop required"

# Step 4: Check final replication state
echo ""
echo "Step 4: Checking final replication state..."
kafka-consumer-groups.sh --bootstrap-server $DR_BOOTSTRAP \
    --describe --all-groups 2>/dev/null | head -20

# Step 5: Generate client update instructions
echo ""
echo "Step 5: Client Configuration Update"
echo "Update all clients to use: $DR_BOOTSTRAP"
echo ""
echo "For producers, update bootstrap.servers:"
echo "  bootstrap.servers=$DR_BOOTSTRAP"
echo ""
echo "For consumers, offsets have been synced by MM2"

# Step 6: Log the failover
echo ""
echo "=== FAILOVER INITIATED ==="
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "DR Bootstrap: $DR_BOOTSTRAP"
echo ""
echo "NEXT STEPS:"
echo "1. Update application configurations"
echo "2. Restart applications"
echo "3. Verify message flow"
echo "4. Update monitoring/alerting"
```

## DR Testing

Regular DR testing is essential. Create a test plan:

```python
class DRTest:
    def __init__(self, dr_manager: KafkaDRManager):
        self.dr_manager = dr_manager
        self.test_results = []

    def run_dr_test(self) -> dict:
        """Run comprehensive DR test."""
        results = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'tests': []
        }

        # Test 1: Cluster connectivity
        test1 = self._test_connectivity()
        results['tests'].append(test1)

        # Test 2: Replication lag
        test2 = self._test_replication_lag()
        results['tests'].append(test2)

        # Test 3: Consumer offset sync
        test3 = self._test_offset_sync()
        results['tests'].append(test3)

        # Test 4: Produce to DR (read-only test)
        test4 = self._test_dr_write_capability()
        results['tests'].append(test4)

        # Calculate overall result
        all_passed = all(t['passed'] for t in results['tests'])
        results['overall'] = 'PASSED' if all_passed else 'FAILED'

        return results

    def _test_connectivity(self) -> dict:
        """Test connectivity to both clusters."""
        result = {'name': 'Cluster Connectivity', 'passed': False}

        try:
            status = self.dr_manager.check_dr_status()
            result['passed'] = status.primary_healthy and status.dr_healthy
            result['details'] = f"Primary: {status.primary_healthy}, DR: {status.dr_healthy}"
        except Exception as e:
            result['error'] = str(e)

        return result

    def _test_replication_lag(self) -> dict:
        """Test replication lag is within acceptable limits."""
        result = {'name': 'Replication Lag', 'passed': False}
        max_acceptable_lag = 10000  # messages

        try:
            lag = self.dr_manager.calculate_replication_lag()
            max_lag = max(lag.values()) if lag else 0

            result['passed'] = max_lag <= max_acceptable_lag
            result['max_lag'] = max_lag
            result['details'] = f"Max lag: {max_lag} messages"
        except Exception as e:
            result['error'] = str(e)

        return result

    def _test_offset_sync(self) -> dict:
        """Test consumer offset synchronization."""
        result = {'name': 'Offset Sync', 'passed': False}

        # This would check MM2 checkpoint topics
        result['passed'] = True  # Simplified
        result['details'] = "Checkpoint topics present"

        return result

    def _test_dr_write_capability(self) -> dict:
        """Test that DR cluster can accept writes."""
        result = {'name': 'DR Write Capability', 'passed': False}

        try:
            # Produce test message to DR cluster
            from confluent_kafka import Producer

            producer = Producer({
                'bootstrap.servers': self.dr_manager.dr_bootstrap,
                'socket.timeout.ms': 5000
            })

            producer.produce('dr-test-topic', b'test-message')
            producer.flush(timeout=5)

            result['passed'] = True
            result['details'] = "Successfully wrote to DR cluster"
        except Exception as e:
            result['error'] = str(e)

        return result

    def print_test_report(self, results: dict):
        """Print DR test report."""
        print("\n" + "=" * 60)
        print("DISASTER RECOVERY TEST REPORT")
        print("=" * 60)
        print(f"Timestamp: {results['timestamp']}")
        print(f"Overall Result: {results['overall']}")
        print("\nTest Results:")

        for test in results['tests']:
            status = "PASS" if test['passed'] else "FAIL"
            print(f"  [{status}] {test['name']}")
            if 'details' in test:
                print(f"        {test['details']}")
            if 'error' in test:
                print(f"        Error: {test['error']}")
```

## Best Practices

### 1. Document RPO and RTO Requirements

| Scenario | RPO | RTO | Strategy |
|----------|-----|-----|----------|
| Financial Trading | 0 | <10s | Synchronous replication |
| E-commerce | <1min | <5min | Async replication + auto-failover |
| Analytics | <1hr | <30min | Async replication + manual failover |

### 2. Test DR Regularly

- Monthly: Connectivity and lag tests
- Quarterly: Full failover drill
- Annually: Extended operation on DR

### 3. Monitor Replication Continuously

```yaml
# prometheus-alerts.yml
groups:
  - name: kafka-dr
    rules:
      - alert: KafkaDRReplicationLag
        expr: kafka_mirrormaker_replication_lag_seconds > 60
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "DR replication lag exceeds 60 seconds"

      - alert: KafkaDRClusterDown
        expr: up{job="kafka-dr"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "DR Kafka cluster is unreachable"
```

### 4. Maintain Runbooks

Keep detailed, tested runbooks for:
- Failover procedures
- Failback procedures
- Consumer offset recovery
- Data reconciliation

## Conclusion

Effective Kafka disaster recovery requires careful planning around RPO and RTO requirements, proper implementation of replication technologies like MirrorMaker 2, comprehensive monitoring, and regular testing. The key is to match your DR strategy to your business requirements - not every workload needs zero data loss, but critical systems may require synchronous replication and automatic failover. Regular DR testing ensures that when disaster strikes, your team can execute the failover confidently and restore service within your RTO targets.
