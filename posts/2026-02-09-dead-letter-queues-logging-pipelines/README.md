# How to Set Up Dead Letter Queues for Failed Log Delivery

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

Fluent Bit does not expose failed output delivery as a separate stream that can be routed to another output. Configure filesystem buffering so transient Loki failures are retried from disk instead of only from memory:

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
        storage.path    /var/lib/fluent-bit
        storage.sync    normal
        storage.checksum off

    [INPUT]
        Name              tail
        Path              /var/log/containers/*.log
        Parser            docker
        Tag               kube.*
        Refresh_Interval  5
        Mem_Buf_Limit     5MB
        DB                /var/log/flb-kube.db
        storage.type      filesystem

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
        storage.total_limit_size 1G

```

If you need a file copy for later analysis, add a second output. This mirrors matching logs; it is not conditional on the Loki output failing:

```yaml
[FILTER]
    Name         rewrite_tag
    Match        kube.*
    Rule         $log .* dlq.$TAG true
    Emitter_Name dlq_emitter
    Emitter_Storage.type filesystem

[OUTPUT]
    Name                loki
    Match               kube.*
    Host                loki.logging.svc.cluster.local
    Port                3100
    Retry_Limit         3
    storage.total_limit_size 1G

[OUTPUT]
    Name                file
    Match               dlq.*
    Path                /var/log/dlq/
    File                failed-logs.json
    Format              json
```

## Implementing DLQ with Vector

Vector provides per-sink buffering and retry controls, but it does not automatically route Loki sink failures into another sink. Use a durable primary sink buffer and, when required, a parallel archival sink for reprocessing:

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
    labels.job = "kubernetes"

    # Buffer configuration
    buffer.type = "disk"
    buffer.max_size = 268435488  # 256 MB
    buffer.when_full = "block"

    # Retry configuration
    request.retry_attempts = 5
    request.retry_initial_backoff_secs = 1
    request.retry_max_duration_secs = 300
    request.timeout_secs = 60

    # Archive copy for later reprocessing
    [sinks.dlq_file]
    type = "file"
    inputs = ["prepare_logs"]
    path = "/var/log/dlq/failed-logs-%Y-%m-%d-%H.json"
    encoding.codec = "json"

    # Don't healthcheck the archive sink at startup
    [sinks.dlq_file.healthcheck]
    enabled = false

    # Create an archive topic for analysis
    [sinks.dlq_kafka]
    type = "kafka"
    inputs = ["prepare_logs"]
    bootstrap_servers = "kafka.logging.svc.cluster.local:9092"
    topic = "log-delivery-failures"
    encoding.codec = "json"

    # Batch archived events
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

# Fibonacci backoff retry

[sinks.loki_with_retry.request]
retry_attempts = 10
retry_initial_backoff_secs = 1
retry_max_duration_secs = 600
# Full jitter is the default, but it can be set explicitly.
retry_jitter_mode = "Full"

# Request timeout and rate limit
timeout_secs = 60
rate_limit_duration_secs = 1
rate_limit_num = 100

# Adaptive concurrency is the default for HTTP sinks.
concurrency = "adaptive"

[sinks.loki_with_retry.request.adaptive_concurrency]
initial_concurrency = 10
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
        image: python:3.12-alpine
        command:
        - /bin/sh
        - -c
        - |
          while true; do
            # Process DLQ files older than 5 minutes
            find /var/log/dlq -name "*.json" -mmin +5 -exec sh -c '
              echo "Processing DLQ file: $1"
              # Convert JSON log lines into Loki push payloads
              python - "$1" << "PY"
          import json
          import sys
          import time
          import urllib.request

          url = "http://loki.logging.svc.cluster.local:3100/loki/api/v1/push"
          ok = True

          with open(sys.argv[1], "r", encoding="utf-8") as handle:
              for raw in handle:
                  event = json.loads(raw)
                  timestamp = str(event.get("timestamp_ns") or time.time_ns())
                  line = event.get("message") or event.get("log") or json.dumps(event)
                  payload = json.dumps({
                      "streams": [{
                          "stream": {"job": "kubernetes-dlq"},
                          "values": [[timestamp, line]]
                      }]
                  }).encode("utf-8")
                  request = urllib.request.Request(
                      url,
                      data=payload,
                      headers={"Content-Type": "application/json"},
                      method="POST",
                  )
                  try:
                      with urllib.request.urlopen(request, timeout=30) as response:
                          ok = ok and 200 <= response.status < 300
                  except Exception as exc:
                      print(f"Failed to send to Loki: {exc}")
                      ok = False

          sys.exit(0 if ok else 1)
          PY

              # Move to archive if successful
              if [ $? -eq 0 ]; then
                mkdir -p /var/log/dlq/archive
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

Use Kafka as an archive topic for better durability:

```toml
# Vector configuration with Kafka archive
[sinks.loki_primary]
type = "loki"
inputs = ["kubernetes_logs"]
endpoint = "http://loki.logging.svc.cluster.local:3100"

[sinks.loki_primary.request]
retry_attempts = 3

# Add archive metadata
[transforms.add_failure_metadata]
type = "remap"
inputs = ["kubernetes_logs"]
source = '''
  .dlq_archived_at = now()
  .dlq_reason = "loki_delivery_replay_copy"
  .dlq_retry_count = 0
'''

# Kafka archive topic
[sinks.kafka_dlq]
type = "kafka"
inputs = ["add_failure_metadata"]
bootstrap_servers = "kafka.logging.svc.cluster.local:9092"
topic = "logging-dlq"
compression = "gzip"
encoding.codec = "json"
encoding.timestamp_format = "rfc3339"
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
    timestamp = str(log_entry.get("timestamp_ns") or time.time_ns())
    line = log_entry.get("message") or log_entry.get("log") or json.dumps(log_entry)
    payload = {
        "streams": [
            {
                "stream": {"job": "kubernetes-dlq"},
                "values": [[timestamp, line]]
            }
        ]
    }

    try:
        response = requests.post(
            LOKI_URL,
            json=payload,
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

        while retry_count < MAX_RETRIES:
            if send_to_loki(log_entry):
                print("Successfully redelivered log entry")
                consumer.commit()
                break

            retry_count += 1
            log_entry['dlq_retry_count'] = retry_count
            print("Delivery failed, retrying later")
            time.sleep(RETRY_DELAY)

        if retry_count >= MAX_RETRIES:
            print("Max retries exceeded, moving to permanent failure queue")
            # Send to permanent failure storage
            with open('/var/log/permanent-failures.json', 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
            consumer.commit()

if __name__ == "__main__":
    print("Starting DLQ consumer...")
    process_dlq()
```

Deploy as a Kubernetes CronJob:

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
            image: your-registry/dlq-reprocessor:latest
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
      expr: rate(vector_component_sent_event_bytes_total{component_kind="sink",component_id="dlq_file"}[5m])

    # Failed delivery rate
    - record: dlq:failures:rate
      expr: rate(vector_component_errors_total{component_kind="sink",component_id="loki_primary"}[5m])

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
      expr: |
        increase(vector_component_received_events_total{component_kind="sink",component_id="dlq_file"}[1h]) > 0
        and
        increase(vector_component_sent_events_total{component_kind="sink",component_id="dlq_file"}[1h]) == 0
      labels:
        severity: critical
      annotations:
        summary: "DLQ not being processed"
        description: "DLQ has stagnant messages"
```

## Best Practices

1. **Set appropriate retry limits**: Balance persistence with resource consumption
2. **Implement bounded retry backoff**: Avoid overwhelming recovering services
3. **Monitor DLQ size**: Alert on unexpected growth
4. **Archive old DLQ data**: Prevent disk exhaustion
5. **Add metadata**: Tag DLQ entries with failure reasons
6. **Separate permanent failures**: Move unrecoverable logs to separate storage
7. **Test recovery procedures**: Regularly validate DLQ reprocessing

## Conclusion

Dead letter queues are essential for reliable log delivery in Kubernetes. They prevent data loss during downstream failures and provide a mechanism for recovering from transient issues. Implement DLQs with appropriate retry logic, monitoring, and reprocessing capabilities to ensure no logs are lost, even during extended outages. Remember that DLQs are a safety net, not a replacement for addressing root causes of delivery failures.
