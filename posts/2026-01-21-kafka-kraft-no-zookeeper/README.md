# How to Set Up Kafka with KRaft (No ZooKeeper)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, KRaft, ZooKeeper, Distributed Systems, Message Queue, Streaming

Description: A comprehensive guide to deploying Apache Kafka in KRaft mode without ZooKeeper, covering architecture concepts, installation, configuration, migration strategies, and production best practices.

---

Apache Kafka 3.3 introduced KRaft (Kafka Raft) mode for production use, allowing Kafka to run without ZooKeeper. This simplifies operations, reduces infrastructure complexity, and improves scalability. This guide covers everything you need to know about deploying and managing Kafka in KRaft mode.

## Understanding KRaft Architecture

### What is KRaft?

KRaft replaces ZooKeeper with a built-in consensus protocol based on Raft. Key benefits include:

- **Simplified Operations**: No separate ZooKeeper cluster to manage
- **Better Scalability**: Supports millions of partitions
- **Faster Recovery**: Quicker controller failover
- **Reduced Latency**: Direct metadata communication
- **Single Security Model**: Unified authentication and authorization

### Node Roles in KRaft

KRaft introduces distinct node roles:

- **Controller**: Manages cluster metadata (replaces ZooKeeper)
- **Broker**: Handles client requests and data storage
- **Combined**: Both controller and broker (for small clusters)

## Prerequisites

Before starting, ensure you have:

- Java 17 or later installed
- At least 4GB RAM per node
- SSD storage recommended
- Network connectivity between nodes

## Single-Node Development Setup

### Download and Extract Kafka

```bash
# Download Kafka
wget https://downloads.apache.org/kafka/3.7.0/kafka_2.13-3.7.0.tgz

# Extract
tar -xzf kafka_2.13-3.7.0.tgz
cd kafka_2.13-3.7.0
```

### Generate Cluster ID

```bash
# Generate a unique cluster ID
KAFKA_CLUSTER_ID="$(bin/kafka-storage.sh random-uuid)"
echo $KAFKA_CLUSTER_ID
```

### Configure Single-Node KRaft

Create configuration file:

```bash
# config/kraft/server.properties
```

```properties
# Node configuration
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@localhost:9093

# Listeners
listeners=PLAINTEXT://:9092,CONTROLLER://:9093
advertised.listeners=PLAINTEXT://localhost:9092
controller.listener.names=CONTROLLER
listener.security.protocol.map=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
inter.broker.listener.name=PLAINTEXT

# Log directories
log.dirs=/var/kafka-logs
metadata.log.dir=/var/kafka-logs

# Topic defaults
num.partitions=3
default.replication.factor=1
offsets.topic.replication.factor=1
transaction.state.log.replication.factor=1
transaction.state.log.min.isr=1

# Log retention
log.retention.hours=168
log.segment.bytes=1073741824
log.retention.check.interval.ms=300000

# Performance tuning
num.network.threads=3
num.io.threads=8
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600
```

### Format Storage Directory

```bash
# Format the storage directory with cluster ID
bin/kafka-storage.sh format \
  -t $KAFKA_CLUSTER_ID \
  -c config/kraft/server.properties
```

### Start Kafka

```bash
# Start Kafka in foreground
bin/kafka-server-start.sh config/kraft/server.properties

# Or start in background
bin/kafka-server-start.sh -daemon config/kraft/server.properties
```

### Verify Installation

```bash
# Create a test topic
bin/kafka-topics.sh --create \
  --topic test-topic \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1

# List topics
bin/kafka-topics.sh --list \
  --bootstrap-server localhost:9092

# Describe topic
bin/kafka-topics.sh --describe \
  --topic test-topic \
  --bootstrap-server localhost:9092
```

## Multi-Node Production Cluster

### Cluster Planning

For production, plan your cluster with:

- **Minimum 3 controllers** for fault tolerance
- **Separate controller and broker nodes** for large clusters
- **Odd number of controllers** for proper quorum

### Controller Node Configuration

Create configuration for controller nodes:

