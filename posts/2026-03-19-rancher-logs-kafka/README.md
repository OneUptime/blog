# How to Send Logs to Kafka from Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Logging, Kafka

Description: Configure Rancher to stream Kubernetes logs to Apache Kafka for real-time log processing and distribution.

Apache Kafka is a distributed event streaming platform that excels at handling high-throughput log data. Sending Kubernetes logs to Kafka enables real-time log processing, stream analytics, and multi-destination log distribution. This guide covers configuring Rancher's logging stack to produce log messages to Kafka topics.

## Prerequisites

- Rancher v2.6 or later with the Logging chart installed.
- An Apache Kafka cluster accessible from the Kubernetes cluster.
- Cluster admin permissions.
- Kafka topics created for log ingestion.

## Step 1: Prepare Kafka Topics

Create Kafka topics for Kubernetes logs:

```bash
kafka-topics.sh --create \
  --bootstrap-server kafka.example.com:9092 \
  --topic kubernetes-logs \
  --partitions 6 \
  --replication-factor 3

kafka-topics.sh --create \
  --bootstrap-server kafka.example.com:9092 \
  --topic kubernetes-audit-logs \
  --partitions 3 \
  --replication-factor 3
```

## Step 2: Create a ClusterOutput for Kafka

### Basic Configuration (No Authentication)

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: kafka-output
  namespace: cattle-logging-system
spec:
  kafka:
    brokers: kafka-0.kafka.svc:9092,kafka-1.kafka.svc:9092,kafka-2.kafka.svc:9092
    default_topic: kubernetes-logs
    format:
      type: json
    buffer:
      type: file
      path: /buffers/kafka
      chunk_limit_size: 8MB
      total_limit_size: 2GB
      flush_interval: 3s
      flush_thread_count: 4
      retry_max_interval: 30s
      retry_forever: true
```

### SASL/SCRAM Authentication

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: kafka-sasl-output
  namespace: cattle-logging-system
spec:
  kafka:
    brokers: kafka.example.com:9093
    default_topic: kubernetes-logs
    sasl_over_ssl: true
    username:
      valueFrom:
        secretKeyRef:
          name: kafka-credentials
          key: username
    password:
      valueFrom:
        secretKeyRef:
          name: kafka-credentials
          key: password
    scram_mechanism: sha256
    format:
      type: json
    buffer:
      type: file
      path: /buffers/kafka-sasl
      chunk_limit_size: 8MB
      flush_interval: 5s
      retry_forever: true
```

Create the credentials secret:

```bash
kubectl create secret generic kafka-credentials \
  --namespace cattle-logging-system \
  --from-literal=username=kafka-user \
  --from-literal=password='kafka-password'
```

### TLS Configuration

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: kafka-tls-output
  namespace: cattle-logging-system
spec:
  kafka:
    brokers: kafka.example.com:9093
    default_topic: kubernetes-logs
    ssl_ca_cert:
      valueFrom:
        secretKeyRef:
          name: kafka-tls
          key: ca.crt
    ssl_client_cert:
      valueFrom:
        secretKeyRef:
          name: kafka-tls
          key: client.crt
    ssl_client_cert_key:
      valueFrom:
        secretKeyRef:
          name: kafka-tls
          key: client.key
    format:
      type: json
    buffer:
      type: file
      path: /buffers/kafka-tls
      chunk_limit_size: 8MB
      flush_interval: 5s
      retry_forever: true
```

## Step 3: Create a ClusterFlow

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: all-to-kafka
  namespace: cattle-logging-system
spec:
  filters:
    - parser:
        parse:
          type: json
        key_name: log
        reserve_data: true
        remove_key_name_field: true
        emit_invalid_record_to_error: false

    - record_transformer:
        records:
          - cluster: "production"

  globalOutputRefs:
    - kafka-output
```

## Step 4: Route Logs to Different Kafka Topics

Use Fluentd's topic_key feature to route logs to different topics based on log content:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: kafka-multi-topic
  namespace: cattle-logging-system
