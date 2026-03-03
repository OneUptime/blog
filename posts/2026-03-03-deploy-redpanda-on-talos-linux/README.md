# How to Deploy Redpanda on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Redpanda, Kubernetes, Event Streaming, Kafka Alternative, DevOps

Description: Deploy Redpanda streaming data platform on Talos Linux as a Kafka-compatible alternative with lower latency and simpler operations.

---

Redpanda is a Kafka-compatible streaming data platform written in C++ that does not require ZooKeeper or a JVM. It delivers lower latency, higher throughput per node, and simpler operations compared to Apache Kafka. Since Redpanda uses the Kafka API, your existing Kafka clients and tooling work without modification. Running Redpanda on Talos Linux pairs a high-performance streaming platform with a minimal, secure OS.

This guide covers deploying Redpanda on Talos Linux using both the Redpanda Operator and manual approaches.

## Why Redpanda Over Kafka

Redpanda addresses several pain points with Kafka:

- No JVM means no garbage collection pauses and more predictable latency
- No ZooKeeper simplifies the architecture significantly
- Thread-per-core architecture maximizes hardware utilization
- Built-in Schema Registry and HTTP Proxy
- Compatible with the Kafka API, so migration is straightforward

On Talos Linux, Redpanda's single-binary design fits the minimal OS philosophy well.

## Prerequisites

- Talos Linux cluster with at least three worker nodes
- Worker nodes with 4GB+ RAM and SSD storage
- `kubectl`, `talosctl`, and `helm` installed
- A fast StorageClass

## Step 1: Configure Talos Linux for Redpanda

Redpanda needs specific system settings for optimal performance:

```yaml
# talos-redpanda-patch.yaml
machine:
  sysctls:
    # Redpanda performance tuning
    vm.max_map_count: "262144"
    net.core.rmem_max: "16777216"
    net.core.wmem_max: "16777216"
    net.core.somaxconn: "65535"
    net.ipv4.tcp_max_syn_backlog: "65535"
    vm.swappiness: "0"
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/lib/redpanda
```

```bash
talosctl apply-config --nodes 10.0.0.2,10.0.0.3,10.0.0.4 \
  --file talos-redpanda-patch.yaml
```

## Step 2: Install the Redpanda Operator

```bash
# Add the Redpanda Helm repo
helm repo add redpanda https://charts.redpanda.com
helm repo update

# Install the Redpanda operator
kubectl create namespace redpanda
helm install redpanda-operator redpanda/operator \
  --namespace redpanda
```

## Step 3: Deploy a Redpanda Cluster

```yaml
# redpanda-cluster.yaml
apiVersion: cluster.redpanda.com/v1alpha1
kind: Redpanda
metadata:
  name: redpanda-prod
  namespace: redpanda
spec:
  chartRef: {}
  clusterSpec:
    statefulset:
      replicas: 3
      budget:
        maxUnavailable: 1
    resources:
      cpu:
        cores: 2
      memory:
        container:
          max: "4Gi"
        redpanda:
          memory: "3Gi"
          reserveMemory: "1Gi"
    storage:
      persistentVolume:
        enabled: true
        size: 100Gi
        storageClass: local-path
    auth:
      sasl:
        enabled: true
        secretRef: redpanda-users
    tls:
      enabled: true
    listeners:
      kafka:
        port: 9092
        tls:
          enabled: true
      admin:
        port: 9644
        tls:
          enabled: true
      schemaRegistry:
        port: 8081
        tls:
          enabled: true
      http:
        port: 8082
        tls:
          enabled: true
    tuning:
      tune_aio_events: true
      tune_clocksource: true
      tune_ballast_file: true
      ballast_file_size: "1GiB"
```

```yaml
# redpanda-users.yaml
apiVersion: v1
kind: Secret
metadata:
  name: redpanda-users
  namespace: redpanda
type: Opaque
stringData:
  users.txt: |
    admin:admin-password:SCRAM-SHA-256
    producer:producer-password:SCRAM-SHA-256
    consumer:consumer-password:SCRAM-SHA-256
```

```bash
kubectl apply -f redpanda-users.yaml
kubectl apply -f redpanda-cluster.yaml

# Watch the deployment
kubectl get pods -n redpanda -w
```

## Step 4: Deploy Using Helm Directly

If you prefer Helm over the operator:

```yaml
# redpanda-helm-values.yaml
statefulset:
  replicas: 3

resources:
  cpu:
    cores: 2
  memory:
    container:
      max: "4Gi"

storage:
  persistentVolume:
    enabled: true
    size: 100Gi
    storageClass: local-path

auth:
  sasl:
    enabled: true
    secretRef: redpanda-users

listeners:
  kafka:
    port: 9092
  admin:
    port: 9644
  schemaRegistry:
    port: 8081
  http:
    port: 8082

monitoring:
  enabled: true

console:
  enabled: true
```