```properties
# config/controller.properties

# Node configuration
process.roles=controller
node.id=1
controller.quorum.voters=1@controller-1:9093,2@controller-2:9093,3@controller-3:9093

# Listeners
listeners=CONTROLLER://:9093
controller.listener.names=CONTROLLER
listener.security.protocol.map=CONTROLLER:PLAINTEXT

# Directories
log.dirs=/var/kafka-controller
metadata.log.dir=/var/kafka-controller

# Controller settings
controller.quorum.election.timeout.ms=5000
controller.quorum.fetch.timeout.ms=2000
controller.quorum.retry.backoff.ms=20
```

### Broker Node Configuration

Create configuration for broker nodes:

```properties
# config/broker.properties

# Node configuration
process.roles=broker
node.id=101
controller.quorum.voters=1@controller-1:9093,2@controller-2:9093,3@controller-3:9093

# Listeners
listeners=PLAINTEXT://:9092
advertised.listeners=PLAINTEXT://broker-1:9092
controller.listener.names=CONTROLLER
listener.security.protocol.map=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
inter.broker.listener.name=PLAINTEXT

# Directories
log.dirs=/var/kafka-logs

# Topic defaults
num.partitions=6
default.replication.factor=3
min.insync.replicas=2
offsets.topic.replication.factor=3
transaction.state.log.replication.factor=3
transaction.state.log.min.isr=2

# Log retention
log.retention.hours=168
log.segment.bytes=1073741824
log.retention.check.interval.ms=300000

# Performance
num.network.threads=8
num.io.threads=16
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600
num.replica.fetchers=4
replica.fetch.min.bytes=1
replica.fetch.wait.max.ms=500
```

### Format All Nodes

On each node, format the storage:

```bash
# Use the same cluster ID on all nodes
KAFKA_CLUSTER_ID="MkU3OEVBNTcwNTJENDM2Qk"

# Format controller nodes
bin/kafka-storage.sh format \
  -t $KAFKA_CLUSTER_ID \
  -c config/controller.properties

# Format broker nodes
bin/kafka-storage.sh format \
  -t $KAFKA_CLUSTER_ID \
  -c config/broker.properties
```

### Start Cluster

Start controllers first, then brokers:

```bash
# On controller nodes
bin/kafka-server-start.sh -daemon config/controller.properties

# On broker nodes (after controllers are up)
bin/kafka-server-start.sh -daemon config/broker.properties
```

### Verify Cluster Health

```bash
# Check cluster metadata
bin/kafka-metadata.sh --snapshot /var/kafka-controller/__cluster_metadata-0/00000000000000000000.log --command "cat"

# Describe cluster
bin/kafka-metadata.sh --snapshot /var/kafka-controller/__cluster_metadata-0/00000000000000000000.log --command "describe"

# Check broker registration
bin/kafka-broker-api-versions.sh --bootstrap-server broker-1:9092
```

## Combined Mode for Small Clusters

For smaller deployments, use combined mode:

```properties
# config/combined.properties

# Combined role
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@node-1:9093,2@node-2:9093,3@node-3:9093

# Listeners
listeners=PLAINTEXT://:9092,CONTROLLER://:9093
advertised.listeners=PLAINTEXT://node-1:9092
controller.listener.names=CONTROLLER
listener.security.protocol.map=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
inter.broker.listener.name=PLAINTEXT

# Directories
log.dirs=/var/kafka-logs
metadata.log.dir=/var/kafka-logs

# Topic defaults
num.partitions=6
default.replication.factor=3
min.insync.replicas=2
offsets.topic.replication.factor=3
transaction.state.log.replication.factor=3
transaction.state.log.min.isr=2
```

## Configuring TLS Security

### Generate Certificates

