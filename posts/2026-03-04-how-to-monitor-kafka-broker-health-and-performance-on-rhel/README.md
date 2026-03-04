# How to Monitor Kafka Broker Health and Performance on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kafka, Monitoring, JMX, Performance

Description: Learn how to monitor Apache Kafka broker health and performance on RHEL using built-in tools, JMX metrics, and command-line utilities.

---

Monitoring Kafka brokers is essential for maintaining a healthy messaging infrastructure. Kafka exposes metrics through JMX and provides command-line tools for checking cluster health.

## Checking Broker Status

```bash
# Verify the broker is running
sudo systemctl status kafka

# Check broker logs for errors
sudo journalctl -u kafka -f

# Or check the Kafka log file directly
tail -f /opt/kafka/logs/server.log
```

## Topic and Partition Health

```bash
# List all topics
/opt/kafka/bin/kafka-topics.sh --list \
  --bootstrap-server localhost:9092

# Describe a topic (shows partitions, replicas, ISR)
/opt/kafka/bin/kafka-topics.sh --describe \
  --topic my-topic \
  --bootstrap-server localhost:9092

# Check for under-replicated partitions
/opt/kafka/bin/kafka-topics.sh --describe \
  --under-replicated-partitions \
  --bootstrap-server localhost:9092
```

## Consumer Group Monitoring

```bash
# List all consumer groups
/opt/kafka/bin/kafka-consumer-groups.sh --list \
  --bootstrap-server localhost:9092

# Check consumer group lag
/opt/kafka/bin/kafka-consumer-groups.sh --describe \
  --group my-consumer-group \
  --bootstrap-server localhost:9092

# Key columns in output:
# CURRENT-OFFSET: last committed offset
# LOG-END-OFFSET: latest message offset
# LAG: difference (messages behind)
```

## Enabling JMX Metrics

```bash
# Set JMX port in the Kafka environment
# Add to /etc/systemd/system/kafka.service or kafka startup
export KAFKA_JMX_OPTS="-Dcom.sun.management.jmxremote \
  -Dcom.sun.management.jmxremote.port=9999 \
  -Dcom.sun.management.jmxremote.authenticate=false \
  -Dcom.sun.management.jmxremote.ssl=false"

export JMX_PORT=9999
```

## Key JMX Metrics to Monitor

```bash
# Use kafka-run-class.sh to query JMX metrics
# Messages in per second
/opt/kafka/bin/kafka-run-class.sh kafka.tools.JmxTool \
  --jmx-url service:jmx:rmi:///jndi/rmi://localhost:9999/jmxrmi \
  --object-name kafka.server:type=BrokerTopicMetrics,name=MessagesInPerSec

# Bytes in/out per second
# kafka.server:type=BrokerTopicMetrics,name=BytesInPerSec
# kafka.server:type=BrokerTopicMetrics,name=BytesOutPerSec

# Request latency
# kafka.network:type=RequestMetrics,name=TotalTimeMs,request=Produce
# kafka.network:type=RequestMetrics,name=TotalTimeMs,request=Fetch
```

## Log Directory Health

```bash
# Check log directory sizes
du -sh /var/kafka-logs/*

# Verify log segment integrity
/opt/kafka/bin/kafka-log-dirs.sh --describe \
  --bootstrap-server localhost:9092 \
  --broker-list 0
```

## Prometheus Integration

```bash
# Download the JMX Exporter agent
curl -L https://repo1.maven.org/maven2/io/prometheus/jmx/jmx_prometheus_javaagent/0.20.0/jmx_prometheus_javaagent-0.20.0.jar \
  -o /opt/kafka/jmx_prometheus_javaagent.jar

# Add to KAFKA_OPTS in the systemd service
# -javaagent:/opt/kafka/jmx_prometheus_javaagent.jar=7071:/opt/kafka/jmx-exporter-config.yaml
```

Monitor consumer lag closely. Growing lag indicates that consumers cannot keep up with producers, which may require adding more consumers to the group or increasing partition count.
