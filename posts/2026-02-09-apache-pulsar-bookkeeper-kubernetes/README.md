# How to Deploy Apache Pulsar with BookKeeper on Kubernetes for Event Streaming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Pulsar, Kubernetes, Streaming

Description: Learn how to deploy Apache Pulsar with Apache BookKeeper on Kubernetes for high-performance event streaming with guaranteed ordering, geo-replication, and multi-tenancy capabilities.

---

Apache Pulsar provides a cloud-native distributed messaging and streaming platform that separates compute from storage. By using Apache BookKeeper for durable storage, Pulsar achieves better scalability and performance characteristics than traditional messaging systems. This guide demonstrates deploying a production-ready Pulsar cluster on Kubernetes with BookKeeper, including configuration for multi-tenancy and geo-replication.

## Understanding Pulsar and BookKeeper Architecture

Pulsar consists of several layers working together. The broker layer handles message routing and serves client connections. BookKeeper provides the durable storage layer, organizing data into ledgers distributed across bookie nodes. ZooKeeper manages cluster metadata and coordination. This separation enables independent scaling of compute and storage, unlike Kafka where brokers bundle both concerns.

BookKeeper's architecture uses a write-ahead log with automatic replication. When publishers send messages, brokers write to BookKeeper ledgers, which replicate entries across multiple bookies before acknowledging. This ensures durability without sacrificing throughput, as BookKeeper handles parallel writes efficiently.

## Installing the Pulsar Operator

Deploy Pulsar using the official Helm chart managed by StreamNative:

```bash
# Add the Pulsar Helm repository
helm repo add apache https://pulsar.apache.org/charts
helm repo update

# Create namespace
kubectl create namespace pulsar

# Install Pulsar with BookKeeper
helm install pulsar apache/pulsar \
  --namespace pulsar \
  --set initialize=true \
  --set zookeeper.replicaCount=3 \
  --set zookeeper.resources.requests.memory=2Gi \
  --set zookeeper.resources.requests.cpu=1 \
  --set bookkeeper.replicaCount=3 \
  --set bookkeeper.resources.requests.memory=8Gi \
  --set bookkeeper.resources.requests.cpu=2 \
  --set bookkeeper.volumes.journal.size=20Gi \
  --set bookkeeper.volumes.ledgers.size=100Gi \
  --set bookkeeper.volumes.journal.storageClassName=fast-ssd \
  --set bookkeeper.volumes.ledgers.storageClassName=standard-ssd \
  --set broker.replicaCount=3 \
  --set broker.resources.requests.memory=4Gi \
  --set broker.resources.requests.cpu=2 \
  --set autorecovery.enableProvisionContainer=true

# Wait for deployment (this takes 5-10 minutes)
kubectl get pods -n pulsar -w
```

The installation creates ZooKeeper for metadata, BookKeeper for storage, and Pulsar brokers for message routing.

## Verifying Cluster Health

Check that all components are running:

```bash
# Check pod status
kubectl get pods -n pulsar

# Expected components:
# - pulsar-zookeeper-0,1,2 (metadata store)
# - pulsar-bookie-0,1,2 (BookKeeper storage)
# - pulsar-broker-0,1,2 (message brokers)
# - pulsar-proxy-0 (client proxy)
# - pulsar-bastion-0 (admin tools)

# Verify cluster initialization
kubectl exec -it -n pulsar pulsar-bastion-0 -- \
  bin/pulsar-admin clusters list

# Should show 'pulsar-cluster'
```

## Configuring Multi-Tenancy

Set up tenants and namespaces for workload isolation:

```bash
# Access admin tools
kubectl exec -it -n pulsar pulsar-bastion-0 -- bash

# Inside the bastion pod
# Create tenant
bin/pulsar-admin tenants create mycompany \
  --allowed-clusters pulsar-cluster \
  --admin-roles admin

# Create namespace with policies
bin/pulsar-admin namespaces create mycompany/production

# Set retention policy
bin/pulsar-admin namespaces set-retention mycompany/production \
  --size 100G --time 7d

# Set message TTL
bin/pulsar-admin namespaces set-message-ttl mycompany/production \
  --messageTTL 86400  # 24 hours

# Configure replication
bin/pulsar-admin namespaces set-replication-clusters mycompany/production \
  --clusters pulsar-cluster

# Set resource quotas
bin/pulsar-admin namespaces set-resource-quota mycompany/production \
  --msgRateIn 1000 \
  --msgRateOut 2000 \
  --bandwidthIn 10485760 \
  --bandwidthOut 20971520
```

