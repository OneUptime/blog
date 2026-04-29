# How to Configure Kafka Listeners to Bind to IPv4 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, IPv4, Listeners, Configuration, Broker, Messaging

Description: Configure Apache Kafka listeners in server.properties to bind to specific IPv4 addresses, define listener names and protocols, and verify broker binding.

## Introduction

Kafka brokers listen for client and inter-broker connections on addresses defined by the `listeners` property. Without an explicit host in `listeners`, Kafka does not bind to a specific IPv4 address. Specifying explicit IPv4 addresses limits exposure and ensures traffic flows through intended interfaces.

## Kafka Listeners Configuration

```properties
# /etc/kafka/server.properties (or /opt/kafka/config/server.properties)

# ZooKeeper mode broker ID (older clusters only)

broker.id=1

# Listeners: comma-separated list of name://host:port
# Listener names can be protocol names or custom names such as CONTROLLER
listeners=PLAINTEXT://10.0.0.1:9092,CONTROLLER://10.0.0.1:9093

# The address advertised to clients and other brokers
# Must be reachable by clients
advertised.listeners=PLAINTEXT://10.0.0.1:9092

# Map listener names to security protocols
listener.security.protocol.map=PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT

# Current Kafka releases use KRaft
# KRaft:
process.roles=broker,controller
node.id=1
controller.listener.names=CONTROLLER
controller.quorum.bootstrap.servers=10.0.0.1:9093,10.0.0.2:9093,10.0.0.3:9093
```

## Multiple Listeners on Different IPs

```properties
# Expose different listener names on different interfaces

# Internal communication (between brokers)
# External communication (clients)
listeners=INTERNAL://10.0.0.1:9092,EXTERNAL://203.0.113.10:9093

advertised.listeners=INTERNAL://10.0.0.1:9092,EXTERNAL://203.0.113.10:9093

listener.security.protocol.map=INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT

# Inter-broker uses internal listener
inter.broker.listener.name=INTERNAL
```

## Applying Configuration

```bash
# Restart Kafka broker
sudo systemctl restart kafka

# Verify Kafka is listening on expected addresses
sudo ss -tlnp | grep java | grep -E "9092|9093"
# Expected: 10.0.0.1:9092 and 10.0.0.1:9093

# Check Kafka logs for binding confirmation
sudo tail -30 /var/log/kafka/server.log | grep -i "listen\|bind"
```

## Firewall Rules

```bash
# Allow Kafka client access
sudo ufw allow from 10.0.0.0/24 to any port 9092

# Allow inter-broker communication (if separate port)
sudo ufw allow from 10.0.0.1 to any port 9092
sudo ufw allow from 10.0.0.2 to any port 9092
sudo ufw allow from 10.0.0.3 to any port 9092

# Allow KRaft controller quorum communication on 9093
sudo ufw allow from 10.0.0.1 to any port 9093
sudo ufw allow from 10.0.0.2 to any port 9093
sudo ufw allow from 10.0.0.3 to any port 9093

# iptables
sudo iptables -A INPUT -p tcp --dport 9092 -s 10.0.0.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 9093 -s 10.0.0.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 9092 -j DROP
sudo iptables -A INPUT -p tcp --dport 9093 -j DROP
```

## Testing the Listener

```bash
# Test port connectivity
nc -zv 10.0.0.1 9092

# Test with kafka-topics command
kafka-topics.sh --bootstrap-server 10.0.0.1:9092 --list

# Produce a test message
echo "test" | kafka-console-producer.sh \
  --bootstrap-server 10.0.0.1:9092 \
  --topic test-topic

# Check broker metadata
kafka-broker-api-versions.sh --bootstrap-server 10.0.0.1:9092
```

## Conclusion

Kafka `listeners` defines the actual binding addresses; `advertised.listeners` defines what clients and other brokers are told to connect to. For a single-interface broker, both should specify the same IPv4. For multi-interface setups, each listener can bind to the interface it serves; for NAT scenarios, `advertised.listeners` may need an externally reachable IP that differs from `listeners`. Listener names can be protocol names or custom names, and custom names must be mapped in `listener.security.protocol.map`.
