# How to Set Up Dead Letter Queues for Failed Log Delivery in Kubernetes Logging Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Logging, Reliability

Description: Implement dead letter queues in Kubernetes logging pipelines to capture and retry failed log deliveries, preventing log loss during downstream failures.

---

Log delivery failures are inevitable in distributed systems. When your log aggregation backend is down, experiencing high load, or rejecting malformed logs, you need a strategy to prevent data loss. Dead letter queues (DLQs) provide a safety net by capturing failed log deliveries for later retry or analysis.

This guide shows you how to implement DLQs in Kubernetes logging pipelines using Fluent Bit and Vector.

## Understanding Dead Letter Queues for Logs

A dead letter queue captures log entries that fail to deliver to their destination. Failed deliveries occur due to:

- Network connectivity issues
- Backend service unavailability
- Authentication failures
- Malformed log entries
- Rate limiting or throttling
- Timeout errors

DLQs enable you to:
- Retry failed deliveries when backends recover
- Analyze patterns in failed logs
- Prevent memory exhaustion from buffering
- Maintain observability during outages

## Implementing DLQ with Fluent Bit

Configure Fluent Bit to write failed deliveries to a DLQ:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-dlq-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush           5
        Daemon          off
        Log_Level       info

    [INPUT]
        Name              tail
        Path              /var/log/containers/*.log
        Parser            docker
        Tag               kube.*
        Refresh_Interval  5
        Mem_Buf_Limit     5MB
        DB                /var/log/flb-kube.db

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Merge_Log           On

    # Primary output to Loki
    [OUTPUT]
        Name                loki
        Match               kube.*
        Host                loki.logging.svc.cluster.local
        Port                3100
        Labels              job=kubernetes
        Retry_Limit         5

    # DLQ: Write failed logs to file
    [OUTPUT]
        Name                file
        Match               kube.*
        Path                /var/log/dlq
        File                dlq-logs.json
        Format              json
        # Only write if primary output fails
        Storage.total_limit_size 1G
```

However, Fluent Bit doesn't natively support conditional outputs based on failure. Use a more sophisticated approach with rewrite tags:

```yaml
[FILTER]
    Name         rewrite_tag
    Match        kube.*
    Rule         $log .* primary-$TAG false
    Emitter_Name primary_emitter

[OUTPUT]
    Name                loki
    Match               primary.*
    Host                loki.logging.svc.cluster.local
    Port                3100
    Retry_Limit         3
    # Tag failed logs
    Storage.pause_on_chunks_overlimit on

[OUTPUT]
    Name                file
    Match               dlq.*
    Path                /var/log/dlq/
    File                failed-logs.json
    Format              json
```

## Implementing DLQ with Vector

Vector provides built-in support for dead letter queues:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vector-config
  namespace: logging
data:
  vector.toml: |
    [sources.kubernetes_logs]
    type = "kubernetes_logs"

    # Transform and prepare logs
    [transforms.prepare_logs]
    type = "remap"
    inputs = ["kubernetes_logs"]
    source = '''
      .cluster = "production"
      .timestamp = now()
    '''

    # Primary sink: Send to Loki
    [sinks.loki_primary]
    type = "loki"
    inputs = ["prepare_logs"]
    endpoint = "http://loki.logging.svc.cluster.local:3100"
    encoding.codec = "json"

    # Buffer configuration
    buffer.type = "disk"
    buffer.max_size = 268435488  # 256 MB
    buffer.when_full = "block"

    # Retry configuration
    request.retry_attempts = 5
    request.retry_initial_backoff_secs = 1
    request.retry_max_duration_secs = 300
    request.timeout_secs = 60

    # Dead letter queue for failed deliveries
    [sinks.dlq_file]
    type = "file"
    inputs = ["prepare_logs"]
    path = "/var/log/dlq/failed-logs-%Y-%m-%d-%H.json"
    encoding.codec = "json"

    # Route to DLQ based on healthcheck
    [sinks.dlq_file.healthcheck]
    enabled = false  # Don't healthcheck DLQ itself

    # Create a dead letter topic for analysis
    [sinks.dlq_kafka]
    type = "kafka"
    inputs = ["prepare_logs"]
    bootstrap_servers = "kafka.logging.svc.cluster.local:9092"
    topic = "log-delivery-failures"
    encoding.codec = "json"

    # Only write to Kafka DLQ when primary fails
    [sinks.dlq_kafka.batch]
    max_bytes = 1048576
    max_events = 1000
```

## Implementing Retry Logic with Vector

Configure sophisticated retry behavior:

```toml
[sinks.loki_with_retry]
type = "loki"
inputs = ["kubernetes_logs"]
endpoint = "http://loki.logging.svc.cluster.local:3100"

# Exponential backoff retry
[sinks.loki_with_retry.request]
retry_attempts = 10
retry_initial_backoff_secs = 1
retry_max_duration_secs = 600
# Exponential backoff: 1s, 2s, 4s, 8s, etc.
retry_jitter_mode = "full"

# Adaptive request timeout
timeout_secs = 60
rate_limit_duration_secs = 1
rate_limit_num = 100

# Circuit breaker configuration
[sinks.loki_with_retry.request.adaptive_concurrency]
enabled = true
initial_concurrency = 10
max_concurrency = 100
```

## File-Based DLQ with Rotation

Implement file-based DLQ with automatic rotation:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: vector-dlq
  namespace: logging
spec:
  selector:
    matchLabels:
      app: vector
  template:
    metadata:
      labels:
        app: vector
    spec:
      containers:
      - name: vector
        image: timberio/vector:latest
        volumeMounts:
        - name: config
          mountPath: /etc/vector
        - name: dlq-storage
          mountPath: /var/log/dlq
        - name: varlog
          mountPath: /var/log
          readOnly: true

      # Sidecar for DLQ processing
      - name: dlq-processor
        image: busybox:latest
        command:
        - /bin/sh
        - -c
        - |
          while true; do
            # Process DLQ files older than 5 minutes
            find /var/log/dlq -name "*.json" -mmin +5 -exec sh -c '
              echo "Processing DLQ file: $1"
              # Attempt to resend to primary destination
              cat "$1" | curl -X POST \
                -H "Content-Type: application/json" \
                --data-binary @- \
                http://loki.logging.svc.cluster.local:3100/loki/api/v1/push

              # Move to archive if successful
              if [ $? -eq 0 ]; then
                mv "$1" /var/log/dlq/archive/
              fi
            ' sh {} \;

            sleep 300  # Run every 5 minutes
          done
        volumeMounts:
        - name: dlq-storage
          mountPath: /var/log/dlq

      volumes:
      - name: config
        configMap:
          name: vector-config
      - name: dlq-storage
        emptyDir:
          sizeLimit: 2Gi
      - name: varlog
        hostPath:
          path: /var/log
```

## Kafka-Based DLQ for Distributed Systems

Use Kafka as a DLQ for better durability:

```yaml
# Vector configuration with Kafka DLQ
[sinks.loki_primary]
type = "loki"
inputs = ["kubernetes_logs"]
endpoint = "http://loki.logging.svc.cluster.local:3100"

[sinks.loki_primary.request]
retry_attempts = 3

# Route failures to Kafka
[transforms.route_on_failure]
type = "route"
inputs = ["kubernetes_logs"]

# Default route: send to Loki
[transforms.route_on_failure.route.success]
type = "vrl"
source = 'true'

# Kafka DLQ topic
[sinks.kafka_dlq]
type = "kafka"
inputs = ["kubernetes_logs"]
bootstrap_servers = "kafka.logging.svc.cluster.local:9092"
topic = "logging-dlq"
compression = "gzip"
encoding.codec = "json"

[sinks.kafka_dlq.encoding]
timestamp_format = "rfc3339"

# Add failure metadata
[transforms.add_failure_metadata]
type = "remap"
inputs = ["kubernetes_logs"]
source = '''
  .dlq_timestamp = now()
  .dlq_reason = "loki_delivery_failure"
  .dlq_retry_count = 0
'''
```

## DLQ Consumer for Reprocessing

Create a consumer that reprocesses DLQ messages:

```python
# dlq_consumer.py
import json
import time
import requests
from kafka import KafkaConsumer

consumer = KafkaConsumer(
    'logging-dlq',
    bootstrap_servers=['kafka.logging.svc.cluster.local:9092'],
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    auto_offset_reset='earliest',
    enable_auto_commit=False
)

LOKI_URL = "http://loki.logging.svc.cluster.local:3100/loki/api/v1/push"
MAX_RETRIES = 5
RETRY_DELAY = 60  # seconds

def send_to_loki(log_entry):
    """Attempt to send log entry to Loki"""
    try:
        response = requests.post(
            LOKI_URL,
            json=log_entry,
            timeout=30
        )
        response.raise_for_status()
        return True
    except requests.exceptions.RequestException as e:
        print(f"Failed to send to Loki: {e}")
        return False

def process_dlq():
    """Process messages from DLQ"""
    for message in consumer:
        log_entry = message.value
        retry_count = log_entry.get('dlq_retry_count', 0)

        print(f"Processing DLQ message (retry {retry_count})")

        if retry_count >= MAX_RETRIES:
            print(f"Max retries exceeded, moving to permanent failure queue")
            # Send to permanent failure storage
            with open('/var/log/permanent-failures.json', 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
            consumer.commit()
            continue

        # Attempt delivery
        if send_to_loki(log_entry):
            print("Successfully redelivered log entry")
            consumer.commit()
        else:
            # Increment retry count and wait
            log_entry['dlq_retry_count'] = retry_count + 1
            print(f"Delivery failed, will retry later")
            time.sleep(RETRY_DELAY)

if __name__ == "__main__":
    print("Starting DLQ consumer...")
    process_dlq()
```

Deploy as a Kubernetes Job:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dlq-reprocessor
  namespace: logging
spec:
  schedule: "*/15 * * * *"  # Every 15 minutes
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: dlq-consumer
            image: python:3.9
            command:
            - python
            - /scripts/dlq_consumer.py
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          restartPolicy: OnFailure
          volumes:
          - name: scripts
            configMap:
              name: dlq-scripts
