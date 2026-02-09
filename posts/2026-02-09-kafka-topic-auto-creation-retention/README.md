# How to Implement Kafka Topic Auto-Creation and Retention Policies on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kafka, Message Queue, Data Management

Description: Learn how to configure Kafka topic auto-creation, implement retention policies, and manage topic lifecycle on Kubernetes for efficient data management and storage optimization.

---

Managing Kafka topics at scale requires careful consideration of topic creation strategies and data retention policies. Improper configuration can lead to storage exhaustion, data loss, or operational complexity. Understanding how to control topic auto-creation and implement appropriate retention policies ensures your Kafka cluster remains efficient and maintainable.

In this guide, you'll learn how to configure topic auto-creation, implement time-based and size-based retention policies, manage topic lifecycle with Kubernetes operators, and optimize storage usage in Kafka on Kubernetes.

## Understanding Kafka Topic Auto-Creation

Kafka supports automatic topic creation when producers or consumers reference non-existent topics. While convenient for development, auto-creation in production can lead to:

- Inconsistent partition counts across topics
- Suboptimal replication factors
- Unintended resource consumption
- Difficulty tracking topic ownership

The `auto.create.topics.enable` broker configuration controls this behavior.

## Disabling Auto-Creation in Production

For production environments, disable auto-creation and manage topics explicitly. Configure Kafka brokers:

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: production-cluster
  namespace: kafka
spec:
  kafka:
    version: 3.6.0
    replicas: 3
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
      - name: tls
        port: 9093
        type: internal
        tls: true
    config:
      # Disable automatic topic creation
      auto.create.topics.enable: false
      # Set default replication factor
      default.replication.factor: 3
      # Set minimum in-sync replicas
      min.insync.replicas: 2
      # Configure default partition count
      num.partitions: 3
      # Enable log cleanup
      log.cleanup.policy: delete
      # Set default retention
      log.retention.hours: 168  # 7 days
      log.retention.bytes: -1   # Unlimited by size
    storage:
      type: jbod
      volumes:
      - id: 0
        type: persistent-claim
        size: 100Gi
        deleteClaim: false
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 10Gi
      deleteClaim: false
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

Apply the configuration:

```bash
kubectl apply -f kafka-cluster.yaml

# Verify auto-creation is disabled
kubectl exec -n kafka production-cluster-kafka-0 -- bin/kafka-configs.sh \
  --bootstrap-server localhost:9092 \
  --entity-type brokers \
  --entity-default \
  --describe | grep auto.create.topics.enable
```

## Creating Topics with Strimzi KafkaTopic CRD

Use Kubernetes custom resources to declaratively manage topics:

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: user-events
  namespace: kafka
  labels:
    strimzi.io/cluster: production-cluster
spec:
  partitions: 12
  replicas: 3
  config:
    # Time-based retention: 7 days
    retention.ms: 604800000
    # Size-based retention: 1GB per partition
    retention.bytes: 1073741824
    # Cleanup policy: delete old segments
    cleanup.policy: delete
    # Segment size: 1GB
    segment.bytes: 1073741824
    # Segment time: 1 day
    segment.ms: 86400000
    # Compression type
    compression.type: snappy
    # Minimum in-sync replicas
    min.insync.replicas: 2
```

Apply the topic:

```bash
kubectl apply -f user-events-topic.yaml

# Verify topic creation
kubectl get kafkatopic -n kafka user-events

# Check topic configuration
kubectl exec -n kafka production-cluster-kafka-0 -- bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --describe --topic user-events
```

## Implementing Time-Based Retention Policies

Configure topics to retain messages for specific time periods:

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: application-logs
  namespace: kafka
  labels:
    strimzi.io/cluster: production-cluster
spec:
  partitions: 6
  replicas: 3
  config:
    # Retain for 3 days
    retention.ms: 259200000
    # Delete old segments
    cleanup.policy: delete
    # Check every 5 minutes for segments to delete
    segment.ms: 300000
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: audit-events
  namespace: kafka
  labels:
    strimzi.io/cluster: production-cluster
spec:
  partitions: 3
  replicas: 3
  config:
    # Retain for 90 days for compliance
    retention.ms: 7776000000
    cleanup.policy: delete
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: real-time-metrics
  namespace: kafka
  labels:
    strimzi.io/cluster: production-cluster
spec:
  partitions: 24
  replicas: 3
  config:
    # Retain for 1 hour only
    retention.ms: 3600000
    # Aggressive cleanup
    segment.ms: 600000
    cleanup.policy: delete
```

