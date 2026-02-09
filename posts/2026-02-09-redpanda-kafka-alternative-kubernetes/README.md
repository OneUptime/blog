# How to Run Redpanda Instead of Kafka on Kubernetes for Lower Latency Streaming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redpanda, Kafka, Kubernetes

Description: Learn how to deploy Redpanda on Kubernetes as a Kafka-compatible streaming platform that delivers lower latency and simpler operations without ZooKeeper dependencies.

---

Redpanda reimagines Kafka in C++ without Java's JVM overhead or ZooKeeper dependencies. It provides full Kafka API compatibility while delivering lower tail latencies and simpler operations. For teams running Kubernetes, Redpanda eliminates the operational complexity of managing ZooKeeper clusters while improving performance. This guide demonstrates deploying Redpanda on Kubernetes and migrating from Kafka.

## Why Choose Redpanda Over Kafka

Redpanda provides several advantages for Kubernetes environments. First, it eliminates ZooKeeper entirely by implementing Raft consensus directly. This reduces the number of moving parts and removes a common source of operational issues. Second, Redpanda's C++ implementation avoids JVM garbage collection pauses, delivering consistent low latencies even under heavy load.

Third, Redpanda uses thread-per-core architecture that maximizes modern CPU efficiency. Unlike Kafka's thread-pool model, Redpanda eliminates lock contention and context switching overhead. Finally, Redpanda provides a built-in schema registry and HTTP proxy, reducing the number of separate components you need to deploy.

## Installing Redpanda with the Operator

Deploy Redpanda using the official operator:

```bash
# Install the Redpanda operator
kubectl apply -k https://github.com/redpanda-data/redpanda-operator/src/go/k8s/config/crd

kubectl create namespace redpanda-system

kubectl apply -k https://github.com/redpanda-data/redpanda-operator/src/go/k8s/config/default \
  --namespace redpanda-system

# Verify operator installation
kubectl get pods -n redpanda-system
```

The operator manages Redpanda cluster lifecycle through custom resources.

## Deploying a Redpanda Cluster

Create a production-ready Redpanda cluster:

```yaml
# redpanda-cluster.yaml
apiVersion: cluster.redpanda.com/v1alpha1
kind: Redpanda
metadata:
  name: redpanda
  namespace: redpanda
spec:
  replicas: 3

  # Resource configuration
  resources:
    requests:
      cpu: 2000m
      memory: 8Gi
    limits:
      cpu: 4000m
      memory: 16Gi

  # Storage configuration
  storage:
    capacity: 200Gi
    storageClassName: fast-ssd

  # Redpanda configuration
  configuration:
    redpanda:
      # Enable developer mode for testing (disable in production)
      developer_mode: false

      # Kafka API configuration
      kafka_api:
        - name: kafka
          port: 9092

      # Admin API
      admin:
        - name: admin
          port: 9644

      # RPC (internal)
      rpc_server:
        port: 33145

      # Performance tuning
      log_segment_size: 1073741824  # 1GB
      compacted_log_segment_size: 536870912  # 512MB
      max_compacted_log_segment_size: 5368709120  # 5GB

      # Replication settings
      default_topic_replications: 3
      transaction_coordinator_replication: 3
      id_allocator_replication: 3

    # Schema registry (built-in)
    schema_registry:
      schema_registry_api:
        - name: schema-registry
          port: 8081

    # Pandaproxy (HTTP API)
    pandaproxy:
      pandaproxy_api:
        - name: proxy
          port: 8082

  # External connectivity
  external:
    enabled: true
    type: LoadBalancer
```

Deploy the cluster:

```bash
# Create namespace
kubectl create namespace redpanda

# Apply cluster configuration
kubectl apply -f redpanda-cluster.yaml

# Watch cluster initialization
kubectl get pods -n redpanda -w

# Verify cluster health
kubectl exec -it -n redpanda redpanda-0 -- \
  rpk cluster health
```

## Connecting to Redpanda with Kafka Clients

Redpanda is fully Kafka API compatible. Use standard Kafka clients:

```bash
# Get service endpoints
kubectl get svc -n redpanda

# Port-forward for local access
kubectl port-forward -n redpanda svc/redpanda 9092:9092

# Create topic using rpk
kubectl exec -it -n redpanda redpanda-0 -- \
  rpk topic create events --partitions 6 --replicas 3

# List topics
kubectl exec -it -n redpanda redpanda-0 -- \
  rpk topic list
```

Use any Kafka client library:

```python
# producer.py
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Send message
producer.send('events', {'event': 'user_signup', 'user_id': 123})
producer.flush()
producer.close()
```

```python
# consumer.py
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'events',
    bootstrap_servers=['localhost:9092'],
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    group_id='event-processor'
)

for message in consumer:
    print(f"Received: {message.value}")
```

No code changes needed when migrating from Kafka.

## Configuring Performance Tuning

Optimize Redpanda for low latency:

```yaml
# Update cluster configuration
apiVersion: cluster.redpanda.com/v1alpha1
kind: Redpanda
metadata:
  name: redpanda
  namespace: redpanda
spec:
  configuration:
    redpanda:
      # Batch settings for throughput
      kafka_batch_max_bytes: 1048576
      kafka_max_bytes: 10485760

      # Reduce latency
      kafka_qdc_depth_alpha: 0.8
      kafka_qdc_max_latency_ms: 1000

      # Memory configuration
      kafka_memory_share_for_fetch: 0.3

      # Disk I/O tuning
      raft_io_timeout_ms: 10000
      raft_heartbeat_interval_ms: 150

      # Enable metrics
      metrics_reporter_enabled: true
```

