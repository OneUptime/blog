# How to Deploy Apache Pulsar with BookKeeper and Functions on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Pulsar, BookKeeper, Serverless

Description: Learn how to deploy Apache Pulsar with BookKeeper storage and Pulsar Functions for serverless stream processing on Kubernetes with scalability and high availability.

---

Apache Pulsar is a cloud-native distributed messaging and streaming platform that separates compute from storage using Apache BookKeeper. This architecture enables independent scaling of message serving and storage layers. Pulsar Functions add serverless stream processing capabilities, allowing you to process messages without managing separate compute infrastructure.

In this guide, you'll learn how to deploy Pulsar with BookKeeper on Kubernetes, configure storage tiers, implement Pulsar Functions for stream processing, and build scalable event-driven applications.

## Understanding Pulsar Architecture

Pulsar consists of:

- **Brokers** - Stateless serving layer for producers and consumers
- **BookKeeper** - Distributed log storage (bookies)
- **ZooKeeper** - Metadata and coordination
- **Pulsar Functions** - Lightweight serverless compute for stream processing
- **Pulsar Proxy** - Optional load balancer and protocol gateway

This separation allows:
- Independent scaling of compute and storage
- Fast broker recovery without data movement
- Infinite retention with tiered storage
- Multi-tenancy with namespace isolation

## Deploying Pulsar with Helm

Install Pulsar using the official Helm chart:

```bash
helm repo add apache https://pulsar.apache.org/charts
helm repo update

# Create namespace
kubectl create namespace pulsar

# Install with BookKeeper
helm install pulsar apache/pulsar \
  --namespace pulsar \
  --set initialize=true \
  --set components.zookeeper=true \
  --set components.bookkeeper=true \
  --set components.broker=true \
  --set components.proxy=true \
  --set components.functions=true \
  --set zookeeper.replicaCount=3 \
  --set bookkeeper.replicaCount=3 \
  --set broker.replicaCount=3
```

Custom values file for production:

```yaml
# pulsar-values.yaml
persistence:
  enabled: true
  storageClass: fast-ssd

zookeeper:
  replicaCount: 3
  resources:
    requests:
      cpu: 500m
      memory: 1Gi

bookkeeper:
  replicaCount: 4
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
  volumes:
    journal:
      size: 20Gi
    ledgers:
      size: 100Gi

broker:
  replicaCount: 3
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
  configData:
    managedLedgerDefaultEnsembleSize: "3"
    managedLedgerDefaultWriteQuorum: "2"
    managedLedgerDefaultAckQuorum: "2"

functions:
  enabled: true
  replicaCount: 2
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
```

Deploy with custom values:

```bash
helm install pulsar apache/pulsar \
  --namespace pulsar \
  -f pulsar-values.yaml
```

## Configuring BookKeeper Storage

BookKeeper stores messages in ledgers across bookies. Configure storage:

```yaml
bookkeeper:
  configData:
    # Journal storage for write-ahead log
    journalDirectories: /pulsar/data/bookkeeper/journal
    # Ledger storage for message data
    ledgerDirectories: /pulsar/data/bookkeeper/ledgers
    # Number of journal files to pre-allocate
    journalPreAllocSizeMB: 16
    # Bookie garbage collection interval
    gcWaitTime: 900000
    # Enable statistics
    enableStatistics: true
    # Ensemble size for ledgers
    ensembleSize: 3
    # Write quorum size
    writeQuorumSize: 2
    # Ack quorum size
    ackQuorumSize: 2
```

## Creating Topics and Producing Messages

Use Pulsar admin to create topics:

```bash
# Port-forward to broker
kubectl port-forward -n pulsar svc/pulsar-broker 6650:6650 8080:8080 &

# Install pulsar-client
pip install pulsar-client

# Create topic
pulsar-admin topics create persistent://public/default/orders

# View topic info
pulsar-admin topics stats persistent://public/default/orders
```

Python producer:

```python
import pulsar
import json

client = pulsar.Client('pulsar://localhost:6650')

producer = client.create_producer(
    'persistent://public/default/orders',
    compression_type=pulsar.CompressionType.LZ4
)

# Publish messages
for i in range(100):
    order = {
        'order_id': i,
        'amount': 99.99,
        'status': 'pending'
    }

    producer.send(
        json.dumps(order).encode('utf-8'),
        properties={'order_id': str(i)}
    )

print("Published 100 messages")
client.close()
```

Go producer:

```go
package main

import (
    "context"
    "fmt"
    "github.com/apache/pulsar-client-go/pulsar"
)

func main() {
    client, err := pulsar.NewClient(pulsar.ClientOptions{
        URL: "pulsar://localhost:6650",
    })
    if err != nil {
        panic(err)
    }
    defer client.Close()

    producer, err := client.CreateProducer(pulsar.ProducerOptions{
        Topic: "persistent://public/default/orders",
    })
    if err != nil {
        panic(err)
    }
    defer producer.Close()

    for i := 0; i < 100; i++ {
        _, err = producer.Send(context.Background(), &pulsar.ProducerMessage{
            Payload: []byte(fmt.Sprintf(`{"order_id": %d}`, i)),
        })
        if err != nil {
            panic(err)
        }
    }

    fmt.Println("Published 100 messages")
}
```

## Consuming Messages

Python consumer:

