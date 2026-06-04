# How to Deploy Apache Pulsar with BookKeeper on Kubernetes for Event Streaming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Pulsar, Kubernetes, Streaming

Description: Learn how to deploy Apache Pulsar with Apache BookKeeper on Kubernetes for high-performance event streaming with guaranteed ordering, geo-replication, and multi-tenancy capabilities.

---

Apache Pulsar provides a cloud-native distributed messaging and streaming platform that separates compute from storage. By using Apache BookKeeper for durable storage, Pulsar achieves better scalability and performance characteristics than traditional messaging systems. This guide demonstrates deploying a production-ready Pulsar cluster on Kubernetes with BookKeeper, including configuration for multi-tenancy and geo-replication.

## Understanding Pulsar and BookKeeper Architecture

Pulsar consists of several layers working together. The broker layer handles message routing and serves client connections. BookKeeper provides the durable storage layer, organizing data into ledgers distributed across bookie nodes. ZooKeeper manages cluster metadata and coordination. This separation enables independent scaling of compute and storage, unlike Kafka where brokers bundle both concerns.

BookKeeper's architecture uses a write-ahead log with automatic replication. When publishers send messages, brokers write to BookKeeper ledgers, which replicate entries across multiple bookies before acknowledging. This ensures durability without sacrificing throughput, as BookKeeper handles parallel writes efficiently.

## Installing Pulsar with Helm

Deploy Pulsar using the official Apache Pulsar Helm chart:

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
  --set clusterName=pulsar-cluster \
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
  --set components.autorecovery=true

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
# - pulsar-toolset-0 (admin tools)

# Verify cluster initialization
kubectl exec -it -n pulsar pulsar-toolset-0 -- \
  bin/pulsar-admin clusters list

# Should show 'pulsar-cluster'
```

## Configuring Multi-Tenancy

Set up tenants and namespaces for workload isolation:

```bash
# Access admin tools
kubectl exec -it -n pulsar pulsar-toolset-0 -- bash

# Inside the toolset pod
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
bin/pulsar-admin namespaces set-clusters mycompany/production \
  --clusters pulsar-cluster

# Set namespace publish and dispatch rates
bin/pulsar-admin namespaces set-publish-rate mycompany/production \
  --msg-publish-rate 1000 \
  --byte-publish-rate 10485760

bin/pulsar-admin namespaces set-dispatch-rate mycompany/production \
  --msg-dispatch-rate 2000 \
  --byte-dispatch-rate 20971520
```

This creates isolated environments with independent resource limits and retention policies.

## Creating Topics and Schemas

Create topics with schema enforcement:

```bash
# Create partitioned topic
bin/pulsar-admin topics create-partitioned-topic \
  persistent://mycompany/production/user-events \
  --partitions 6

# Register Avro schema for type safety
cat > user-schema.json <<EOF
{
  "type": "AVRO",
  "schema": "{\"type\":\"record\",\"name\":\"User\",\"namespace\":\"com.mycompany\",\"fields\":[{\"name\":\"id\",\"type\":\"string\"},{\"name\":\"email\",\"type\":\"string\"},{\"name\":\"name\",\"type\":\"string\"},{\"name\":\"created_at\",\"type\":\"long\"}]}",
  "properties": {}
}
EOF

bin/pulsar-admin schemas upload \
  persistent://mycompany/production/user-events \
  --filename user-schema.json

# View schema
bin/pulsar-admin schemas get \
  persistent://mycompany/production/user-events
```

Schema-aware producers and consumers prevent incompatible messages from entering topics.

## Publishing and Consuming Messages

Test the cluster with sample producers and consumers:

```python
# producer.py - run from toolset pod
import time
import pulsar
from pulsar import schema


class User(schema.Record):
    _avro_namespace = "com.mycompany"

    id = schema.String(required=True)
    email = schema.String(required=True)
    name = schema.String(required=True)
    created_at = schema.Long(required=True)

client = pulsar.Client('pulsar://pulsar-broker:6650')

producer = client.create_producer(
    'persistent://mycompany/production/user-events',
    schema=schema.AvroSchema(User)
)

# Publish message
producer.send(User(
    id='123',
    email='alice@example.com',
    name='Alice',
    created_at=int(time.time() * 1000)
))

producer.close()
client.close()
```

```python
# consumer.py
import pulsar
from pulsar import schema


