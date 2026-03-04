# How to Monitor Kafka Broker Health and Performance on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kafka, Message Broker, Linux

Description: Learn how to monitor Kafka Broker Health and Performance on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Monitoring Kafka brokers is essential for maintaining a healthy message streaming platform. This guide covers built-in tools, JMX metrics, and integration with Prometheus and Grafana for comprehensive Kafka monitoring on RHEL 9.

## Prerequisites

- RHEL 9 with Kafka running
- Root or sudo access

## Step 1: Built-in Kafka Tools

### Check Topic Details

```bash
/opt/kafka/bin/kafka-topics.sh --describe --topic mytopic   --bootstrap-server localhost:9092
```

### Check Consumer Group Lag

```bash
/opt/kafka/bin/kafka-consumer-groups.sh --describe   --group mygroup --bootstrap-server localhost:9092
```

Consumer lag indicates how far behind a consumer is from the latest message.

### Check Broker Configuration

```bash
/opt/kafka/bin/kafka-configs.sh --describe --entity-type brokers   --entity-name 1 --bootstrap-server localhost:9092
```

## Step 2: Enable JMX Monitoring

Set JMX port in the Kafka environment:

```bash
export KAFKA_JMX_OPTS="-Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.port=9999 -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false"
```

## Step 3: Key Metrics to Monitor

| Metric | Description | Healthy Value |
|--------|-------------|---------------|
| UnderReplicatedPartitions | Partitions without enough replicas | 0 |
| IsrShrinkRate | Rate of ISR shrinks | Near 0 |
| ActiveControllerCount | Controllers in the cluster | 1 |
| OfflinePartitionsCount | Partitions without a leader | 0 |
| MessagesInPerSec | Message throughput | Varies |
| BytesInPerSec | Byte throughput | Varies |
| RequestHandlerAvgIdlePercent | Handler thread idle time | > 0.3 |

## Step 4: Prometheus Integration

Use the JMX Exporter:

```bash
curl -L https://repo1.maven.org/maven2/io/prometheus/jmx/jmx_prometheus_javaagent/0.19.0/jmx_prometheus_javaagent-0.19.0.jar -o /opt/kafka/libs/jmx_prometheus_javaagent.jar
```

Create exporter config:

```bash
vi /opt/kafka/config/jmx-exporter.yaml
```

```yaml
rules:
- pattern: kafka.server<type=(.+), name=(.+)><>Value
  name: kafka_server_$1_$2
  type: GAUGE
```

Add to KAFKA_OPTS:

```bash
export KAFKA_OPTS="-javaagent:/opt/kafka/libs/jmx_prometheus_javaagent.jar=7071:/opt/kafka/config/jmx-exporter.yaml"
```

Metrics are now available at `http://localhost:7071/metrics`.

## Conclusion

Comprehensive Kafka monitoring on RHEL 9 combines built-in CLI tools for quick checks with JMX metrics exported to Prometheus for long-term trend analysis. Focus on under-replicated partitions, consumer lag, and request handler utilization as your primary health indicators.
