# How to Deploy Kafka on Kubernetes with Strimzi Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Kubernetes, Strimzi, Operators, DevOps, Cloud Native, High Availability

Description: A comprehensive guide to deploying production-ready Apache Kafka clusters on Kubernetes using the Strimzi operator, covering installation, configuration, monitoring, and best practices for enterprise deployments.

---

Deploying Apache Kafka on Kubernetes requires careful consideration of storage, networking, and stateful workload management. The Strimzi operator simplifies this process by providing custom resources that automate Kafka cluster deployment, scaling, and operations. This guide walks you through setting up production-ready Kafka clusters using Strimzi.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (version 1.21 or later)
- kubectl configured to access your cluster
- Helm 3 installed (optional, for Helm-based installation)
- At least 3 worker nodes for high availability
- Storage class with dynamic provisioning

## Installing Strimzi Operator

### Option 1: Using Helm

```bash
# Add the Strimzi Helm repository
helm repo add strimzi https://strimzi.io/charts/
helm repo update

# Create namespace for Kafka
kubectl create namespace kafka

# Install Strimzi operator
helm install strimzi-kafka-operator strimzi/strimzi-kafka-operator \
  --namespace kafka \
  --set watchNamespaces="{kafka}" \
  --wait
```

### Option 2: Using kubectl

```bash
# Create namespace
kubectl create namespace kafka

# Install Strimzi operator
kubectl apply -f 'https://strimzi.io/install/latest?namespace=kafka' \
  -n kafka

# Wait for operator to be ready
kubectl wait deployment/strimzi-cluster-operator \
  --for=condition=available \
  --timeout=300s \
  -n kafka
```

## Deploying a Basic Kafka Cluster

Create a simple Kafka cluster with KRaft mode (no ZooKeeper):

```yaml
# kafka-cluster.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaNodePool
metadata:
  name: dual-role
  namespace: kafka
  labels:
    strimzi.io/cluster: my-kafka-cluster
spec:
  replicas: 3
  roles:
    - controller
    - broker
  storage:
    type: jbod
    volumes:
      - id: 0
        type: persistent-claim
        size: 100Gi
        deleteClaim: false
        class: standard
---
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: my-kafka-cluster
  namespace: kafka
  annotations:
    strimzi.io/node-pools: enabled
    strimzi.io/kraft: enabled
spec:
  kafka:
    version: 3.7.0
    metadataVersion: 3.7-IV4
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
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
      inter.broker.protocol.version: "3.7"
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

Apply the configuration:

```bash
kubectl apply -f kafka-cluster.yaml

# Watch the cluster deployment
kubectl get kafka -n kafka -w
```

## Production-Ready Configuration

For production deployments, consider this comprehensive configuration:

```yaml
# kafka-production.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaNodePool
metadata:
  name: controller
  namespace: kafka
  labels:
    strimzi.io/cluster: production-kafka
spec:
  replicas: 3
  roles:
    - controller
  storage:
    type: jbod
    volumes:
      - id: 0
        type: persistent-claim
        size: 20Gi
        deleteClaim: false
        class: fast-ssd
  resources:
    requests:
      memory: 2Gi
      cpu: 500m
    limits:
      memory: 4Gi
      cpu: 2
  jvmOptions:
    -Xms: 1024m
    -Xmx: 1024m
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaNodePool
metadata:
  name: broker
  namespace: kafka
  labels:
    strimzi.io/cluster: production-kafka
spec:
  replicas: 3
  roles:
    - broker
  storage:
    type: jbod
    volumes:
      - id: 0
        type: persistent-claim
        size: 500Gi
        deleteClaim: false
        class: fast-ssd
  resources:
    requests:
      memory: 8Gi
      cpu: 2
    limits:
      memory: 16Gi
      cpu: 4
  jvmOptions:
    -Xms: 4096m
    -Xmx: 4096m
---
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: production-kafka
  namespace: kafka
  annotations:
    strimzi.io/node-pools: enabled
    strimzi.io/kraft: enabled