Apply configuration:

```bash
kubectl apply -f redpanda-cluster.yaml

# Restart is handled by the operator
kubectl get pods -n redpanda -w
```

## Using the Built-in Schema Registry

Redpanda includes a Schema Registry compatible with Confluent's implementation:

```bash
# Access schema registry
kubectl port-forward -n redpanda svc/redpanda-schema-registry 8081:8081

# Register Avro schema
curl -X POST http://localhost:8081/subjects/events-value/versions \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{
    "schema": "{\"type\":\"record\",\"name\":\"Event\",\"fields\":[{\"name\":\"event\",\"type\":\"string\"},{\"name\":\"user_id\",\"type\":\"int\"}]}"
  }'

# List schemas
curl http://localhost:8081/subjects
```

Use schemas in your applications:

```python
from confluent_kafka import Producer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer
from confluent_kafka.serialization import SerializationContext, MessageField

schema_registry_client = SchemaRegistryClient({'url': 'http://localhost:8081'})

avro_serializer = AvroSerializer(
    schema_registry_client,
    schema_str="""{
        "type": "record",
        "name": "Event",
        "fields": [
            {"name": "event", "type": "string"},
            {"name": "user_id", "type": "int"}
        ]
    }"""
)

producer = Producer({'bootstrap.servers': 'localhost:9092'})

# Serialize with schema validation
producer.produce(
    topic='events',
    value=avro_serializer(
        {'event': 'user_signup', 'user_id': 123},
        SerializationContext('events', MessageField.VALUE)
    )
)
```

## Monitoring Redpanda Performance

Deploy Prometheus monitoring:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: redpanda-monitor
  namespace: redpanda
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: redpanda
  endpoints:
    - port: admin
      path: /metrics
      interval: 30s
    - port: admin
      path: /public_metrics
      interval: 30s
```

Key Redpanda metrics:

- Produce latency: `vectorized_kafka_rpc_produce_latency_us`
- Fetch latency: `vectorized_kafka_rpc_fetch_latency_us`
- Disk utilization: `vectorized_storage_disk_total_bytes`
- Partition count: `vectorized_cluster_partition_count`

Redpanda consistently shows p99 latencies 5-10x lower than Kafka.

## Migrating from Kafka to Redpanda

Use MirrorMaker 2 to migrate data:

```yaml
# mirror-maker.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mirror-maker
  namespace: redpanda
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mirror-maker
  template:
    metadata:
      labels:
        app: mirror-maker
    spec:
      containers:
        - name: mirror-maker
          image: apache/kafka:3.6.0
          command:
            - /bin/bash
            - -c
            - |
              cat > /tmp/mm2.properties <<EOF
              clusters = source, target
              source.bootstrap.servers = kafka-broker:9092
              target.bootstrap.servers = redpanda.redpanda:9092

              source->target.enabled = true
              source->target.topics = .*

              replication.factor = 3
              checkpoints.topic.replication.factor = 3
              heartbeats.topic.replication.factor = 3
              offset-syncs.topic.replication.factor = 3
              EOF

              /opt/kafka/bin/connect-mirror-maker.sh /tmp/mm2.properties
```

This replicates all topics from Kafka to Redpanda. Update applications to point to Redpanda once replication catches up.

## Implementing Tiered Storage

Configure cloud storage for older segments:

```yaml
spec:
  configuration:
    redpanda:
      # Enable cloud storage
      cloud_storage_enabled: true
      cloud_storage_region: us-west-2
      cloud_storage_bucket: redpanda-tiered-storage
      cloud_storage_access_key: ${AWS_ACCESS_KEY}
      cloud_storage_secret_key: ${AWS_SECRET_KEY}

      # Tiered storage settings
      cloud_storage_segment_max_upload_interval_sec: 1800
      retention_local_target_bytes_default: 107374182400  # 100GB local
```

Older data automatically moves to S3, reducing local storage costs.

## Scaling the Cluster

Add more nodes for capacity:

```bash
# Scale to 6 nodes
kubectl patch redpanda redpanda -n redpanda \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/replicas", "value": 6}]'

# Verify scaling
kubectl get pods -n redpanda

# Rebalance partitions
kubectl exec -it -n redpanda redpanda-0 -- \
  rpk cluster partitions rebalance
```

Redpanda automatically rebalances partition replicas across new nodes.

## Configuring High Availability

Enable rack awareness for zone distribution:

```yaml
spec:
  rackAwareness:
    enabled: true
    nodeAnnotation: topology.kubernetes.io/zone
```

This ensures replicas spread across availability zones, surviving zone failures.

## Backup and Recovery

Back up topic data to object storage:

```bash
# Tiered storage serves as continuous backup

# For point-in-time recovery, use rpk backup
kubectl exec -it -n redpanda redpanda-0 -- \
  rpk cluster storage backup create \
  --bucket redpanda-backups \
  --region us-west-2

# Restore from backup
kubectl exec -it -n redpanda redpanda-0 -- \
  rpk cluster storage backup restore \
  --bucket redpanda-backups \
  --backup-id <BACKUP_ID>
```

## Conclusion

Redpanda simplifies Kafka operations while delivering better performance. By eliminating ZooKeeper and JVM overhead, it reduces operational complexity and provides consistent low latencies. The Kafka API compatibility means existing applications work without modification, making migration straightforward.

For Kubernetes environments, Redpanda's simpler architecture translates to fewer pods to manage, easier troubleshooting, and lower resource consumption. The built-in schema registry and HTTP proxy further reduce deployment complexity. Teams seeking Kafka-compatible streaming with better performance and easier operations should seriously consider Redpanda.
