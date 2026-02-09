# How to Use Prometheus Pushgateway for Kubernetes Batch Job Metrics Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Kubernetes, Monitoring

Description: Learn how to configure Prometheus Pushgateway to collect metrics from short-lived Kubernetes batch jobs and CronJobs that finish before Prometheus can scrape them.

---

Prometheus excels at scraping long-running services, but short-lived Kubernetes jobs present a challenge. A batch job might complete its work and terminate before Prometheus scrapes its metrics. Prometheus Pushgateway solves this by letting jobs push their metrics before terminating, ensuring you capture performance data from every job execution.

This guide shows you how to deploy Pushgateway in Kubernetes, instrument batch jobs to push metrics, and configure Prometheus to collect them.

## Understanding the Pushgateway Pattern

Unlike normal Prometheus scraping where Prometheus pulls metrics from targets, Pushgateway reverses the flow. Jobs push their metrics to Pushgateway, which holds them until Prometheus scrapes. This works perfectly for:

- Kubernetes Jobs and CronJobs
- Batch processing scripts
- Scheduled maintenance tasks
- Migration scripts

The key limitation: Pushgateway stores the last pushed value for each metric, making it unsuitable for frequently changing metrics.

## Deploying Pushgateway in Kubernetes

Deploy Pushgateway as a service in your cluster:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus-pushgateway
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus-pushgateway
  template:
    metadata:
      labels:
        app: prometheus-pushgateway
    spec:
      containers:
      - name: pushgateway
        image: prom/pushgateway:v1.6.2
        ports:
        - containerPort: 9091
          name: http
        args:
        - --web.listen-address=:9091
        - --web.telemetry-path=/metrics
        - --persistence.file=/data/pushgateway.data
        - --persistence.interval=5m
        volumeMounts:
        - name: storage
          mountPath: /data
        livenessProbe:
          httpGet:
            path: /-/healthy
            port: 9091
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /-/ready
            port: 9091
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: storage
        persistentVolumeClaim:
          claimName: pushgateway-storage
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pushgateway-storage
  namespace: monitoring
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: prometheus-pushgateway
  namespace: monitoring
  labels:
    app: prometheus-pushgateway
spec:
  type: ClusterIP
  ports:
  - port: 9091
    targetPort: 9091
    name: http
  selector:
    app: prometheus-pushgateway
```

The persistence configuration ensures metrics survive pod restarts.

## Configuring Prometheus to Scrape Pushgateway

Add Pushgateway as a scrape target:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    scrape_configs:
    - job_name: 'pushgateway'
      honor_labels: true  # Critical: preserves job labels from pushed metrics
      static_configs:
      - targets: ['prometheus-pushgateway.monitoring.svc.cluster.local:9091']

      metric_relabel_configs:
      # Add pushgateway instance label
      - source_labels: [__address__]
        target_label: pushgateway_instance
```

The `honor_labels: true` setting is crucial. It preserves the job and instance labels that batch jobs push with their metrics.

## Instrumenting a Simple Bash Script Job

Create a Kubernetes Job that pushes metrics from a bash script:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: backup-job
  namespace: production
spec:
  template:
    metadata:
      labels:
        app: backup-job
    spec:
      restartPolicy: Never
      containers:
      - name: backup
        image: bash:5.1
        env:
        - name: PUSHGATEWAY_URL
          value: "http://prometheus-pushgateway.monitoring.svc.cluster.local:9091"
        command:
        - /bin/bash
        - -c
        - |
          #!/bin/bash
          set -e

          JOB_NAME="backup_job"
          INSTANCE="${HOSTNAME}"

          # Record start time
          START_TIME=$(date +%s)

          # Push job start metric
          cat <<EOF | curl --data-binary @- ${PUSHGATEWAY_URL}/metrics/job/${JOB_NAME}/instance/${INSTANCE}
          # TYPE backup_job_started gauge
          backup_job_started{job="${JOB_NAME}"} ${START_TIME}
          EOF

          # Simulate backup work
          echo "Starting backup..."
          RECORDS_PROCESSED=0
          RECORDS_FAILED=0

          for i in {1..1000}; do
            # Simulate processing with occasional failures
            if [ $((RANDOM % 100)) -lt 5 ]; then
              RECORDS_FAILED=$((RECORDS_FAILED + 1))
            else
              RECORDS_PROCESSED=$((RECORDS_PROCESSED + 1))
            fi

            # Report progress every 100 records
            if [ $((i % 100)) -eq 0 ]; then
              cat <<EOF | curl --data-binary @- ${PUSHGATEWAY_URL}/metrics/job/${JOB_NAME}/instance/${INSTANCE}
          # TYPE backup_records_processed counter
          backup_records_processed{job="${JOB_NAME}"} ${RECORDS_PROCESSED}
          # TYPE backup_records_failed counter
          backup_records_failed{job="${JOB_NAME}"} ${RECORDS_FAILED}
          EOF
            fi
          done

          # Calculate duration
          END_TIME=$(date +%s)
          DURATION=$((END_TIME - START_TIME))

          # Push final metrics
          cat <<EOF | curl --data-binary @- ${PUSHGATEWAY_URL}/metrics/job/${JOB_NAME}/instance/${INSTANCE}
          # TYPE backup_job_duration_seconds gauge
          backup_job_duration_seconds{job="${JOB_NAME}"} ${DURATION}
          # TYPE backup_records_processed counter
          backup_records_processed{job="${JOB_NAME}"} ${RECORDS_PROCESSED}
          # TYPE backup_records_failed counter
          backup_records_failed{job="${JOB_NAME}"} ${RECORDS_FAILED}
          # TYPE backup_job_success gauge
          backup_job_success{job="${JOB_NAME}"} 1
          # TYPE backup_job_last_completion_timestamp gauge
          backup_job_last_completion_timestamp{job="${JOB_NAME}"} ${END_TIME}
          EOF

          echo "Backup completed successfully"