spec:
  kafka:
    version: 3.7.0
    metadataVersion: 3.7-IV4
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
      - name: tls
        port: 9093
        type: internal
        tls: true
        authentication:
          type: tls
      - name: external
        port: 9094
        type: loadbalancer
        tls: true
        authentication:
          type: tls
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
      log.retention.hours: 168
      log.segment.bytes: 1073741824
      log.retention.check.interval.ms: 300000
      num.partitions: 6
      num.recovery.threads.per.data.dir: 2
      auto.create.topics.enable: false
    rack:
      topologyKey: topology.kubernetes.io/zone
    metricsConfig:
      type: jmxPrometheusExporter
      valueFrom:
        configMapKeyRef:
          name: kafka-metrics
          key: kafka-metrics-config.yml
  entityOperator:
    topicOperator:
      resources:
        requests:
          memory: 256Mi
          cpu: 100m
        limits:
          memory: 512Mi
          cpu: 500m
    userOperator:
      resources:
        requests:
          memory: 256Mi
          cpu: 100m
        limits:
          memory: 512Mi
          cpu: 500m
  kafkaExporter:
    topicRegex: ".*"
    groupRegex: ".*"
```

## Configuring Metrics for Monitoring

Create a ConfigMap for Prometheus JMX exporter:

```yaml
# kafka-metrics-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-metrics
  namespace: kafka
data:
  kafka-metrics-config.yml: |
    lowercaseOutputName: true
    rules:
    - pattern: kafka.server<type=(.+), name=(.+), clientId=(.+), topic=(.+), partition=(.*)><>Value
      name: kafka_server_$1_$2
      type: GAUGE
      labels:
        clientId: "$3"
        topic: "$4"
        partition: "$5"
    - pattern: kafka.server<type=(.+), name=(.+), clientId=(.+), brokerHost=(.+), brokerPort=(.+)><>Value
      name: kafka_server_$1_$2
      type: GAUGE
      labels:
        clientId: "$3"
        broker: "$4:$5"
    - pattern: kafka.server<type=(.+), name=(.+)><>Value
      name: kafka_server_$1_$2
      type: GAUGE
    - pattern: kafka.server<type=(.+), name=(.+)><>Count
      name: kafka_server_$1_$2_count
      type: COUNTER
    - pattern: kafka.server<type=(.+), name=(.+)><>MeanRate
      name: kafka_server_$1_$2_meanrate
      type: GAUGE
    - pattern: kafka.controller<type=(.+), name=(.+)><>Value
      name: kafka_controller_$1_$2
      type: GAUGE
    - pattern: kafka.network<type=(.+), name=(.+)><>Value
      name: kafka_network_$1_$2
      type: GAUGE
    - pattern: kafka.network<type=(.+), name=(.+), networkProcessor=(.+)><>Count
      name: kafka_network_$1_$2_count
      type: COUNTER
      labels:
        networkProcessor: "$3"
    - pattern: kafka.log<type=(.+), name=(.+), topic=(.+), partition=(.+)><>Value
      name: kafka_log_$1_$2
      type: GAUGE
      labels:
        topic: "$3"
        partition: "$4"
```

Apply the metrics configuration:

```bash
kubectl apply -f kafka-metrics-config.yaml
```

## Creating Topics with KafkaTopic CRD

```yaml
# kafka-topics.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: orders
  namespace: kafka
  labels:
    strimzi.io/cluster: production-kafka
spec:
  partitions: 12
  replicas: 3
  config:
    retention.ms: 604800000
    segment.bytes: 1073741824
    min.insync.replicas: 2
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: events
  namespace: kafka
  labels:
    strimzi.io/cluster: production-kafka
spec:
  partitions: 6
  replicas: 3
  config:
    retention.ms: 2592000000
    cleanup.policy: compact
