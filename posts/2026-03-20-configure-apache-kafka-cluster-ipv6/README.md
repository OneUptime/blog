# How to Configure Apache Kafka Cluster with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, IPv6, Message Broker, Streaming, Cluster, KRaft, ZooKeeper

Description: Configure an Apache Kafka broker cluster to use IPv6 for listeners, inter-broker communication, and client connections in both ZooKeeper and KRaft modes.

---

Apache Kafka is the dominant distributed streaming platform. Configuring Kafka for IPv6 requires updating listener addresses in `server.properties`. On Kafka 3.x and earlier, ZooKeeper-based deployments also need an IPv6-capable `zookeeper.connect` setting.

## Kafka IPv6 Listener Configuration

```properties
# /etc/kafka/server.properties

# Broker ID

broker.id=1

# Listeners - what Kafka binds to
# Use :: to listen on the IPv6 wildcard address
listeners=PLAINTEXT://[::]:9092

# For specific IPv6 address:
# listeners=PLAINTEXT://[2001:db8::1]:9092

# What to advertise to clients
# Must be a specific IPv6 address (or hostname with AAAA record)
advertised.listeners=PLAINTEXT://[2001:db8::1]:9092

# Inter-broker listener
inter.broker.listener.name=PLAINTEXT

# ZooKeeper connection (Kafka 3.x and earlier; use hostnames with AAAA records)
zookeeper.connect=zk1.example.com:2181,zk2.example.com:2181,zk3.example.com:2181/kafka

# Log directories
log.dirs=/var/lib/kafka/logs

# Replication and partition settings
num.partitions=3
default.replication.factor=3
min.insync.replicas=2
```

## Kafka KRaft Mode with IPv6 (ZooKeeper-free)

KRaft is the modern Kafka mode without ZooKeeper dependency:

```properties
# /etc/kafka/kraft/server.properties

# KRaft mode settings
process.roles=broker,controller
node.id=1

# Controller quorum with IPv6 addresses
controller.quorum.voters=1@[2001:db8::1]:9093,2@[2001:db8::2]:9093,3@[2001:db8::3]:9093

# Listeners
listeners=PLAINTEXT://[::]:9092,CONTROLLER://[2001:db8::1]:9093
inter.broker.listener.name=PLAINTEXT
controller.listener.names=CONTROLLER

# Advertised listeners
advertised.listeners=PLAINTEXT://[2001:db8::1]:9092

# Log directories
log.dirs=/var/lib/kafka/logs
```

Initialize and start Kafka in KRaft mode:

```bash
# Generate cluster UUID
KAFKA_CLUSTER_ID=$(kafka-storage.sh random-uuid)

# Format storage directories on each node
kafka-storage.sh format \
  -t "$KAFKA_CLUSTER_ID" \
  -c /etc/kafka/kraft/server.properties

# Start Kafka
sudo systemctl start kafka

# Verify listening on IPv6
ss -tlnp | grep "9092\|9093"
```

## Multi-Broker Configuration

For a 3-broker ZooKeeper-based cluster, configure each with a different broker ID and advertised address:

```bash
# Broker 2 /etc/kafka/server.properties
broker.id=2
advertised.listeners=PLAINTEXT://[2001:db8::2]:9092
listeners=PLAINTEXT://[::]:9092

# Broker 3 /etc/kafka/server.properties
broker.id=3
advertised.listeners=PLAINTEXT://[2001:db8::3]:9092
listeners=PLAINTEXT://[::]:9092
```

## JVM IPv6 Settings for Kafka

```bash
# /etc/kafka/kafka-env.sh or systemd override
export KAFKA_HEAP_OPTS="-Xmx4g -Xms4g"
export KAFKA_OPTS="-Djava.net.preferIPv6Addresses=true \
  -Djava.net.preferIPv4Stack=false"
```

## Testing Kafka Producer and Consumer over IPv6

```bash
# Create a topic
kafka-topics.sh \
  --bootstrap-server [2001:db8::1]:9092 \
  --create \
  --topic test-ipv6 \
  --partitions 3 \
  --replication-factor 3

# Produce messages
kafka-console-producer.sh \
  --bootstrap-server [2001:db8::1]:9092 \
  --topic test-ipv6

# Consume messages
kafka-console-consumer.sh \
  --bootstrap-server [2001:db8::1]:9092 \
  --topic test-ipv6 \
  --from-beginning
```

```python
# Python Kafka producer over IPv6
from kafka import KafkaProducer

producer = KafkaProducer(
    # Bootstrap servers with IPv6 addresses (brackets required)
    bootstrap_servers=['[2001:db8::1]:9092', '[2001:db8::2]:9092'],
    value_serializer=lambda v: v.encode('utf-8')
)

producer.send('test-ipv6', 'Hello from IPv6 producer!')
producer.flush()
print("Message sent over IPv6")
```

## Kafka Firewall Rules for IPv6

```bash
# Kafka broker port
sudo ip6tables -A INPUT -p tcp --dport 9092 -j ACCEPT
# KRaft controller port
sudo ip6tables -A INPUT -p tcp --dport 9093 -j ACCEPT

sudo ip6tables-save > /etc/ip6tables/rules.v6
```

Apache Kafka's listener configuration model supports IPv6 through bracket-notation IPv6 addresses in the `listeners` and `advertised.listeners` settings, enabling modern streaming infrastructure on IPv6-native networks.
