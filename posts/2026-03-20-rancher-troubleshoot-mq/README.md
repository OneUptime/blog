# How to Troubleshoot Message Queue Issues in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Message Queue, Troubleshooting, RabbitMQ, Kafka

Description: Diagnose and resolve common message queue issues in Rancher including consumer lag, connection failures, memory pressure, and cluster split-brain scenarios.

## Introduction

Message queue issues can cause cascade failures across your entire application stack. This guide provides a systematic troubleshooting approach for RabbitMQ, Kafka, and NATS running on Rancher-managed clusters, covering the most common production problems.

## Prerequisites

- kubectl access to your cluster
- Access to Prometheus/Grafana monitoring
- Message queue CLI tools available in pods

## Section 1: RabbitMQ Troubleshooting

### Problem: Messages Not Being Consumed

```bash
# Check if consumers are connected

kubectl exec -n messaging rabbitmq-0 -- \
  rabbitmqctl list_consumers -p /

# Check queue status
kubectl exec -n messaging rabbitmq-0 -- \
  rabbitmqctl list_queues -p / \
  name messages messages_ready messages_unacknowledged consumers memory state

# Check if channels are backing up with unacked messages
kubectl exec -n messaging rabbitmq-0 -- \
  rabbitmqctl list_channels connection messages_unacknowledged consumer_count

# List connections so you can identify the connection pid to close
kubectl exec -n messaging rabbitmq-0 -- \
  rabbitmqctl list_connections pid user vhost peer_host state channel_max

# Force close a stuck connection (use the pid from list_connections)
kubectl exec -n messaging rabbitmq-0 -- \
  rabbitmqctl close_connection "<rabbit@rabbitmq-0.1234.0>" "Consumer stuck"
```

### Problem: Memory Pressure

```bash
# Check memory usage
kubectl exec -n messaging rabbitmq-0 -- \
  rabbitmqctl status | grep memory

# Check memory alarm
kubectl exec -n messaging rabbitmq-0 -- \
  rabbitmqctl status | grep alarms

# Set memory watermark temporarily
kubectl exec -n messaging rabbitmq-0 -- \
  rabbitmqctl set_vm_memory_high_watermark 0.7

# Check per-queue memory usage
kubectl exec -n messaging rabbitmq-0 -- \
  rabbitmqctl list_queues name messages memory | sort -k3 -rn | head -10
```

### Problem: Split-Brain / Network Partition

```bash
# Check for network partition
kubectl exec -n messaging rabbitmq-0 -- \
  rabbitmqctl cluster_status | grep partitions

# Recover from partition
# First, choose the partition you trust most
kubectl exec -n messaging rabbitmq-0 -- \
  rabbitmqctl cluster_status

# Stop nodes in the other partition, then start them again so they resync
kubectl exec -n messaging rabbitmq-1 -- \
  rabbitmqctl stop_app
kubectl exec -n messaging rabbitmq-1 -- \
  rabbitmqctl start_app
# Finally, restart the trusted partition nodes to clear the partition warning
```

### Problem: Disk Space Running Out

```bash
# Check disk alarm
kubectl exec -n messaging rabbitmq-0 -- \
  rabbitmqctl status | grep disk

# Find large queues
kubectl exec -n messaging rabbitmq-0 -- \
  rabbitmqctl list_queues name messages message_bytes | sort -k3 -rn | head -10

# Purge a queue (careful! this deletes messages)
kubectl exec -n messaging rabbitmq-0 -- \
  rabbitmqctl purge_queue my-large-queue

# Purge ready messages from a queue via the management API
RABBITMQ_URL="http://localhost:15672"
curl -s -u admin:AdminP@ss \
  -X DELETE \
  "${RABBITMQ_URL}/api/queues/%2F/large-queue/contents"
```

## Section 2: Kafka Troubleshooting

### Problem: Consumer Lag Growing

```bash
# List all consumer groups and their lag
kubectl exec -n kafka kafka-0 -- \
  bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe --all-groups | head -30

# Reset consumer group offset to latest (consumer group must be inactive)
kubectl exec -n kafka kafka-0 -- \
  bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group order-processor \
  --reset-offsets --to-latest \
  --topic orders-topic \
  --execute

# Or reset to a specific timestamp
kubectl exec -n kafka kafka-0 -- \
  bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group order-processor \
  --reset-offsets \
  --to-datetime "2026-03-20T00:00:00.000" \
  --topic orders-topic \
  --execute
```

### Problem: Under-Replicated Partitions