```

## Creating Users with KafkaUser CRD

```yaml
# kafka-users.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaUser
metadata:
  name: order-service
  namespace: kafka
  labels:
    strimzi.io/cluster: production-kafka
spec:
  authentication:
    type: tls
  authorization:
    type: simple
    acls:
      - resource:
          type: topic
          name: orders
          patternType: literal
        operations:
          - Read
          - Write
          - Describe
      - resource:
          type: group
          name: order-service-group
          patternType: literal
        operations:
          - Read
```

## Connecting Applications to Kafka

### Getting Bootstrap Server Address

For internal clients:

```bash
# Get internal bootstrap address
kubectl get kafka production-kafka -n kafka \
  -o jsonpath='{.status.listeners[?(@.name=="plain")].bootstrapServers}'
```

For external clients:

```bash
# Get external bootstrap address
kubectl get kafka production-kafka -n kafka \
  -o jsonpath='{.status.listeners[?(@.name=="external")].bootstrapServers}'
```

### Java Client Configuration

```java
import org.apache.kafka.clients.producer.*;
import java.util.Properties;

public class KubernetesKafkaProducer {
    public static void main(String[] args) {
        Properties props = new Properties();

        // For internal Kubernetes clients
        props.put("bootstrap.servers",
            "production-kafka-kafka-bootstrap.kafka.svc.cluster.local:9092");

        // For TLS connections
        props.put("security.protocol", "SSL");
        props.put("ssl.truststore.location", "/var/run/secrets/kafka/truststore.jks");
        props.put("ssl.truststore.password", "password");
        props.put("ssl.keystore.location", "/var/run/secrets/kafka/keystore.jks");
        props.put("ssl.keystore.password", "password");

        props.put("key.serializer",
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put("value.serializer",
            "org.apache.kafka.common.serialization.StringSerializer");

        Producer<String, String> producer = new KafkaProducer<>(props);

        ProducerRecord<String, String> record =
            new ProducerRecord<>("orders", "order-123", "{\"id\": 123}");

        producer.send(record, (metadata, exception) -> {
            if (exception == null) {
                System.out.println("Sent to partition: " + metadata.partition());
            } else {
                exception.printStackTrace();
            }
        });

        producer.close();
    }
}
```

### Python Client Configuration

```python
from kafka import KafkaProducer, KafkaConsumer
import json

# Producer configuration
producer = KafkaProducer(
    bootstrap_servers=[
        'production-kafka-kafka-bootstrap.kafka.svc.cluster.local:9092'
    ],
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    # For TLS
    security_protocol='SSL',
    ssl_cafile='/var/run/secrets/kafka/ca.crt',
    ssl_certfile='/var/run/secrets/kafka/user.crt',
    ssl_keyfile='/var/run/secrets/kafka/user.key'
)

# Send message
producer.send('orders', {'order_id': 123, 'status': 'created'})
producer.flush()

# Consumer configuration
consumer = KafkaConsumer(
    'orders',
    bootstrap_servers=[
        'production-kafka-kafka-bootstrap.kafka.svc.cluster.local:9092'
    ],
    group_id='order-processor',
    auto_offset_reset='earliest',
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    security_protocol='SSL',
    ssl_cafile='/var/run/secrets/kafka/ca.crt',
    ssl_certfile='/var/run/secrets/kafka/user.crt',
    ssl_keyfile='/var/run/secrets/kafka/user.key'
)

for message in consumer:
    print(f"Received: {message.value}")
```

## Deploying Kafka Connect

```yaml
# kafka-connect.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaConnect
metadata:
  name: kafka-connect
  namespace: kafka
  annotations:
    strimzi.io/use-connector-resources: "true"
spec:
  version: 3.7.0
  replicas: 2
  bootstrapServers: production-kafka-kafka-bootstrap:9093
  tls:
    trustedCertificates:
      - secretName: production-kafka-cluster-ca-cert
        certificate: ca.crt
  config:
    group.id: connect-cluster
    offset.storage.topic: connect-offsets
    config.storage.topic: connect-configs
    status.storage.topic: connect-status
    offset.storage.replication.factor: 3
    config.storage.replication.factor: 3
    status.storage.replication.factor: 3
  resources:
    requests:
      memory: 2Gi
      cpu: 500m
    limits:
      memory: 4Gi
      cpu: 2
  build:
    output:
      type: docker
      image: my-registry/kafka-connect:latest
      pushSecret: registry-credentials
    plugins:
      - name: debezium-postgres
        artifacts:
          - type: tgz
            url: https://repo1.maven.org/maven2/io/debezium/debezium-connector-postgres/2.5.0.Final/debezium-connector-postgres-2.5.0.Final-plugin.tar.gz
      - name: elasticsearch-sink
        artifacts:
          - type: zip
            url: https://d1i4a15mxbxib1.cloudfront.net/api/plugins/confluentinc/kafka-connect-elasticsearch/versions/14.0.12/confluentinc-kafka-connect-elasticsearch-14.0.12.zip
```

## Scaling Operations

### Scaling Brokers

```yaml
# Update the KafkaNodePool replicas
kubectl patch kafkanodepool broker -n kafka \
  --type merge \
  -p '{"spec": {"replicas": 5}}'
```

### Rebalancing Partitions

```yaml
# kafka-rebalance.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaRebalance
metadata:
  name: full-rebalance
  namespace: kafka
  labels:
    strimzi.io/cluster: production-kafka
spec:
  mode: full
  goals:
    - RackAwareGoal
    - ReplicaCapacityGoal
    - DiskCapacityGoal
    - NetworkInboundCapacityGoal
    - NetworkOutboundCapacityGoal
    - CpuCapacityGoal
```

## Monitoring with Prometheus

Create a ServiceMonitor for Prometheus:

```yaml
# kafka-service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kafka-metrics
  namespace: kafka
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      strimzi.io/cluster: production-kafka
      strimzi.io/kind: Kafka
  endpoints:
    - port: tcp-prometheus
      interval: 30s
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kafka-exporter
  namespace: kafka
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      strimzi.io/cluster: production-kafka
      strimzi.io/kind: Kafka
      strimzi.io/name: production-kafka-kafka-exporter
  endpoints:
    - port: tcp-prometheus
      interval: 30s
```

## Upgrading Kafka

```yaml
# Update Kafka version in the Kafka resource
kubectl patch kafka production-kafka -n kafka \
  --type merge \
  -p '{"spec": {"kafka": {"version": "3.8.0"}}}'
```

Monitor the rolling update:

```bash
kubectl get pods -n kafka -w
```

## Troubleshooting

### Check Cluster Status

```bash
# Get Kafka cluster status
kubectl get kafka -n kafka

# Describe for detailed information
kubectl describe kafka production-kafka -n kafka

# Check broker pods
kubectl get pods -n kafka -l strimzi.io/cluster=production-kafka
```

### View Logs

```bash
# Operator logs
kubectl logs deployment/strimzi-cluster-operator -n kafka

# Broker logs
kubectl logs production-kafka-broker-0 -n kafka
```

### Common Issues

**Pods stuck in Pending**: Check storage class availability and PVC status.

```bash
kubectl get pvc -n kafka
kubectl describe pvc data-0-production-kafka-broker-0 -n kafka
```

**Cluster not ready**: Check operator logs for errors.

```bash
kubectl logs -f deployment/strimzi-cluster-operator -n kafka
```

## Conclusion

Strimzi provides a robust, production-ready way to run Kafka on Kubernetes. By leveraging custom resources like Kafka, KafkaTopic, and KafkaUser, you can manage your entire Kafka infrastructure declaratively. Combined with proper monitoring, security configurations, and resource management, Strimzi enables enterprise-grade Kafka deployments on any Kubernetes platform.

For advanced use cases, explore Strimzi's support for MirrorMaker 2 for cross-cluster replication, Cruise Control for automated rebalancing, and integration with external authentication systems.