```

This job pushes metrics at key points: start, during progress, and at completion.

## Instrumenting a Python Batch Job

For Python jobs, use the Prometheus client library:

```python
# requirements.txt
prometheus-client==0.19.0

# backup_script.py
import time
import os
from prometheus_client import CollectorRegistry, Gauge, Counter, push_to_gateway

# Configuration
PUSHGATEWAY_URL = os.getenv('PUSHGATEWAY_URL', 'localhost:9091')
JOB_NAME = 'python_backup_job'
INSTANCE = os.getenv('HOSTNAME', 'unknown')

# Create registry for this job
registry = CollectorRegistry()

# Define metrics
job_duration = Gauge(
    'backup_job_duration_seconds',
    'Duration of backup job in seconds',
    registry=registry
)

records_processed = Counter(
    'backup_records_processed',
    'Number of records processed',
    registry=registry
)

records_failed = Counter(
    'backup_records_failed',
    'Number of records that failed processing',
    registry=registry
)

job_success = Gauge(
    'backup_job_success',
    'Whether the job succeeded (1) or failed (0)',
    registry=registry
)

job_last_completion = Gauge(
    'backup_job_last_completion_timestamp',
    'Timestamp of last job completion',
    registry=registry
)

def push_metrics():
    """Push current metrics to Pushgateway."""
    try:
        push_to_gateway(
            PUSHGATEWAY_URL,
            job=JOB_NAME,
            registry=registry,
            grouping_key={'instance': INSTANCE}
        )
    except Exception as e:
        print(f"Failed to push metrics: {e}")

def process_record(record):
    """Process a single record."""
    # Simulate processing
    time.sleep(0.01)

    # Simulate occasional failures
    import random
    if random.random() < 0.05:
        records_failed.inc()
        raise Exception(f"Failed to process record {record}")

    records_processed.inc()

def main():
    start_time = time.time()

    try:
        print("Starting backup job...")

        # Process records
        total_records = 1000
        for i in range(total_records):
            try:
                process_record(i)
            except Exception as e:
                print(f"Error: {e}")

            # Push metrics periodically
            if (i + 1) % 100 == 0:
                push_metrics()
                print(f"Processed {i + 1}/{total_records} records")

        # Job succeeded
        job_success.set(1)
        print("Backup completed successfully")

    except Exception as e:
        print(f"Job failed: {e}")
        job_success.set(0)

    finally:
        # Record duration and completion time
        duration = time.time() - start_time
        job_duration.set(duration)
        job_last_completion.set(time.time())

        # Push final metrics
        push_metrics()
        print(f"Job completed in {duration:.2f} seconds")

if __name__ == '__main__':
    main()
```

Deploy as a Kubernetes Job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: python-backup-job
  namespace: production
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: backup
        image: python:3.11-slim
        env:
        - name: PUSHGATEWAY_URL
          value: "prometheus-pushgateway.monitoring.svc.cluster.local:9091"
        command:
        - /bin/bash
        - -c
        - |
          pip install prometheus-client
          python /scripts/backup_script.py
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      volumes:
      - name: scripts
        configMap:
          name: backup-scripts
```

## Instrumenting CronJobs

For recurring jobs, track execution history:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: data-cleanup-job
  namespace: production
spec:
  schedule: "0 2 * * *"  # Run at 2 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
          - name: cleanup
            image: python:3.11-slim
            env:
            - name: PUSHGATEWAY_URL
              value: "prometheus-pushgateway.monitoring.svc.cluster.local:9091"
            - name: JOB_NAME
              value: "data_cleanup_job"
            command:
            - python
            - /scripts/cleanup.py