```python
import pulsar

client = pulsar.Client('pulsar://localhost:6650')

consumer = client.subscribe(
    'persistent://public/default/orders',
    subscription_name='order-processor',
    consumer_type=pulsar.ConsumerType.Shared
)

while True:
    msg = consumer.receive()
    try:
        print(f"Received: {msg.data().decode('utf-8')}")
        consumer.acknowledge(msg)
    except Exception as e:
        print(f"Error: {e}")
        consumer.negative_acknowledge(msg)

client.close()
```

## Deploying Pulsar Functions

Pulsar Functions process messages with serverless compute. Create a function:

```python
# word_count_function.py
from pulsar import Function

class WordCount(Function):
    def process(self, input, context):
        words = input.split()
        for word in words:
            context.publish(
                'persistent://public/default/word-counts',
                f"{word}:1".encode('utf-8')
            )
```

Package and deploy:

```bash
# Create function package
zip word_count.zip word_count_function.py

# Deploy function
pulsar-admin functions create \
  --tenant public \
  --namespace default \
  --name word-count \
  --py word_count.zip \
  --classname word_count_function.WordCount \
  --inputs persistent://public/default/text-input \
  --output persistent://public/default/word-counts
```

Using YAML configuration:

```yaml
# word-count-function.yaml
tenant: public
namespace: default
name: word-count
className: word_count_function.WordCount
inputs:
  - persistent://public/default/text-input
output: persistent://public/default/word-counts
runtime: python
py: word_count.zip
parallelism: 2
resources:
  cpu: 0.5
  ram: 512M
```

Deploy with YAML:

```bash
pulsar-admin functions create --function-config-file word-count-function.yaml
```

## Creating Stateful Functions

Functions with state using BookKeeper:

```python
from pulsar import Function

class RunningSum(Function):
    def __init__(self):
        pass

    def process(self, input, context):
        # Get state
        current_sum = context.get_state('sum')
        if current_sum is None:
            current_sum = 0

        # Update state
        value = int(input)
        new_sum = current_sum + value
        context.put_state('sum', new_sum)

        # Publish result
        return f"Running sum: {new_sum}".encode('utf-8')
```

Deploy stateful function:

```bash
pulsar-admin functions create \
  --tenant public \
  --namespace default \
  --name running-sum \
  --py running_sum.zip \
  --classname running_sum.RunningSum \
  --inputs persistent://public/default/numbers \
  --output persistent://public/default/sums \
  --processing-guarantees EFFECTIVELY_ONCE
```

## Implementing Stream Processing Pipeline

Chain multiple functions:

```python
# Function 1: Parse JSON
class ParseJSON(Function):
    def process(self, input, context):
        import json
        data = json.loads(input)
        return json.dumps(data).encode('utf-8')

# Function 2: Filter
class FilterOrders(Function):
    def process(self, input, context):
        import json
        order = json.loads(input)

        if order['amount'] > 100:
            return input
        return None

# Function 3: Enrich
class EnrichOrder(Function):
    def process(self, input, context):
        import json
        order = json.loads(input)

        # Add enrichment
        order['processed_at'] = context.get_message_id()
        order['partition'] = context.get_partition_id()

        return json.dumps(order).encode('utf-8')
```

Deploy pipeline:

```bash
# Parse
pulsar-admin functions create \
  --name parse-json \
  --inputs persistent://public/default/raw-orders \
  --output persistent://public/default/parsed-orders \
  --py parse.zip

# Filter
pulsar-admin functions create \
  --name filter-orders \
  --inputs persistent://public/default/parsed-orders \
  --output persistent://public/default/filtered-orders \
  --py filter.zip

# Enrich
pulsar-admin functions create \
  --name enrich-order \
  --inputs persistent://public/default/filtered-orders \
  --output persistent://public/default/enriched-orders \
  --py enrich.zip
```

## Monitoring Pulsar and Functions

Check function status:

```bash
# List functions
pulsar-admin functions list --tenant public --namespace default

# Get function stats
pulsar-admin functions stats --tenant public --namespace default --name word-count

# Get function status
pulsar-admin functions status --tenant public --namespace default --name word-count
```

Deploy Pulsar monitoring:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: pulsar-prometheus
  namespace: pulsar
spec:
  selector:
    component: prometheus
  ports:
  - port: 9090
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pulsar-prometheus
  namespace: pulsar
spec:
  replicas: 1
  selector:
    matchLabels:
      component: prometheus
  template:
    metadata:
      labels:
        component: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        args:
        - --config.file=/etc/prometheus/prometheus.yml
        ports:
        - containerPort: 9090
```

## Best Practices

Follow these practices:

1. **Scale bookies independently** - Add bookies for more storage capacity
2. **Use appropriate ensemble sizes** - Balance durability and performance
3. **Monitor bookie disk usage** - Alert before storage fills
4. **Implement function error handling** - Use dead-letter topics
5. **Set processing guarantees** - Choose at-most-once, at-least-once, or effectively-once
6. **Test function logic locally** - Use Pulsar local runner
7. **Monitor function lag** - Ensure functions keep up with input

## Conclusion

Apache Pulsar's architecture with BookKeeper provides scalable, durable messaging with serverless stream processing through Pulsar Functions. By separating compute and storage, deploying multi-tier architectures, and leveraging functions for processing, you build flexible event-driven systems on Kubernetes.

The combination of guaranteed message delivery, infinite retention capabilities, and lightweight function processing makes Pulsar an excellent choice for high-throughput, low-latency messaging workloads requiring both durability and real-time processing.