## Implementing Size-Based Retention Policies

Limit topic storage by size rather than time:

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: large-files
  namespace: kafka
  labels:
    strimzi.io/cluster: production-cluster
spec:
  partitions: 6
  replicas: 3
  config:
    # Retain up to 10GB per partition
    retention.bytes: 10737418240
    # No time-based limit
    retention.ms: -1
    # Cleanup when size limit reached
    cleanup.policy: delete
    # Large segments for file data
    segment.bytes: 2147483648  # 2GB
```

## Combining Time and Size Retention

Use both time and size limits - whichever is reached first triggers cleanup:

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: hybrid-retention
  namespace: kafka
  labels:
    strimzi.io/cluster: production-cluster
spec:
  partitions: 12
  replicas: 3
  config:
    # Delete after 14 days OR 5GB per partition
    retention.ms: 1209600000     # 14 days
    retention.bytes: 5368709120   # 5GB
    cleanup.policy: delete
```

## Implementing Log Compaction

For topics storing latest state (like database change logs), use compaction:

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: user-profiles
  namespace: kafka
  labels:
    strimzi.io/cluster: production-cluster
spec:
  partitions: 12
  replicas: 3
  config:
    # Use compaction to keep latest value per key
    cleanup.policy: compact
    # Minimum time before compaction
    min.compaction.lag.ms: 3600000  # 1 hour
    # Maximum time before compaction
    max.compaction.lag.ms: 86400000 # 24 hours
    # Minimum cleanup ratio
    min.cleanable.dirty.ratio: 0.5
    # Delete tombstones after 24 hours
    delete.retention.ms: 86400000
```

Compaction keeps the latest value for each key indefinitely while removing older values.

## Hybrid Cleanup: Compact and Delete

Combine compaction with time-based deletion:

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: session-data
  namespace: kafka
  labels:
    strimzi.io/cluster: production-cluster
spec:
  partitions: 12
  replicas: 3
  config:
    # Compact AND delete after 7 days
    cleanup.policy: compact,delete
    retention.ms: 604800000
    min.compaction.lag.ms: 3600000
    segment.ms: 86400000
```

This keeps the latest state for each key, but also removes old data after the retention period.

## Automating Topic Creation with Templates

Create a template system for consistent topic configuration:

```yaml
# Template for event topics
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-topic-templates
  namespace: kafka
data:
  event-topic-template.yaml: |
    partitions: 12
    replicas: 3
    config:
      retention.ms: 604800000
      retention.bytes: 2147483648
      cleanup.policy: delete
      compression.type: snappy
      min.insync.replicas: 2

  state-topic-template.yaml: |
    partitions: 6
    replicas: 3
    config:
      cleanup.policy: compact
      min.compaction.lag.ms: 3600000
      compression.type: snappy
      min.insync.replicas: 2

  metrics-topic-template.yaml: |
    partitions: 24
    replicas: 3
    config:
      retention.ms: 3600000
      cleanup.policy: delete
      segment.ms: 300000
      min.insync.replicas: 2
```

Use a script to create topics from templates:

```bash
#!/bin/bash

TOPIC_NAME=$1
TEMPLATE=$2

kubectl apply -f - <<EOF
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: ${TOPIC_NAME}
  namespace: kafka
  labels:
    strimzi.io/cluster: production-cluster
    template: ${TEMPLATE}
spec:
  $(kubectl get configmap kafka-topic-templates -n kafka -o jsonpath="{.data.${TEMPLATE}-template\.yaml}")
EOF
```

## Monitoring Topic Storage Usage

Deploy Kafka Exporter to monitor topic metrics:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kafka-exporter
  namespace: kafka
  labels:
    app: kafka-exporter
spec:
  ports:
  - port: 9308
    name: metrics
  selector:
    app: kafka-exporter
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka-exporter
  namespace: kafka
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kafka-exporter
  template:
    metadata:
      labels:
        app: kafka-exporter
    spec:
      containers:
      - name: kafka-exporter
        image: danielqsj/kafka-exporter:latest
        args:
        - --kafka.server=production-cluster-kafka-bootstrap:9092
        - --topic.filter=.*
        ports:
        - containerPort: 9308
          name: metrics