```bash
helm install redpanda redpanda/redpanda \
  --namespace redpanda \
  --values redpanda-helm-values.yaml
```

## Step 5: Verify the Cluster

```bash
# Check cluster status using rpk (Redpanda's CLI)
kubectl exec -it redpanda-prod-0 -n redpanda -- \
  rpk cluster info

# Check broker status
kubectl exec -it redpanda-prod-0 -n redpanda -- \
  rpk cluster health

# View cluster configuration
kubectl exec -it redpanda-prod-0 -n redpanda -- \
  rpk cluster config get
```

## Step 6: Create Topics and Test

```bash
# Create a topic
kubectl exec -it redpanda-prod-0 -n redpanda -- \
  rpk topic create orders \
  --partitions 6 --replicas 3

# List topics
kubectl exec -it redpanda-prod-0 -n redpanda -- \
  rpk topic list

# Produce messages
kubectl exec -it redpanda-prod-0 -n redpanda -- \
  rpk topic produce orders

# Type messages and press Enter to send, Ctrl+C to stop

# Consume messages
kubectl exec -it redpanda-prod-0 -n redpanda -- \
  rpk topic consume orders --offset start
```

## Step 7: Use the Schema Registry

Redpanda includes a built-in Schema Registry compatible with the Confluent Schema Registry API:

```bash
# Register an Avro schema
kubectl exec -it redpanda-prod-0 -n redpanda -- \
  curl -X POST http://localhost:8081/subjects/orders-value/versions \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{
    "schema": "{\"type\":\"record\",\"name\":\"Order\",\"fields\":[{\"name\":\"id\",\"type\":\"string\"},{\"name\":\"product\",\"type\":\"string\"},{\"name\":\"quantity\",\"type\":\"int\"},{\"name\":\"total\",\"type\":\"float\"}]}"
  }'

# List registered schemas
kubectl exec -it redpanda-prod-0 -n redpanda -- \
  curl http://localhost:8081/subjects
```

## Step 8: Use Kafka Clients with Redpanda

Since Redpanda speaks the Kafka protocol, existing Kafka clients work directly:

```yaml
# kafka-client-test.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kafka-client
  namespace: redpanda
spec:
  containers:
    - name: kafka-client
      image: confluentinc/cp-kafka:latest
      command: ["sleep", "infinity"]
```

```bash
kubectl apply -f kafka-client-test.yaml

# Use Kafka CLI tools against Redpanda
kubectl exec -it kafka-client -n redpanda -- \
  kafka-console-producer --broker-list redpanda-prod-0.redpanda-prod:9092 \
  --topic orders

kubectl exec -it kafka-client -n redpanda -- \
  kafka-console-consumer --bootstrap-server redpanda-prod-0.redpanda-prod:9092 \
  --topic orders --from-beginning --group test-group
```

## Redpanda Console

Redpanda Console provides a web UI for managing topics, consumer groups, and schemas:

```yaml
# redpanda-console.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redpanda-console
  namespace: redpanda
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redpanda-console
  template:
    metadata:
      labels:
        app: redpanda-console
    spec:
      containers:
        - name: console
          image: redpandadata/console:latest
          ports:
            - containerPort: 8080
          env:
            - name: KAFKA_BROKERS
              value: "redpanda-prod-0.redpanda-prod:9092,redpanda-prod-1.redpanda-prod:9092,redpanda-prod-2.redpanda-prod:9092"
            - name: KAFKA_SCHEMAREGISTRY_ENABLED
              value: "true"
            - name: KAFKA_SCHEMAREGISTRY_URLS
              value: "http://redpanda-prod-0.redpanda-prod:8081"
---
apiVersion: v1
kind: Service
metadata:
  name: redpanda-console
  namespace: redpanda
spec:
  selector:
    app: redpanda-console
  ports:
    - port: 8080
      targetPort: 8080
```

```bash
kubectl apply -f redpanda-console.yaml
kubectl port-forward svc/redpanda-console -n redpanda 8080:8080
```

## Monitoring Redpanda

Redpanda exposes Prometheus metrics on its admin port:

```bash
# View metrics
kubectl exec -it redpanda-prod-0 -n redpanda -- \
  curl http://localhost:9644/public_metrics
```

Key metrics to track include `redpanda_kafka_request_latency_seconds`, `redpanda_storage_disk_used_bytes`, `redpanda_kafka_under_replicated_replicas`, and `redpanda_kafka_consumer_group_lag`.

## Conclusion

Redpanda on Talos Linux is a compelling choice for event streaming. Its Kafka compatibility means zero application changes during migration, while the simpler architecture (no JVM, no ZooKeeper) reduces operational burden. The built-in Schema Registry and HTTP Proxy eliminate the need for separate services that Kafka requires. Combined with Talos Linux's secure, immutable OS, you get a streaming platform that is both high-performance and easy to manage. If you are starting a new streaming project or considering a Kafka alternative, Redpanda on Talos Linux deserves serious consideration.
