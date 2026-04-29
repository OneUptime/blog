# How to Set Up Kafka Monitoring with JMX Over IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, JMX, Monitoring, IPv4, Metric, Java, Prometheus

Description: Learn how to enable JMX on Kafka brokers over IPv4 and scrape metrics using JMX Exporter for Prometheus monitoring.

---

Kafka exposes extensive metrics via JMX (Java Management Extensions). Enabling JMX over an IPv4 port allows external monitoring tools to scrape broker health, topic throughput, and replication metrics.

## Enabling JMX on Kafka Broker

```bash
# /etc/kafka/kafka-env.sh (or add to the Kafka startup script)

# Enable JMX on a specific IPv4 address and port

export JMX_PORT=9999
export KAFKA_JMX_OPTS="-Dcom.sun.management.jmxremote=true \
  -Dcom.sun.management.jmxremote.authenticate=false \
  -Dcom.sun.management.jmxremote.ssl=false \
  -Dcom.sun.management.jmxremote.port=9999 \
  -Dcom.sun.management.jmxremote.rmi.port=9999 \
  -Djava.rmi.server.hostname=10.0.0.10"
# java.rmi.server.hostname must be the broker's routable IPv4 address (not 0.0.0.0)
# Do not disable authentication and TLS in production.
```

## Verifying JMX is Accessible

```bash
# Check that JMX is listening on an IPv4 socket on port 9999
ss -4 -tlpn '( sport = :9999 )'

# Test with jconsole (GUI tool)
jconsole 10.0.0.10:9999

# Or connect with the full JMX service URL
jconsole service:jmx:rmi:///jndi/rmi://10.0.0.10:9999/jmxrmi
```

## Using JMX Exporter for Prometheus

JMX Exporter is a Java agent that exposes JMX metrics as a Prometheus scrape endpoint.

```bash
# Download JMX Exporter agent JAR
wget https://github.com/prometheus/jmx_exporter/releases/download/1.5.0/jmx_prometheus_javaagent-1.5.0.jar \
  -O /opt/jmx_prometheus_javaagent.jar
```

```yaml
# /etc/kafka/kafka-jmx-exporter.yaml
---
rules:
  # Expose JMX metrics using the exporter's default naming
  - pattern: ".*"
```

```bash
# /etc/kafka/kafka-env.sh - add the agent to the JVM
export KAFKA_OPTS="$KAFKA_OPTS -javaagent:/opt/jmx_prometheus_javaagent.jar=9998:/etc/kafka/kafka-jmx-exporter.yaml"
# Port 9998 is the Prometheus HTTP scrape port (separate from JMX port 9999)
```

## Prometheus Configuration

```yaml
# /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'kafka'
    static_configs:
      - targets:
          - '10.0.0.10:9998'    # Broker 1 JMX Exporter
          - '10.0.0.11:9998'    # Broker 2
          - '10.0.0.12:9998'    # Broker 3
```

## Key Kafka JMX Metrics to Monitor

| Metric | MBean | Description |
|--------|-------|-------------|
| Messages In/sec | `kafka.server:type=BrokerTopicMetrics,name=MessagesInPerSec` | Incoming message rate |
| Bytes In/sec | `kafka.server:type=BrokerTopicMetrics,name=BytesInPerSec` | Inbound bytes from clients |
| Under-replicated partitions | `kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions` | Replication health |
| ISR Shrinks | `kafka.server:type=ReplicaManager,name=IsrShrinksPerSec` | ISR shrink rate |
| Request Queue Size | `kafka.network:type=RequestChannel,name=RequestQueueSize` | Size of the request queue |

## Key Takeaways

- Set `java.rmi.server.hostname` to the broker's IPv4 address to ensure remote JMX clients connect to the correct IP.
- JMX Exporter converts JMX metrics to Prometheus format, eliminating the need for direct JMX access from Prometheus.
- The JMX Exporter HTTP port (e.g., 9998) and JMX RMI port (e.g., 9999) are separate - only expose the HTTP port to Prometheus.
- Monitor `UnderReplicatedPartitions` as the most critical Kafka health metric.