```

Create Prometheus alerts for storage issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kafka-storage-alerts
  namespace: monitoring
spec:
  groups:
  - name: kafka-storage
    rules:
    - alert: KafkaTopicStorageHigh
      expr: |
        kafka_topic_partition_current_offset - kafka_topic_partition_oldest_offset > 1000000
      for: 30m
      labels:
        severity: warning
      annotations:
        summary: "Kafka topic storage high"
        description: "Topic {{ $labels.topic }} has over 1M messages"

    - alert: KafkaRetentionNotWorking
      expr: |
        increase(kafka_topic_partition_current_offset[24h]) > 0 and
        increase(kafka_topic_partition_oldest_offset[24h]) == 0
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Kafka retention not working"
        description: "Topic {{ $labels.topic }} is not deleting old messages"
```

## Implementing Topic Lifecycle Policies

Create a custom controller to manage topic lifecycle:

```python
# kafka-topic-lifecycle-controller.py
from kubernetes import client, config, watch
import time

def should_delete_topic(topic):
    """Check if topic should be deleted based on labels/annotations"""
    if 'auto-delete-after' in topic.metadata.annotations:
        created = topic.metadata.creation_timestamp
        retention_days = int(topic.metadata.annotations['auto-delete-after'])
        age_days = (time.time() - created.timestamp()) / 86400
        return age_days > retention_days
    return False

def watch_topics():
    config.load_incluster_config()
    v1 = client.CustomObjectsApi()

    w = watch.Watch()
    for event in w.stream(
        v1.list_namespaced_custom_object,
        group="kafka.strimzi.io",
        version="v1beta2",
        namespace="kafka",
        plural="kafkatopics"
    ):
        topic = event['object']
        if should_delete_topic(topic):
            print(f"Deleting topic {topic['metadata']['name']}")
            v1.delete_namespaced_custom_object(
                group="kafka.strimzi.io",
                version="v1beta2",
                namespace="kafka",
                plural="kafkatopics",
                name=topic['metadata']['name']
            )

if __name__ == '__main__':
    watch_topics()
```

Deploy the lifecycle controller:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka-topic-lifecycle
  namespace: kafka
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kafka-topic-lifecycle
  template:
    metadata:
      labels:
        app: kafka-topic-lifecycle
    spec:
      serviceAccountName: kafka-topic-lifecycle
      containers:
      - name: controller
        image: kafka-topic-lifecycle:latest
        env:
        - name: PYTHONUNBUFFERED
          value: "1"
```

## Best Practices

Follow these practices for topic management:

1. **Disable auto-creation in production** - Enforce explicit topic creation
2. **Use appropriate retention** - Balance storage costs with data requirements
3. **Choose correct cleanup policy** - Delete for events, compact for state
4. **Monitor storage usage** - Alert on topics growing beyond expected size
5. **Document topic purpose** - Use labels and annotations for metadata
6. **Plan partition counts** - Consider throughput requirements upfront
7. **Test retention policies** - Verify cleanup works as expected

## Troubleshooting Common Issues

Common problems and solutions:

```bash
# Topic not being created
kubectl describe kafkatopic user-events -n kafka
kubectl logs -n kafka production-cluster-entity-operator -c topic-operator

# Retention not working
kubectl exec -n kafka production-cluster-kafka-0 -- \
  bin/kafka-log-dirs.sh --bootstrap-server localhost:9092 \
  --describe --topic-list user-events

# Check cleanup configuration
kubectl exec -n kafka production-cluster-kafka-0 -- \
  bin/kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name user-events --describe
```

## Conclusion

Properly managing Kafka topic creation and retention policies is essential for operating Kafka at scale on Kubernetes. By disabling auto-creation, implementing appropriate retention policies, and monitoring storage usage, you ensure efficient resource utilization and predictable behavior.

The combination of Strimzi's declarative topic management, flexible retention configurations, and Kubernetes-native monitoring provides a robust foundation for managing Kafka topics in production. Understanding when to use time-based retention, size-based retention, or log compaction enables you to optimize your Kafka cluster for different data patterns and requirements.