```

The cleanup script includes tracking:

```python
from prometheus_client import CollectorRegistry, Gauge, Counter, Histogram, push_to_gateway
import time
import os

registry = CollectorRegistry()

# Track execution timing
execution_duration = Histogram(
    'cleanup_execution_duration_seconds',
    'Time spent executing cleanup',
    buckets=[10, 30, 60, 120, 300, 600],
    registry=registry
)

# Track items cleaned
items_deleted = Counter(
    'cleanup_items_deleted_total',
    'Number of items deleted',
    ['item_type'],
    registry=registry
)

# Track last execution
last_execution_timestamp = Gauge(
    'cleanup_last_execution_timestamp',
    'Timestamp of last execution',
    registry=registry
)

last_execution_success = Gauge(
    'cleanup_last_execution_success',
    'Whether last execution succeeded',
    registry=registry
)

@execution_duration.time()
def run_cleanup():
    # Cleanup logic here
    items_deleted.labels(item_type='old_logs').inc(150)
    items_deleted.labels(item_type='temp_files').inc(75)
    items_deleted.labels(item_type='cache').inc(200)

if __name__ == '__main__':
    try:
        run_cleanup()
        last_execution_success.set(1)
    except Exception as e:
        print(f"Cleanup failed: {e}")
        last_execution_success.set(0)
    finally:
        last_execution_timestamp.set(time.time())
        push_to_gateway(
            os.getenv('PUSHGATEWAY_URL'),
            job=os.getenv('JOB_NAME'),
            registry=registry
        )
```

## Creating Alerts for Batch Job Failures

Alert when jobs fail or stop running:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: batch-job-alerts
  namespace: monitoring
spec:
  groups:
  - name: batch_jobs
    interval: 1m
    rules:
    # Alert when job fails
    - alert: BatchJobFailed
      expr: |
        backup_job_success == 0
      for: 1m
      labels:
        severity: warning
      annotations:
        summary: "Batch job {{ $labels.job }} failed"
        description: "Job {{ $labels.job }} on instance {{ $labels.instance }} failed"

    # Alert when job hasn't run recently
    - alert: BatchJobNotRunning
      expr: |
        time() - backup_job_last_completion_timestamp > 86400  # 24 hours
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Batch job {{ $labels.job }} hasn't run recently"
        description: "Job {{ $labels.job }} last ran {{ $value | humanizeDuration }} ago"

    # Alert on high failure rate
    - alert: BatchJobHighFailureRate
      expr: |
        (
          backup_records_failed
          /
          (backup_records_processed + backup_records_failed)
        ) > 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Batch job {{ $labels.job }} has high failure rate"
        description: "Job {{ $labels.job }} has {{ $value | humanizePercentage }} failure rate"
```

## Cleaning Up Old Metrics

Pushgateway accumulates metrics from finished jobs. Clean them up periodically:

```bash
# Delete metrics for a specific job
curl -X DELETE http://prometheus-pushgateway.monitoring.svc.cluster.local:9091/metrics/job/backup_job/instance/backup-pod-xyz

# Delete all metrics for a job (all instances)
curl -X DELETE http://prometheus-pushgateway.monitoring.svc.cluster.local:9091/metrics/job/backup_job
```

Automate cleanup with a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: pushgateway-cleanup
  namespace: monitoring
spec:
  schedule: "0 0 * * *"  # Daily cleanup
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
          - name: cleanup
            image: curlimages/curl:latest
            command:
            - /bin/sh
            - -c
            - |
              # Delete metrics older than 7 days
              # This is a simplified example
              curl -X DELETE http://prometheus-pushgateway.monitoring.svc.cluster.local:9091/metrics/job/old_job_name
```

## Querying Batch Job Metrics

Query job metrics in Prometheus:

```promql
# Latest job duration
backup_job_duration_seconds

# Job success rate over time
avg_over_time(backup_job_success[24h])

# Records processed per job run
backup_records_processed

# Time since last successful run
time() - backup_job_last_completion_timestamp{backup_job_success="1"}

# Failure rate
backup_records_failed / (backup_records_processed + backup_records_failed)
```

## Conclusion

Prometheus Pushgateway bridges the gap between Prometheus scraping model and short-lived batch jobs. By pushing metrics before termination, Kubernetes Jobs and CronJobs can provide complete observability despite their ephemeral nature. Instrument your batch workloads with start times, progress counters, duration metrics, and success indicators to gain full visibility into batch processing pipelines.

Combine Pushgateway with proper alerting on job failures and staleness to ensure your batch processes run reliably. The result is comprehensive monitoring that covers both long-running services and short-lived jobs in your Kubernetes cluster.
