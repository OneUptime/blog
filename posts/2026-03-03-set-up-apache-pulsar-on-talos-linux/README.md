# How to Set Up Apache Pulsar on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Apache Pulsar, Kubernetes, Messaging, Event Streaming, DevOps

Description: Deploy Apache Pulsar on Talos Linux with BookKeeper storage, multi-tenancy support, and geo-replication for enterprise messaging.

---

Apache Pulsar is a distributed messaging and streaming platform that separates serving from storage. Unlike Kafka where brokers handle both message serving and storage, Pulsar uses brokers for serving and Apache BookKeeper for durable storage. This separation makes Pulsar highly scalable and allows independent scaling of compute and storage. Running Pulsar on Talos Linux takes advantage of the immutable OS to provide a stable foundation for this multi-component system.

This guide walks through deploying Apache Pulsar on Talos Linux, covering all the components: ZooKeeper, BookKeeper, Pulsar brokers, and optional Pulsar Manager.

## Pulsar Architecture

Understanding the components helps plan the deployment:

- **ZooKeeper**: Stores metadata and configuration (being replaced by Pulsar's built-in metadata store in newer versions)
- **BookKeeper (Bookies)**: Provides persistent message storage with replication
- **Pulsar Brokers**: Stateless components that handle message routing between producers and consumers
- **Pulsar Proxy** (optional): Entry point for client connections, useful for load balancing

## Prerequisites

- Talos Linux cluster with at least six worker nodes (or three with more resources)
- `kubectl`, `talosctl`, and `helm` installed
- A fast StorageClass for BookKeeper
- At least 16GB total RAM across the cluster

## Step 1: Configure Talos Linux

```yaml
# talos-pulsar-patch.yaml
machine:
  sysctls:
    vm.max_map_count: "262144"
    net.core.somaxconn: "32768"
    net.ipv4.tcp_max_syn_backlog: "16384"
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/lib/pulsar-data
```

```bash
talosctl apply-config --nodes 10.0.0.2,10.0.0.3,10.0.0.4,10.0.0.5,10.0.0.6 \
  --file talos-pulsar-patch.yaml
```

## Step 2: Deploy Using the Pulsar Helm Chart

The official Pulsar Helm chart deploys all components together:

```bash
# Add the Apache Pulsar Helm repo
helm repo add apache https://pulsar.apache.org/charts
helm repo update

# Create namespace
kubectl create namespace pulsar
```

```yaml
# pulsar-values.yaml
# ZooKeeper configuration
zookeeper:
  replicaCount: 3
  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
  volumes:
    data:
      size: 10Gi
      storageClassName: local-path

# BookKeeper configuration
bookkeeper:
  replicaCount: 3
  resources:
    requests:
      memory: "2Gi"
      cpu: "500m"
    limits:
      memory: "2Gi"
  volumes:
    journal:
      size: 20Gi
      storageClassName: local-path
    ledgers:
      size: 50Gi
      storageClassName: local-path
  configData:
    BOOKIE_MEM: "-Xms1g -Xmx1g -XX:MaxDirectMemorySize=512m"
    journalDirectories: "/pulsar/data/bookkeeper/journal"
    ledgerDirectories: "/pulsar/data/bookkeeper/ledgers"

# Pulsar Broker configuration
broker:
  replicaCount: 3
  resources:
    requests:
      memory: "2Gi"
      cpu: "500m"
    limits:
      memory: "2Gi"
  configData:
    PULSAR_MEM: "-Xms1g -Xmx1g -XX:MaxDirectMemorySize=512m"
    managedLedgerDefaultEnsembleSize: "2"
    managedLedgerDefaultWriteQuorum: "2"
    managedLedgerDefaultAckQuorum: "2"
    defaultNumberOfNamespaceBundles: "8"

# Pulsar Proxy configuration
proxy:
  replicaCount: 2
  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
  service:
    type: ClusterIP

# Disable components we do not need initially
pulsar_manager:
  enabled: false
monitoring:
  prometheus: false
  grafana: false
```

```bash
# Install Pulsar
helm install pulsar apache/pulsar \
  --namespace pulsar \
  --values pulsar-values.yaml \
  --timeout 600s

# Watch the deployment (this takes several minutes)
kubectl get pods -n pulsar -w
```

## Step 3: Verify the Cluster

The components start in order: ZooKeeper first, then BookKeeper, then brokers.

```bash
# Check ZooKeeper
kubectl get pods -n pulsar -l component=zookeeper

# Check BookKeeper
kubectl get pods -n pulsar -l component=bookkeeper

# Check Brokers
kubectl get pods -n pulsar -l component=broker

# Verify broker health
kubectl exec -it pulsar-broker-0 -n pulsar -- \
  bin/pulsar-admin brokers list pulsar-cluster
```

## Step 4: Create Tenants, Namespaces, and Topics

Pulsar has a multi-tenant architecture:

```bash
# Create a tenant
kubectl exec -it pulsar-broker-0 -n pulsar -- \
  bin/pulsar-admin tenants create mycompany

# Create a namespace within the tenant
kubectl exec -it pulsar-broker-0 -n pulsar -- \
  bin/pulsar-admin namespaces create mycompany/events

# Set retention policy for the namespace
kubectl exec -it pulsar-broker-0 -n pulsar -- \
  bin/pulsar-admin namespaces set-retention mycompany/events \
  --size -1 --time 72h

# Create a partitioned topic
kubectl exec -it pulsar-broker-0 -n pulsar -- \
  bin/pulsar-admin topics create-partitioned-topic \
  persistent://mycompany/events/orders --partitions 6
```

## Step 5: Produce and Consume Messages

```bash
# Produce messages
kubectl exec -it pulsar-broker-0 -n pulsar -- \
  bin/pulsar-client produce persistent://mycompany/events/orders \
  --messages "order-1,order-2,order-3" \
  --num-produce 3

# Consume messages
kubectl exec -it pulsar-broker-0 -n pulsar -- \
  bin/pulsar-client consume persistent://mycompany/events/orders \
  --subscription-name test-sub \
  --num-messages 3
```

## Step 6: Manual Deployment Without Helm

For more control over each component:

```yaml
# pulsar-broker-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: pulsar-broker
  namespace: pulsar
spec:
  serviceName: pulsar-broker
  replicas: 3
  selector:
    matchLabels:
      app: pulsar-broker
  template:
    metadata:
      labels:
        app: pulsar-broker
    spec:
      containers:
        - name: pulsar
          image: apachepulsar/pulsar:3.2.0
          command:
            - bin/pulsar
            - broker
          ports:
            - containerPort: 6650
              name: pulsar
            - containerPort: 8080
              name: http
          env:
            - name: PULSAR_MEM
              value: "-Xms1g -Xmx1g"
            - name: zookeeperServers
              value: "pulsar-zookeeper-0.pulsar-zookeeper:2181,pulsar-zookeeper-1.pulsar-zookeeper:2181,pulsar-zookeeper-2.pulsar-zookeeper:2181"
            - name: configurationStoreServers
              value: "pulsar-zookeeper-0.pulsar-zookeeper:2181,pulsar-zookeeper-1.pulsar-zookeeper:2181,pulsar-zookeeper-2.pulsar-zookeeper:2181"
            - name: clusterName
              value: "talos-pulsar"
          resources:
            requests:
              memory: "2Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
          readinessProbe:
            httpGet:
              path: /status.html
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
```

## Pulsar Functions

Pulsar Functions provide lightweight stream processing:

```bash
# Deploy a simple function
kubectl exec -it pulsar-broker-0 -n pulsar -- \
  bin/pulsar-admin functions create \
  --function-name word-count \
  --tenant mycompany \
  --namespace events \
  --inputs persistent://mycompany/events/input \
  --output persistent://mycompany/events/output \
  --classname org.apache.pulsar.functions.api.examples.WordCountFunction \
  --jar /pulsar/examples/api-examples.jar

# Check function status
kubectl exec -it pulsar-broker-0 -n pulsar -- \
  bin/pulsar-admin functions status \
  --tenant mycompany --namespace events --name word-count
```

## Monitoring Pulsar

Enable Prometheus monitoring for all components:

```yaml
# Add to pulsar-values.yaml
monitoring:
  prometheus: true
  grafana: true
  alert_manager: false

grafana:
  service:
    type: ClusterIP
  admin:
    password: "grafana-admin-password"
```

Key metrics to watch include broker throughput rates, BookKeeper write and read latency, topic backlog size, and consumer acknowledgment rates.

## Conclusion

Apache Pulsar on Talos Linux gives you an enterprise-grade messaging platform on a secure, minimal OS. The separation of serving and storage means you can scale brokers and BookKeeper independently based on your workload patterns. The Helm chart handles the multi-component deployment complexity, while Talos Linux ensures every node runs consistently. For production use, make sure BookKeeper has fast storage (SSDs are essential), spread components across nodes with anti-affinity, and set appropriate retention policies to manage storage growth. Pulsar's multi-tenancy support makes it particularly useful when multiple teams share the same messaging infrastructure.
