# How to Configure Apache Kafka on Azure HDInsight for Event Streaming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Azure HDInsight, Event Streaming, Message Broker, Distributed Systems, Azure Cloud, Data Pipeline

Description: A hands-on guide to setting up and configuring Apache Kafka on Azure HDInsight for building reliable event streaming pipelines.

---

Apache Kafka is the backbone of event-driven architectures across the industry. When you need to move high-volume data between systems in real time - clickstreams, logs, IoT telemetry, financial transactions - Kafka is usually the answer. Azure HDInsight lets you run a fully managed Kafka cluster without dealing with the operational overhead of ZooKeeper management, broker provisioning, and OS-level maintenance.

This post walks you through creating a Kafka cluster on HDInsight, configuring topics and partitions, producing and consuming messages, and tuning the cluster for production workloads.

## Creating a Kafka Cluster on HDInsight

The first step is provisioning the cluster. Kafka on HDInsight uses managed disks for broker storage, which gives you predictable throughput and simplifies capacity planning.

```bash
# Create an HDInsight Kafka cluster
# Uses 4 worker nodes with managed disks for broker storage
az hdinsight create \
  --name my-kafka-cluster \
  --resource-group my-resource-group \
  --type Kafka \
  --component-version Kafka=2.4 \
  --http-user admin \
  --http-password "YourStr0ngP@ssword!" \
  --ssh-user sshuser \
  --ssh-password "YourSSHP@ssword!" \
  --workernode-count 4 \
  --workernode-size Standard_D13_V2 \
  --workernode-data-disks-per-node 2 \
  --workernode-data-disk-size 1024 \
  --storage-account mystorageaccount \
  --storage-account-key "your-storage-key" \
  --storage-default-container kafka-data \
  --location eastus
```

A few important notes on the configuration:

- **Worker nodes are Kafka brokers**: Each worker node runs a Kafka broker process. Four worker nodes means four brokers.
- **Managed disks**: The `--workernode-data-disks-per-node` and `--workernode-data-disk-size` parameters control the storage available to each broker. Two 1TB disks per broker gives you 2TB of log storage per broker.
- **No public IP for brokers**: By default, Kafka brokers are only accessible within the cluster's virtual network. You need to configure networking to access them from outside.

## Network Configuration

Unlike some HDInsight cluster types, Kafka brokers expose their internal IP addresses to clients. To connect from applications outside the cluster, you need to either:

1. Deploy your client applications in the same Virtual Network
2. Set up VPN or ExpressRoute connectivity
3. Configure Kafka to advertise public IP addresses (not recommended for production)

For the VNet approach, first create a VNet and then deploy the cluster into it:

```bash
# Create a VNet for the Kafka cluster
az network vnet create \
  --resource-group my-resource-group \
  --name kafka-vnet \
  --address-prefix 10.0.0.0/16 \
  --subnet-name default \
  --subnet-prefix 10.0.0.0/24

# Create the Kafka cluster inside the VNet
az hdinsight create \
  --name my-kafka-cluster \
  --resource-group my-resource-group \
  --type Kafka \
  --component-version Kafka=2.4 \
  --http-user admin \
  --http-password "YourStr0ngP@ssword!" \
  --ssh-user sshuser \
  --ssh-password "YourSSHP@ssword!" \
  --workernode-count 4 \
  --workernode-data-disks-per-node 2 \
  --workernode-data-disk-size 1024 \
  --storage-account mystorageaccount \
  --storage-account-key "your-key" \
  --storage-default-container kafka-data \
  --vnet-name kafka-vnet \
  --subnet default \
  --location eastus
```

## Getting Broker Addresses

After the cluster is provisioned, you need the broker addresses to configure your clients. SSH into the cluster and retrieve them:

```bash
# SSH into the cluster
ssh sshuser@my-kafka-cluster-ssh.azurehdinsight.net

# Get the Kafka broker hosts using the Ambari REST API
# This returns the internal FQDN and port for each broker
curl -u admin:"YourStr0ngP@ssword!" -sS \
  "https://my-kafka-cluster.azurehdinsight.net/api/v1/clusters/my-kafka-cluster/services/KAFKA/components/KAFKA_BROKER" \
  | python -c "import sys,json; print(','.join([h['Hosts']['host_name']+':9092' for h in json.load(sys.stdin)['host_components']]))"
```

This gives you a comma-separated list of broker addresses like:
```
wn0-mykafk.internal.cloudapp.net:9092,wn1-mykafk.internal.cloudapp.net:9092,...
```

Store these addresses in an environment variable for convenience:

```bash
# Set the broker list as an environment variable
export KAFKABROKERS="wn0-mykafk.internal.cloudapp.net:9092,wn1-mykafk.internal.cloudapp.net:9092,wn2-mykafk.internal.cloudapp.net:9092,wn3-mykafk.internal.cloudapp.net:9092"
```

## Creating and Managing Topics

With broker addresses in hand, you can create topics using the Kafka command-line tools that come pre-installed on the cluster:

```bash
# Create a topic with 8 partitions and replication factor of 3
# 8 partitions allows up to 8 consumers to read in parallel
# Replication factor of 3 means data is stored on 3 different brokers
/usr/hdp/current/kafka-broker/bin/kafka-topics.sh \
  --create \
  --bootstrap-server $KAFKABROKERS \
  --topic user-events \
  --partitions 8 \
  --replication-factor 3
```