```bash
# Create CA
openssl req -new -x509 -keyout ca-key.pem -out ca-cert.pem -days 365 \
  -subj "/CN=Kafka-CA" -nodes

# Create server keystore
keytool -keystore kafka.server.keystore.jks -alias localhost \
  -validity 365 -genkey -keyalg RSA -storepass changeit \
  -dname "CN=kafka-broker"

# Create CSR
keytool -keystore kafka.server.keystore.jks -alias localhost \
  -certreq -file cert-request.csr -storepass changeit

# Sign certificate
openssl x509 -req -CA ca-cert.pem -CAkey ca-key.pem \
  -in cert-request.csr -out cert-signed.pem \
  -days 365 -CAcreateserial

# Import CA and signed cert
keytool -keystore kafka.server.keystore.jks -alias CARoot \
  -import -file ca-cert.pem -storepass changeit -noprompt
keytool -keystore kafka.server.keystore.jks -alias localhost \
  -import -file cert-signed.pem -storepass changeit

# Create truststore
keytool -keystore kafka.server.truststore.jks -alias CARoot \
  -import -file ca-cert.pem -storepass changeit -noprompt
```

### Configure TLS

```properties
# TLS configuration for brokers
listeners=PLAINTEXT://:9092,SSL://:9093,CONTROLLER://:9094
advertised.listeners=PLAINTEXT://broker-1:9092,SSL://broker-1:9093
controller.listener.names=CONTROLLER
listener.security.protocol.map=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,SSL:SSL

# SSL settings
ssl.keystore.location=/etc/kafka/ssl/kafka.server.keystore.jks
ssl.keystore.password=changeit
ssl.key.password=changeit
ssl.truststore.location=/etc/kafka/ssl/kafka.server.truststore.jks
ssl.truststore.password=changeit
ssl.client.auth=required
```

## Migrating from ZooKeeper to KRaft

### Migration Overview

Kafka supports migration from ZooKeeper to KRaft:

1. Upgrade to Kafka 3.6 or later
2. Deploy KRaft controllers
3. Enable migration mode
4. Migrate metadata
5. Remove ZooKeeper dependencies

### Step 1: Prepare Controllers

Deploy KRaft controllers with migration config:

```properties
# Controller migration configuration
process.roles=controller
node.id=3000
controller.quorum.voters=3000@controller-1:9093,3001@controller-2:9093,3002@controller-3:9093

# ZooKeeper connection for migration
zookeeper.connect=zk1:2181,zk2:2181,zk3:2181
zookeeper.metadata.migration.enable=true
```

### Step 2: Configure Brokers for Migration

Update existing broker configuration:

```properties
# Broker migration configuration
controller.quorum.voters=3000@controller-1:9093,3001@controller-2:9093,3002@controller-3:9093
controller.listener.names=CONTROLLER
listener.security.protocol.map=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT

# Keep ZooKeeper connection during migration
zookeeper.connect=zk1:2181,zk2:2181,zk3:2181
zookeeper.metadata.migration.enable=true
```

### Step 3: Complete Migration

After all brokers are running with KRaft:

```bash
# Remove ZooKeeper configuration from brokers
# Restart brokers one by one

# Verify migration complete
bin/kafka-metadata.sh --snapshot /var/kafka-controller/__cluster_metadata-0/00000000000000000000.log --command "describe"
```

## Monitoring KRaft Clusters

### Key Metrics

```bash
# Using kafka-metadata.sh
bin/kafka-metadata.sh --snapshot /var/kafka-logs/__cluster_metadata-0/00000000000000000000.log \
  --command "describe"
```

### JMX Metrics

Important KRaft metrics to monitor:

```
kafka.controller:type=KafkaController,name=ActiveControllerCount
kafka.controller:type=KafkaController,name=LastAppliedRecordOffset
kafka.controller:type=KafkaController,name=LastAppliedRecordTimestamp
kafka.controller:type=ControllerStats,name=UncleanLeaderElectionRate
kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions
kafka.server:type=ReplicaManager,name=PartitionCount
```

### Python Monitoring Script