```

## Monitoring DLQ Health

Track DLQ metrics:

```yaml
# Prometheus metrics for DLQ
- name: dlq_monitoring
  rules:
    # DLQ size growth rate
    - record: dlq:size:rate
      expr: rate(vector_buffer_byte_size{component_kind="sink",component_name="dlq_file"}[5m])

    # Failed delivery rate
    - record: dlq:failures:rate
      expr: rate(vector_sink_send_errors_total{component_name="loki_primary"}[5m])

    # Alert on high DLQ growth
    - alert: DLQGrowthHigh
      expr: dlq:size:rate > 1000000  # 1MB/s
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "DLQ growing rapidly"
        description: "DLQ size increasing at {{ $value }} bytes/sec"

    # Alert on DLQ not being processed
    - alert: DLQNotProcessed
      expr: increase(vector_buffer_events{component_name="dlq_file"}[1h]) > 0
        and
        increase(vector_buffer_events{component_name="dlq_file"}[1h] offset 1h)
        ==
        increase(vector_buffer_events{component_name="dlq_file"}[1h])
      labels:
        severity: critical
      annotations:
        summary: "DLQ not being processed"
        description: "DLQ has stagnant messages"
```

## Best Practices

1. **Set appropriate retry limits**: Balance persistence with resource consumption
2. **Implement exponential backoff**: Avoid overwhelming recovering services
3. **Monitor DLQ size**: Alert on unexpected growth
4. **Archive old DLQ data**: Prevent disk exhaustion
5. **Add metadata**: Tag DLQ entries with failure reasons
6. **Separate permanent failures**: Move unrecoverable logs to separate storage
7. **Test recovery procedures**: Regularly validate DLQ reprocessing

## Conclusion

Dead letter queues are essential for reliable log delivery in Kubernetes. They prevent data loss during downstream failures and provide a mechanism for recovering from transient issues. Implement DLQs with appropriate retry logic, monitoring, and reprocessing capabilities to ensure no logs are lost, even during extended outages. Remember that DLQs are a safety net, not a replacement for addressing root causes of delivery failures.