List existing topics:

```bash
# List all topics in the cluster
/usr/hdp/current/kafka-broker/bin/kafka-topics.sh \
  --list \
  --bootstrap-server $KAFKABROKERS
```

Describe a topic to see its partition layout and replica assignments:

```bash
# Show detailed information about a topic
/usr/hdp/current/kafka-broker/bin/kafka-topics.sh \
  --describe \
  --bootstrap-server $KAFKABROKERS \
  --topic user-events
```

## Producing and Consuming Messages

Let us verify the setup by sending and receiving messages.

### Console Producer

```bash
# Start a console producer that sends messages to the user-events topic
# Type messages line by line, each line becomes a separate message
/usr/hdp/current/kafka-broker/bin/kafka-console-producer.sh \
  --broker-list $KAFKABROKERS \
  --topic user-events
```

### Console Consumer

Open a second SSH session and start a consumer:

```bash
# Start a console consumer that reads messages from the beginning
/usr/hdp/current/kafka-broker/bin/kafka-console-consumer.sh \
  --bootstrap-server $KAFKABROKERS \
  --topic user-events \
  --from-beginning
```

### Programmatic Producer (Python)

For application integration, here is a Python producer example using the kafka-python library:

```python
from kafka import KafkaProducer
import json
import time

# Create a Kafka producer with JSON serialization
# The bootstrap_servers should list your broker addresses
producer = KafkaProducer(
    bootstrap_servers=['wn0-mykafk.internal.cloudapp.net:9092',
                       'wn1-mykafk.internal.cloudapp.net:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    acks='all',  # Wait for all replicas to acknowledge
    retries=3    # Retry up to 3 times on failure
)

# Send 100 sample events
for i in range(100):
    event = {
        'user_id': f'user-{i % 10}',
        'action': 'page_view',
        'page': f'/products/{i}',
        'timestamp': int(time.time() * 1000)
    }
    # Use user_id as the key for consistent partition assignment
    producer.send(
        'user-events',
        key=event['user_id'].encode('utf-8'),
        value=event
    )

# Flush to ensure all messages are sent
producer.flush()
producer.close()
print("Sent 100 events successfully")
```

## Configuring Retention and Compaction

Kafka topics have configurable retention policies that control how long messages are stored.

```bash
# Set retention to 7 days (in milliseconds)
/usr/hdp/current/kafka-broker/bin/kafka-configs.sh \
  --bootstrap-server $KAFKABROKERS \
  --alter \
  --entity-type topics \
  --entity-name user-events \
  --add-config retention.ms=604800000

# For log-compacted topics (keep latest value per key)
# Useful for maintaining current state, like user profiles
/usr/hdp/current/kafka-broker/bin/kafka-topics.sh \
  --create \
  --bootstrap-server $KAFKABROKERS \
  --topic user-profiles \
  --partitions 8 \
  --replication-factor 3 \
  --config cleanup.policy=compact
```

## Performance Tuning

### Broker Configuration

Access the Ambari UI to modify broker-level settings:

```
https://my-kafka-cluster.azurehdinsight.net
```

Navigate to Kafka > Configs and consider these settings:

- `num.io.threads`: Set to 2x the number of disks per broker for optimal I/O throughput
- `num.network.threads`: Set to the number of CPU cores for network handling
- `log.flush.interval.messages`: Higher values improve throughput at the cost of potential message loss on crashes
- `socket.send.buffer.bytes` and `socket.receive.buffer.bytes`: Increase to 1MB for high-throughput scenarios

### Producer Tuning

For high-throughput producers, consider these client-side settings:

- `batch.size`: Increase from the default 16KB to 64KB or higher
- `linger.ms`: Set to 5-10ms to allow batching of messages
- `compression.type`: Use `lz4` or `snappy` for compression
- `buffer.memory`: Increase if producers are sending faster than the network can handle

### Consumer Tuning

For consumers processing high volumes:

- `fetch.min.bytes`: Increase to reduce the number of fetch requests
- `max.poll.records`: Set based on your processing capacity per poll cycle
- `auto.offset.reset`: Use `earliest` for data processing pipelines, `latest` for real-time dashboards

## Monitoring Kafka

HDInsight provides Kafka metrics through Ambari. Key metrics to watch:

- **Under-replicated partitions**: Should be zero in a healthy cluster. Non-zero means some replicas are falling behind.
- **Active controller count**: Should be exactly 1 across the cluster.
- **Bytes in/out per second**: Tracks throughput across all topics.
- **Consumer lag**: The difference between the latest offset and the consumer's committed offset.

You can also use Azure Monitor to set up alerts on these metrics and forward them to your monitoring infrastructure.

## Summary

Apache Kafka on Azure HDInsight gives you a production-grade event streaming platform with managed infrastructure. The key things to get right are network configuration (deploy in a VNet for client access), topic design (choose partition counts based on expected parallelism), and retention policies (match your data lifecycle requirements). Start with the defaults, measure your throughput and latency, and tune producer/consumer/broker settings incrementally based on your observed bottlenecks.