```python
from kafka import KafkaAdminClient
from kafka.admin import ConfigResource, ConfigResourceType

admin_client = KafkaAdminClient(
    bootstrap_servers=['localhost:9092'],
    client_id='monitoring-client'
)

# Get cluster metadata
cluster_metadata = admin_client.describe_cluster()
print(f"Controller ID: {cluster_metadata['controller_id']}")
print(f"Cluster ID: {cluster_metadata['cluster_id']}")

# List broker IDs
brokers = cluster_metadata['brokers']
for broker in brokers:
    print(f"Broker {broker['node_id']}: {broker['host']}:{broker['port']}")

# Get broker configs
broker_configs = admin_client.describe_configs([
    ConfigResource(ConfigResourceType.BROKER, '1')
])

for resource, config in broker_configs.items():
    print(f"\nBroker {resource.name} configuration:")
    for name, value in config.items():
        if not value.is_sensitive:
            print(f"  {name}: {value.value}")
```

### Java Monitoring Example

```java
import org.apache.kafka.clients.admin.*;
import java.util.*;
import java.util.concurrent.ExecutionException;

public class KRaftMonitor {
    public static void main(String[] args) throws ExecutionException, InterruptedException {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");

        try (AdminClient admin = AdminClient.create(props)) {
            // Describe cluster
            DescribeClusterResult cluster = admin.describeCluster();

            System.out.println("Cluster ID: " + cluster.clusterId().get());
            System.out.println("Controller: " + cluster.controller().get());

            // List nodes
            Collection<Node> nodes = cluster.nodes().get();
            for (Node node : nodes) {
                System.out.printf("Node %d: %s:%d%n",
                    node.id(), node.host(), node.port());
            }

            // Describe metadata quorum
            DescribeMetadataQuorumResult quorum = admin.describeMetadataQuorum();
            QuorumInfo quorumInfo = quorum.quorumInfo().get();

            System.out.println("\nQuorum Info:");
            System.out.println("Leader ID: " + quorumInfo.leaderId());
            System.out.println("Leader Epoch: " + quorumInfo.leaderEpoch());

            for (QuorumInfo.ReplicaState replica : quorumInfo.voters()) {
                System.out.printf("Voter %d: offset=%d, lag=%d%n",
                    replica.replicaId(),
                    replica.logEndOffset(),
                    quorumInfo.highWatermark() - replica.logEndOffset());
            }
        }
    }
}
```

## Best Practices

### Controller Sizing

- **CPU**: 2-4 cores per controller
- **Memory**: 4-8GB heap
- **Storage**: Fast SSD, 50-100GB
- **Network**: Low latency between controllers

### Broker Sizing

- **CPU**: 8-16 cores per broker
- **Memory**: 32-64GB total, 6-8GB heap
- **Storage**: Multiple SSDs in JBOD configuration
- **Network**: 10Gbps for high-throughput clusters

### Configuration Tips

```properties
# Controller timeouts
controller.quorum.election.timeout.ms=5000
controller.quorum.fetch.timeout.ms=2000

# Metadata log retention
metadata.log.segment.bytes=1073741824
metadata.log.segment.ms=604800000
metadata.max.retention.bytes=-1
metadata.max.retention.ms=604800000

# Broker registration
broker.heartbeat.interval.ms=2000
broker.session.timeout.ms=18000
```

## Troubleshooting

### Controller Not Starting

```bash
# Check metadata log
bin/kafka-metadata.sh --snapshot /var/kafka-logs/__cluster_metadata-0/00000000000000000000.log --command "cat"

# Verify storage format
cat /var/kafka-logs/meta.properties
```

### Brokers Not Registering

```bash
# Check broker logs
tail -f /var/kafka-logs/server.log

# Verify controller connectivity
nc -zv controller-1 9093
```

### Split Brain Prevention

Ensure odd number of controllers and proper quorum configuration:

```properties
# Must have majority of voters for quorum
controller.quorum.voters=1@c1:9093,2@c2:9093,3@c3:9093
```

## Conclusion

KRaft mode represents the future of Kafka, eliminating ZooKeeper dependency while providing improved scalability and simpler operations. Start with development setups using combined mode, then graduate to dedicated controllers and brokers for production. The migration path from ZooKeeper is well-supported, allowing gradual adoption in existing deployments.

Key takeaways:

- Use KRaft mode for all new Kafka deployments
- Plan controller placement for fault tolerance
- Monitor quorum health and metadata lag
- Consider migration for existing ZooKeeper-based clusters