This creates isolated environments with independent resource limits and retention policies.

## Creating Topics and Schemas

Create topics with schema enforcement:

```bash
# Create partitioned topic
bin/pulsar-admin topics create-partitioned-topic \
  persistent://mycompany/production/events \
  --partitions 6

# Register Avro schema for type safety
cat > user-schema.json <<EOF
{
  "type": "record",
  "name": "User",
  "namespace": "com.mycompany",
  "fields": [
    {"name": "id", "type": "string"},
    {"name": "email", "type": "string"},
    {"name": "name", "type": "string"},
    {"name": "created_at", "type": "long", "logicalType": "timestamp-millis"}
  ]
}
EOF

bin/pulsar-admin schemas upload \
  persistent://mycompany/production/user-events \
  --filename user-schema.json

# View schema
bin/pulsar-admin schemas get \
  persistent://mycompany/production/user-events
```

Schema enforcement prevents incompatible messages from entering topics.

## Publishing and Consuming Messages

Test the cluster with sample producers and consumers:

```python
# producer.py - run from bastion pod
import pulsar
import json

client = pulsar.Client('pulsar://pulsar-broker:6650')

producer = client.create_producer(
    'persistent://mycompany/production/user-events',
    schema=pulsar.schema.AvroSchema({
        'type': 'record',
        'name': 'User',
        'fields': [
            {'name': 'id', 'type': 'string'},
            {'name': 'email', 'type': 'string'},
            {'name': 'name', 'type': 'string'},
            {'name': 'created_at', 'type': 'long'}
        ]
    })
)

# Publish message
import time
producer.send({
    'id': '123',
    'email': 'alice@example.com',
    'name': 'Alice',
    'created_at': int(time.time() * 1000)
})

producer.close()
client.close()
```

```python
# consumer.py
import pulsar

client = pulsar.Client('pulsar://pulsar-broker:6650')

consumer = client.subscribe(
    'persistent://mycompany/production/user-events',
    subscription_name='user-processor',
    schema=pulsar.schema.AvroSchema({
        'type': 'record',
        'name': 'User',
        'fields': [
            {'name': 'id', 'type': 'string'},
            {'name': 'email', 'type': 'string'},
            {'name': 'name', 'type': 'string'},
            {'name': 'created_at', 'type': 'long'}
        ]
    })
)

while True:
    msg = consumer.receive()
    try:
        print(f"Received: {msg.value()}")
        consumer.acknowledge(msg)
    except Exception as e:
        consumer.negative_acknowledge(msg)

consumer.close()
client.close()
```

## Configuring BookKeeper for Performance

Optimize BookKeeper for your workload:

```yaml
# bookkeeper-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bookkeeper-config
  namespace: pulsar
data:
  BOOKIE_JOURNAL_DIRS: /bookkeeper/data/journal
  BOOKIE_LEDGER_DIRS: /bookkeeper/data/ledgers
  # Journal settings (write-ahead log)
  BOOKIE_JOURNAL_WRITE_BUFFER_SIZE_KB: "4096"
  BOOKIE_JOURNAL_SYNC_DATA: "true"
  BOOKIE_JOURNAL_MAX_GROUP_WAIT_MSEC: "1"

  # Ledger storage settings
  BOOKIE_DB_STORAGE_ROCKSDB_WRITE_BUFFER_SIZE_MB: "256"
  BOOKIE_DB_STORAGE_ROCKSDB_BLOCK_CACHE_SIZE_MB: "512"

  # Performance tuning
  BOOKIE_NUM_ADD_WORKER_THREADS: "8"
  BOOKIE_NUM_READ_WORKER_THREADS: "8"
  BOOKIE_READ_BUFFER_SIZE_BYTES: "4096"

  # Disk usage management
  BOOKIE_DISK_USAGE_THRESHOLD: "0.95"
  BOOKIE_DISK_USAGE_WARN_THRESHOLD: "0.90"
```

Apply this configuration by upgrading the Helm release:

```bash
helm upgrade pulsar apache/pulsar \
  --namespace pulsar \
  --reuse-values \
  --set bookkeeper.configData.BOOKIE_JOURNAL_WRITE_BUFFER_SIZE_KB=4096
```

