# How to Configure Pulsar Geo-Replication for Multi-Region Message Delivery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Pulsar, Geo-Replication, Multi-Region

Description: Learn how to configure Apache Pulsar geo-replication for multi-region deployments with automatic failover, low-latency local reads, and globally consistent message delivery.

---

Apache Pulsar's built-in geo-replication enables seamless message replication across multiple data centers or cloud regions. Unlike traditional active-passive setups, Pulsar supports active-active multi-region deployments where producers and consumers in any region can read and write messages, with automatic replication maintaining consistency.

In this guide, you'll learn how to deploy multi-region Pulsar clusters, configure geo-replication policies, implement cross-region failover, and optimize for global message delivery patterns.

## Understanding Pulsar Geo-Replication

Pulsar geo-replication provides:

- **Active-active replication** - All clusters accept reads and writes
- **Asynchronous replication** - Messages replicate in background
- **Selective replication** - Choose which topics to replicate
- **Namespace-level policies** - Configure replication per namespace
- **Built-in conflict resolution** - Automatic handling of concurrent writes
- **Low-latency local access** - Consumers read from local cluster

Ideal for:
- Global applications requiring low latency
- Disaster recovery with active-active setup
- Data sovereignty compliance
- Multi-cloud deployments

## Deploying Multi-Region Pulsar Clusters

Deploy separate Pulsar clusters in each region:

```yaml
# Region: us-east
# pulsar-us-east-values.yaml
clusterName: pulsar-us-east
namespace: pulsar-us-east

persistence:
  enabled: true

zookeeper:
  replicaCount: 3

bookkeeper:
  replicaCount: 4
  volumes:
    journal:
      size: 50Gi
    ledgers:
      size: 200Gi

broker:
  replicaCount: 3
  configData:
    clusterName: pulsar-us-east
    # Allow replication
    replicationEnabled: true
```

Deploy in each region:

```bash
# Deploy in us-east cluster
kubectl create namespace pulsar-us-east
helm install pulsar-us-east apache/pulsar \
  --namespace pulsar-us-east \
  -f pulsar-us-east-values.yaml

# Deploy in eu-west cluster
kubectl create namespace pulsar-eu-west
helm install pulsar-eu-west apache/pulsar \
  --namespace pulsar-eu-west \
  -f pulsar-eu-west-values.yaml

# Deploy in ap-south cluster
kubectl create namespace pulsar-ap-south
helm install pulsar-ap-south apache/pulsar \
  --namespace pulsar-ap-south \
  -f pulsar-ap-south-values.yaml
```

## Configuring Cluster Metadata

Configure each cluster with metadata about all clusters:

```bash
# Get service endpoints
US_EAST_BROKER=$(kubectl get svc -n pulsar-us-east pulsar-us-east-broker -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
EU_WEST_BROKER=$(kubectl get svc -n pulsar-eu-west pulsar-eu-west-broker -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
AP_SOUTH_BROKER=$(kubectl get svc -n pulsar-ap-south pulsar-ap-south-broker -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Create cluster metadata in each cluster
# In us-east
pulsar-admin --admin-url http://${US_EAST_BROKER}:8080 \
  clusters create pulsar-us-east \
  --url pulsar://${US_EAST_BROKER}:6650 \
  --broker-url http://${US_EAST_BROKER}:8080

pulsar-admin --admin-url http://${US_EAST_BROKER}:8080 \
  clusters create pulsar-eu-west \
  --url pulsar://${EU_WEST_BROKER}:6650 \
  --broker-url http://${EU_WEST_BROKER}:8080

pulsar-admin --admin-url http://${US_EAST_BROKER}:8080 \
  clusters create pulsar-ap-south \
  --url pulsar://${AP_SOUTH_BROKER}:6650 \
  --broker-url http://${AP_SOUTH_BROKER}:8080
```

Repeat for each cluster, or use a script:

```bash
#!/bin/bash

CLUSTERS=("pulsar-us-east" "pulsar-eu-west" "pulsar-ap-south")
BROKERS=("${US_EAST_BROKER}" "${EU_WEST_BROKER}" "${AP_SOUTH_BROKER}")

for i in "${!CLUSTERS[@]}"; do
  ADMIN_URL="http://${BROKERS[$i]}:8080"

  for j in "${!CLUSTERS[@]}"; do
    pulsar-admin --admin-url ${ADMIN_URL} clusters create ${CLUSTERS[$j]} \
      --url pulsar://${BROKERS[$j]}:6650 \
      --broker-url http://${BROKERS[$j]}:8080
  done
done
```

## Creating Replicated Namespaces

Create namespace with replication policy:

```bash
# Create tenant
pulsar-admin --admin-url http://${US_EAST_BROKER}:8080 \
  tenants create global-tenant \
  --allowed-clusters pulsar-us-east,pulsar-eu-west,pulsar-ap-south

# Create namespace with replication
pulsar-admin --admin-url http://${US_EAST_BROKER}:8080 \
  namespaces create global-tenant/replicated-ns

# Set replication clusters
pulsar-admin --admin-url http://${US_EAST_BROKER}:8080 \
  namespaces set-clusters global-tenant/replicated-ns \
  --clusters pulsar-us-east,pulsar-eu-west,pulsar-ap-south
```

Verify replication configuration:

```bash
pulsar-admin --admin-url http://${US_EAST_BROKER}:8080 \
  namespaces get-clusters global-tenant/replicated-ns
```

## Publishing to Replicated Topics

Produce messages in any region:

```python
import pulsar

# Connect to local cluster (us-east)
client = pulsar.Client('pulsar://us-east-broker:6650')

producer = client.create_producer(
    'persistent://global-tenant/replicated-ns/orders'
)

# Message automatically replicates to all regions
producer.send(b'Order from US East')

client.close()
```