class User(schema.Record):
    _avro_namespace = "com.mycompany"

    id = schema.String(required=True)
    email = schema.String(required=True)
    name = schema.String(required=True)
    created_at = schema.Long(required=True)

client = pulsar.Client('pulsar://pulsar-broker:6650')

consumer = client.subscribe(
    'persistent://mycompany/production/user-events',
    subscription_name='user-processor',
    schema=schema.AvroSchema(User)
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
# bookkeeper-values.yaml
bookkeeper:
  configData:
    # Journal settings (write-ahead log)
    journalWriteBufferSizeKB: "4096"
    journalSyncData: "true"
    journalMaxGroupWaitMSec: "1"

    # Ledger storage settings
    dbStorage_rocksDB_writeBufferSizeMB: "256"
    dbStorage_rocksDB_blockSize: "536870912"

    # Performance tuning
    numAddWorkerThreads: "8"
    numReadWorkerThreads: "8"
    readBufferSizeBytes: "4096"

    # Disk usage management
    diskUsageThreshold: "0.95"
    diskUsageWarnThreshold: "0.90"
```

Apply this configuration by upgrading the Helm release:

```bash
helm upgrade pulsar apache/pulsar \
  --namespace pulsar \
  --reuse-values \
  -f bookkeeper-values.yaml
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
      component: bookie
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

Key metrics to monitor:

- Message throughput: `pulsar_broker_rate_in`, `pulsar_broker_rate_out`
- BookKeeper write latency: `bookkeeper_server_ADD_ENTRY_REQUEST`
- Storage health: `bookie_ledgers_count`, `bookie_ledger_writable_dirs`
- Subscription backlog: `pulsar_subscription_back_log`

## Implementing Tiered Storage

Configure tiered storage to offload old data to object storage:

```yaml
# offload-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: offload-config
  namespace: pulsar
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "your-access-key"
  AWS_SECRET_ACCESS_KEY: "your-secret-key"
```

```yaml
# offload-values.yaml
broker:
  extraEnvs:
    - name: AWS_ACCESS_KEY_ID
      valueFrom:
        secretKeyRef:
          name: offload-config
          key: AWS_ACCESS_KEY_ID
    - name: AWS_SECRET_ACCESS_KEY
      valueFrom:
        secretKeyRef:
          name: offload-config
          key: AWS_SECRET_ACCESS_KEY
  configData:
    managedLedgerOffloadDriver: "aws-s3"
    offloadersDirectory: "offloaders"
    s3ManagedLedgerOffloadBucket: "pulsar-offload"
    s3ManagedLedgerOffloadRegion: "us-west-2"
```

Update broker configuration:

```bash
kubectl apply -f offload-secret.yaml

helm upgrade pulsar apache/pulsar \
  --namespace pulsar \
  --reuse-values \
  -f offload-values.yaml

bin/pulsar-admin namespaces set-offload-threshold mycompany/production \
  --size 10G

bin/pulsar-admin namespaces set-offload-deletion-lag mycompany/production \
  --lag 1h
```

After the namespace threshold is set, Pulsar offloads eligible old segments to S3, reducing BookKeeper storage costs.

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
kubectl get pods -n pulsar -l component=bookie
kubectl get pods -n pulsar -l component=broker
```

Pulsar's broker load manager assigns topics to available brokers and can unload bundles to redistribute load.

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
# Inspect BookKeeper ledger metadata before a backup
kubectl exec -it -n pulsar pulsar-bookie-0 -- \
  bin/bookkeeper shell listledgers -meta > ledger-metadata.txt

# Back up ZooKeeper and BookKeeper by snapshotting their persistent volumes
kubectl get pvc -n pulsar -l component=zookeeper
kubectl get pvc -n pulsar -l component=bookie

# Restore from coordinated volume snapshots and verify the ledger metadata
kubectl exec -it -n pulsar pulsar-bookie-0 -- \
  bin/bookkeeper shell listledgers
```

## Conclusion

Apache Pulsar with BookKeeper on Kubernetes provides a robust, scalable messaging platform that separates compute and storage concerns. The architecture enables independent scaling of brokers and bookies, making it cost-effective to handle varying workloads.

BookKeeper's distributed ledger design ensures durability without sacrificing performance, while Pulsar's multi-tenancy and schema registry provide enterprise features often missing from simpler messaging systems. The combination of guaranteed ordering, geo-replication, and tiered storage makes Pulsar an excellent choice for event-driven architectures requiring both high throughput and strong delivery guarantees.