## Monitoring Pulsar and BookKeeper

Deploy Prometheus monitoring:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: pulsar-monitor
  namespace: pulsar
spec:
  selector:
    matchLabels:
      component: broker
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: bookkeeper-monitor
  namespace: pulsar
spec:
  selector:
    matchLabels:
      component: bookkeeper
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

Key metrics to monitor:

- Message throughput: `pulsar_in_messages_total`, `pulsar_out_messages_total`
- BookKeeper write latency: `bookie_ADD_ENTRY_REQUEST`
- Storage usage: `bookkeeper_server_BOOKIES_ledger_disk_usage`
- Subscription backlog: `pulsar_subscription_back_log`

## Implementing Tiered Storage

Configure tiered storage to offload old data to object storage:

```yaml
# offload-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: offload-config
  namespace: pulsar
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "your-access-key"
  AWS_SECRET_ACCESS_KEY: "your-secret-key"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: broker-offload-config
  namespace: pulsar
data:
  PULSAR_PREFIX_managedLedgerOffloadDriver: "aws-s3"
  PULSAR_PREFIX_s3ManagedLedgerOffloadBucket: "pulsar-offload"
  PULSAR_PREFIX_s3ManagedLedgerOffloadRegion: "us-west-2"
  PULSAR_PREFIX_managedLedgerOffloadThresholdInBytes: "10737418240"  # 10GB
  PULSAR_PREFIX_managedLedgerOffloadDeletionLagInMillis: "3600000"  # 1 hour
```

Update broker configuration:

```bash
helm upgrade pulsar apache/pulsar \
  --namespace pulsar \
  --reuse-values \
  --set broker.configData.managedLedgerOffloadDriver=aws-s3 \
  --set broker.configData.s3ManagedLedgerOffloadBucket=pulsar-offload
```

Topics automatically offload old segments to S3, reducing BookKeeper storage costs.

## Scaling BookKeeper and Brokers

Scale components independently:

```bash
# Add more bookies for storage capacity
helm upgrade pulsar apache/pulsar \
  --namespace pulsar \
  --reuse-values \
  --set bookkeeper.replicaCount=6

# Add more brokers for message throughput
helm upgrade pulsar apache/pulsar \
  --namespace pulsar \
  --reuse-values \
  --set broker.replicaCount=6

# Verify scaling
kubectl get pods -n pulsar -l component=bookkeeper
kubectl get pods -n pulsar -l component=broker
```

Pulsar automatically rebalances topic partitions across new brokers.

## Implementing Geo-Replication

Set up replication across clusters:

```bash
# On second cluster, create peer cluster entry
bin/pulsar-admin clusters create pulsar-cluster-west \
  --url http://pulsar-broker.pulsar-west.svc.cluster.local:8080 \
  --broker-url pulsar://pulsar-broker.pulsar-west.svc.cluster.local:6650

# Enable replication for namespace
bin/pulsar-admin namespaces set-clusters mycompany/production \
  --clusters pulsar-cluster,pulsar-cluster-west

# Check replication status
bin/pulsar-admin topics stats \
  persistent://mycompany/production/user-events
```

Messages automatically replicate to the second cluster for disaster recovery.

## Backup and Recovery

Back up BookKeeper ledgers and metadata:

```bash
# Backup ZooKeeper metadata
kubectl exec -it -n pulsar pulsar-zookeeper-0 -- \
  zkCli.sh -server localhost:2181 dump /ledgers > zk-backup.txt

# BookKeeper ledgers are backed up via tiered storage
# or snapshot the persistent volumes

# For disaster recovery, restore ZooKeeper data
kubectl exec -it -n pulsar pulsar-zookeeper-0 -- \
  zkCli.sh -server localhost:2181 < zk-backup.txt
```

## Conclusion

Apache Pulsar with BookKeeper on Kubernetes provides a robust, scalable messaging platform that separates compute and storage concerns. The architecture enables independent scaling of brokers and bookies, making it cost-effective to handle varying workloads.

BookKeeper's distributed ledger design ensures durability without sacrificing performance, while Pulsar's multi-tenancy and schema registry provide enterprise features often missing from simpler messaging systems. The combination of guaranteed ordering, geo-replication, and tiered storage makes Pulsar an excellent choice for event-driven architectures requiring both high throughput and strong delivery guarantees.