spec:
  kafka:
    brokers: kafka.example.com:9092
    default_topic: kubernetes-logs-default
    topic_key: kafka_topic
    format:
      type: json
    buffer:
      type: file
      path: /buffers/kafka-multi
      chunk_limit_size: 8MB
      flush_interval: 5s
      retry_forever: true
```

Then use a filter to set the topic dynamically:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: routed-logs
  namespace: cattle-logging-system
spec:
  filters:
    - record_transformer:
        enable_ruby: true
        records:
          - kafka_topic: "kubernetes-${record.dig('kubernetes', 'namespace_name') || 'default'}"
  globalOutputRefs:
    - kafka-multi-topic
```

This routes logs to topics like `kubernetes-production`, `kubernetes-staging`, etc.

## Step 5: Configure Message Key

Set the Kafka message key for log ordering by copying the pod name into a top-level field in the `ClusterFlow` and referencing that field from the Kafka output:

```yaml
spec:
  filters:
    - record_transformer:
        enable_ruby: true
        records:
          - message_key: "${record.dig('kubernetes', 'pod_name')}"
```

Then reference that field in the Kafka output:

```yaml
spec:
  kafka:
    brokers: kafka.example.com:9092
    default_topic: kubernetes-logs
    message_key_key: message_key
    format:
      type: json
```

This uses the pod name as the message key, ensuring all logs from the same pod go to the same partition.

## Step 6: Configure for Confluent Cloud

For Confluent Cloud managed Kafka, use SASL/PLAIN over TLS:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: confluent-cloud-output
  namespace: cattle-logging-system
spec:
  kafka:
    brokers: pkc-xxxxx.us-east-1.aws.confluent.cloud:9092
    default_topic: kubernetes-logs
    sasl_over_ssl: true
    username:
      valueFrom:
        secretKeyRef:
          name: confluent-credentials
          key: api-key
    password:
      valueFrom:
        secretKeyRef:
          name: confluent-credentials
          key: api-secret
    format:
      type: json
    buffer:
      type: file
      path: /buffers/confluent
      chunk_limit_size: 8MB
      flush_interval: 5s
      retry_forever: true
```

## Step 7: Configure for Amazon MSK

For Amazon Managed Streaming for Apache Kafka with TLS encryption:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: msk-output
  namespace: cattle-logging-system
spec:
  kafka:
    brokers: b-1.msk-cluster.xxxxx.kafka.us-east-1.amazonaws.com:9094,b-2.msk-cluster.xxxxx.kafka.us-east-1.amazonaws.com:9094
    default_topic: kubernetes-logs
    ssl_ca_cert:
      valueFrom:
        secretKeyRef:
          name: msk-tls
          key: ca.crt
    format:
      type: json
    buffer:
      type: file
      path: /buffers/msk
      chunk_limit_size: 8MB
      flush_interval: 5s
      retry_forever: true
```

## Step 8: Verify Log Delivery

Check Fluentd logs:

```bash
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=fluentd -c fluentd | grep -i kafka
```

Consume messages from the Kafka topic:

```bash
kafka-console-consumer.sh \
  --bootstrap-server kafka.example.com:9092 \
  --topic kubernetes-logs \
  --from-beginning \
  --max-messages 5
```

## Troubleshooting

- **Connection refused**: Verify broker addresses and ports. Check network policies.
- **Authentication failed**: Verify SASL credentials or TLS certificates.
- **Topic not found**: Ensure the topic exists or enable auto-topic creation in Kafka.
- **Message too large**: Increase `message.max.bytes` on the Kafka broker or reduce `chunk_limit_size`.
- **High latency**: Reduce `flush_interval` and increase `flush_thread_count`.

## Summary

Sending logs to Kafka from Rancher enables real-time log streaming and multi-destination distribution. Configure the ClusterOutput with your Kafka broker addresses, authentication settings, and buffer parameters. Use topic routing to send different log types to different topics, and set message keys for partition-ordered log delivery.