```bash
# Check under-replicated partitions
kubectl exec -n kafka kafka-0 -- \
  bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --under-replicated-partitions

# Check unavailable partitions
kubectl exec -n kafka kafka-0 -- \
  bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --unavailable-partitions

# Trigger leader election for under-replicated partitions
kubectl exec -n kafka kafka-0 -- \
  bin/kafka-leader-election.sh \
  --bootstrap-server localhost:9092 \
  --election-type PREFERRED \
  --all-topic-partitions
```

### Problem: Producer Throughput Issues

```bash
# Run producer performance test
kubectl exec -n kafka kafka-0 -- \
  bin/kafka-producer-perf-test.sh \
  --topic test-perf \
  --num-records 100000 \
  --record-size 1024 \
  --throughput -1 \
  --producer-props bootstrap.servers=localhost:9092 \
  acks=1

# Check broker API connectivity
kubectl exec -n kafka kafka-0 -- \
  bin/kafka-broker-api-versions.sh \
  --bootstrap-server localhost:9092

# View log dirs to find disk issues
kubectl exec -n kafka kafka-0 -- \
  bin/kafka-log-dirs.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --topic-list orders-topic | \
  jq '.'
```

### Problem: Kafka Pod Won't Start (OOM Kill)

```bash
# Check pod events
kubectl describe pod kafka-0 -n kafka | grep -A 10 "OOM\|Memory\|Killed"

# Check configured JVM heap settings in the Strimzi resource
kubectl get kafka kafka-prod -n kafka -o jsonpath='{.spec.kafka.jvmOptions}'

# Update heap via Strimzi
kubectl patch kafka kafka-prod -n kafka \
  --type merge \
  -p '{
    "spec": {
      "kafka": {
        "jvmOptions": {
          "-Xms": "2048m",
          "-Xmx": "4096m"
        }
      }
    }
  }'
```

## Section 3: NATS Troubleshooting

```bash
# Check NATS server health
kubectl exec -n messaging nats-0 -- \
  nats server check --server nats://localhost:4222

# Check JetStream status
kubectl exec -n messaging nats-box-0 -- \
  nats server report jetstream \
  --server nats://nats.messaging.svc.cluster.local:4222

# Check stream raft group status
kubectl exec -n messaging nats-box-0 -- \
  nats stream info ORDERS \
  --server nats://nats.messaging.svc.cluster.local:4222

# View detailed server metrics
kubectl exec -n messaging nats-0 -- \
  curl -s localhost:8222/varz | jq .
```

## Section 4: Common Kubernetes Issues

```bash
# Pod stuck in Pending state (storage issue)
kubectl describe pod rabbitmq-0 -n messaging | grep -A 5 Events

# Check if PVC is bound
kubectl get pvc -n messaging

# PVC stuck in Pending
kubectl describe pvc rabbitmq-data-rabbitmq-0 -n messaging

# Pod stuck in CrashLoopBackOff
kubectl logs rabbitmq-0 -n messaging --previous --tail=100

# Check resource limits (OOMKilled)
kubectl describe pod kafka-0 -n kafka | grep -E "OOMKilled|Limits|Requests"
```

## Section 5: Diagnostic Runbook

```bash
#!/bin/bash
# mq-diagnose.sh - Quick diagnostic script

echo "=== Pod Status ==="
kubectl get pods -n messaging
kubectl get pods -n kafka

echo "=== PVC Status ==="
kubectl get pvc -n messaging
kubectl get pvc -n kafka

echo "=== Recent Events ==="
kubectl get events -n messaging --sort-by='.lastTimestamp' | tail -20

echo "=== RabbitMQ Cluster Health ==="
kubectl exec -n messaging rabbitmq-0 -- \
  rabbitmqctl node_health_check 2>/dev/null && echo "HEALTHY" || echo "UNHEALTHY"

echo "=== Kafka Broker Status ==="
kubectl exec -n kafka kafka-0 -- \
  bin/kafka-broker-api-versions.sh \
  --bootstrap-server localhost:9092 2>/dev/null && echo "HEALTHY" || echo "UNHEALTHY"
```

## Conclusion

Troubleshooting message queue issues requires understanding both the application-level symptoms (consumer lag, connection failures) and the infrastructure-level causes (disk pressure, network partitions, OOM kills). Start with a systematic approach: check pod status and events, review logs, then use the message queue's native CLI tools for deeper investigation. Always establish baseline metrics and alerting to catch issues early, before they impact consumers.