Messages are automatically replicated to all configured clusters.

## Consuming from Local Cluster

Consumers read from their local cluster:

```python
import pulsar

# Consumer in EU West reads locally replicated messages
client = pulsar.Client('pulsar://eu-west-broker:6650')

consumer = client.subscribe(
    'persistent://global-tenant/replicated-ns/orders',
    subscription_name='order-processor'
)

while True:
    msg = consumer.receive()
    print(f"Received in EU West: {msg.data()}")
    consumer.acknowledge(msg)
```

This provides low-latency local reads while maintaining global consistency.

## Implementing Selective Replication

Replicate only specific topics:

```bash
# Create non-replicated namespace
pulsar-admin namespaces create global-tenant/local-ns

# Set replication for specific topic only
pulsar-admin topics set-replication-clusters \
  persistent://global-tenant/local-ns/global-events \
  --clusters pulsar-us-east,pulsar-eu-west,pulsar-ap-south
```

## Configuring Replication Lag Monitoring

Monitor replication lag:

```bash
# Check replication stats
pulsar-admin topics stats-internal \
  persistent://global-tenant/replicated-ns/orders

# Get replication backlog
pulsar-admin topics stats \
  persistent://global-tenant/replicated-ns/orders | grep replication
```

Create Prometheus alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pulsar-replication-alerts
  namespace: monitoring
spec:
  groups:
  - name: pulsar-geo-replication
    rules:
    - alert: PulsarReplicationLag
      expr: |
        pulsar_replication_backlog > 10000
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Pulsar replication lag high"
        description: "Replication backlog is {{ $value }} messages"

    - alert: PulsarReplicationDelayed
      expr: |
        pulsar_replication_delay_seconds > 60
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Pulsar replication delayed"
```

## Implementing Failover Strategy

Configure client failover across regions:

```python
import pulsar

# Multiple service URLs for failover
client = pulsar.Client(
    service_url='pulsar://us-east-broker:6650',
    service_urls=[
        'pulsar://us-east-broker:6650',
        'pulsar://eu-west-broker:6650',
        'pulsar://ap-south-broker:6650'
    ],
    connection_timeout_ms=5000
)
```

Application-level failover:

```python
REGIONS = [
    'pulsar://us-east-broker:6650',
    'pulsar://eu-west-broker:6650',
    'pulsar://ap-south-broker:6650'
]

def get_pulsar_client():
    for region in REGIONS:
        try:
            client = pulsar.Client(region, connection_timeout_ms=3000)
            return client
        except Exception as e:
            print(f"Failed to connect to {region}: {e}")
            continue

    raise Exception("All regions unavailable")
```

## Implementing Disaster Recovery

Full namespace backup and restore:

```bash
# Backup namespace policies
pulsar-admin namespaces get-replication-clusters global-tenant/replicated-ns > namespace-config.json

# In disaster recovery scenario, restore in new region
pulsar-admin tenants create global-tenant \
  --allowed-clusters pulsar-recovery

pulsar-admin namespaces create global-tenant/replicated-ns

pulsar-admin namespaces set-clusters global-tenant/replicated-ns \
  --clusters pulsar-recovery,pulsar-us-east,pulsar-eu-west
```

## Optimizing Cross-Region Performance

Configure message batching for efficiency:

```python
producer = client.create_producer(
    'persistent://global-tenant/replicated-ns/orders',
    batching_enabled=True,
    batching_max_messages=1000,
    batching_max_publish_delay_ms=100,
    compression_type=pulsar.CompressionType.LZ4
)
```

Use async send for high throughput:

```python
def send_callback(res, msg_id):
    print(f"Message published: {msg_id}")

producer.send_async(
    b'Order data',
    callback=send_callback
)
```

## Handling Replication Conflicts

Pulsar automatically handles conflicts using message ordering. Configure deduplication:

```bash
# Enable deduplication
pulsar-admin namespaces set-deduplication \
  global-tenant/replicated-ns \
  --enable
```

Producer-side deduplication:

```python
producer = client.create_producer(
    'persistent://global-tenant/replicated-ns/orders',
    producer_name='order-producer-us-east'
)

# Messages with same sequence ID are deduplicated
producer.send(
    b'Order data',
    sequence_id=12345
)
```

## Monitoring Multi-Region Health

Check cluster connectivity:

```bash
# Test connectivity from one cluster to others
pulsar-admin brokers list pulsar-us-east
pulsar-admin brokers list pulsar-eu-west
pulsar-admin brokers list pulsar-ap-south

# Check replication status
pulsar-admin topics stats \
  persistent://global-tenant/replicated-ns/orders
```

Dashboard metrics to monitor:
- Replication backlog per cluster
- Replication throughput
- Cross-region latency
- Failed replication attempts

## Best Practices

Follow these practices:

1. **Use async replication** - Don't block on replication completion
2. **Monitor replication lag** - Alert on growing backlogs
3. **Test failover regularly** - Verify cross-region connectivity
4. **Use compression** - Reduce cross-region bandwidth
5. **Implement client failover** - Multiple service URLs
6. **Document region topology** - Clear documentation of cluster relationships
7. **Plan for split-brain** - Design applications to handle temporary inconsistency

## Conclusion

Apache Pulsar's geo-replication enables truly global, active-active messaging systems with low-latency local access and automatic replication. By deploying multi-region clusters, configuring appropriate replication policies, and implementing robust failover strategies, you build resilient systems that span geographic boundaries.

The combination of BookKeeper's durable storage, Pulsar's replication capabilities, and Kubernetes deployment patterns provides a powerful foundation for global applications requiring both low latency and high availability across regions.
