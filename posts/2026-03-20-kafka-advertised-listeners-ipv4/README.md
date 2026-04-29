# How to Configure Kafka advertised.listeners for IPv4 Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, IPv4, Advertised.listeners, NAT, Client, Broker

Description: Configure Kafka advertised.listeners to ensure clients receive the correct IPv4 address for connecting, essential for NAT environments and multi-network deployments.

## Introduction

`advertised.listeners` is one of the most critical Kafka settings. When a client connects to Kafka, the broker responds with the addresses clients should use for subsequent connections. If `advertised.listeners` contains an internal IP but clients are external, connections will fail. This is especially critical behind NAT.

## How advertised.listeners Works

```text
1. Client connects to broker IP (from DNS/config)
2. Broker responds with metadata including advertised.listeners addresses
3. Client uses those addresses for all subsequent producer/consumer connections

Without correct advertised.listeners:
  Client → connects to 203.0.113.10:9092
  Broker metadata returns → 10.0.0.1:9092 (internal IP!)
  Client tries → 10.0.0.1:9092 (unreachable from outside!)
  Result: Connection refused / timeout

With correct advertised.listeners:
  Client → connects to 203.0.113.10:9092
  Broker metadata returns → 203.0.113.10:9092 (public IP)
  Client uses → 203.0.113.10:9092 ✓
```

## Configuration

```properties
# /etc/kafka/server.properties

# What the broker actually binds to (can use 0.0.0.0)

listeners=PLAINTEXT://0.0.0.0:9092

# What clients are told to connect to (must be reachable by clients!)
advertised.listeners=PLAINTEXT://203.0.113.10:9092

listener.security.protocol.map=PLAINTEXT:PLAINTEXT
```

## Internal and External Listeners

```properties
# Multi-listener setup: separate internal and external clients

listeners=INTERNAL://10.0.0.1:9092,EXTERNAL://0.0.0.0:9093

# Internal clients get internal IP
# External clients get public IP
advertised.listeners=INTERNAL://10.0.0.1:9092,EXTERNAL://203.0.113.10:9093

listener.security.protocol.map=INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT

# Brokers communicate internally
inter.broker.listener.name=INTERNAL
```

## Cloud/NAT Environments

```properties
# AWS EC2: use the Elastic IP or public hostname
advertised.listeners=PLAINTEXT://ec2-203-0-113-10.compute-1.amazonaws.com:9092

# Docker with host networking:
advertised.listeners=PLAINTEXT://HOST_IP:9092
# Replace HOST_IP with the actual host IP or hostname reachable by clients

# Kubernetes (with a broker-specific external Service / LoadBalancer):
advertised.listeners=PLAINTEXT://BROKER_EXTERNAL_IP:9092
```

## Verifying advertised.listeners

```bash
# For KRaft clusters, check metadata quorum health:
kafka-metadata-quorum.sh --bootstrap-server 10.0.0.1:9092 describe --status

# Verify the broker is reachable from the client network:
kafka-broker-api-versions.sh --bootstrap-server 203.0.113.10:9092

# Check dynamic broker config overrides
kafka-configs.sh --bootstrap-server 10.0.0.1:9092 \
  --entity-type brokers --entity-name 1 --describe | grep advertised

# Check the static broker config file
grep '^advertised.listeners=' /etc/kafka/server.properties

# Watch Kafka logs for listener registration
sudo tail -30 /var/log/kafka/server.log | grep -i "advertised\|listener"
```

## Testing from an External Client

```bash
# From external host:
kafka-topics.sh --bootstrap-server 203.0.113.10:9092 --list

# If it fails with timeout → often firewall or routing issue
# If it fails with connection refused → broker not listening on that address/port
# If the initial connection works but metadata-based operations fail → advertised.listeners may be returning an unreachable address

# Produce and consume to verify full path:
kafka-console-producer.sh --bootstrap-server 203.0.113.10:9092 --topic test
kafka-console-consumer.sh --bootstrap-server 203.0.113.10:9092 --topic test \
  --from-beginning
```

## Conclusion

`advertised.listeners` must contain the IP address or hostname that clients can actually reach. For NAT or cloud environments, this is the public IP, not the internal bind address. Use separate named listeners (INTERNAL/EXTERNAL) to serve different client networks from the same broker. Always test from the client's network perspective-not from the broker itself.
