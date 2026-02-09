# How to Build a KEDA-Driven Auto-Scaling Pipeline for Event-Driven Kubernetes Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: KEDA, Kubernetes, Auto-Scaling, Event-Driven, HPA

Description: Build intelligent auto-scaling pipelines using KEDA to scale Kubernetes workloads based on external metrics like queue depth, database queries, and custom metrics.

---

KEDA (Kubernetes Event-Driven Autoscaling) extends Kubernetes with event-driven scaling capabilities. While the standard Horizontal Pod Autoscaler scales based on CPU and memory, KEDA scales based on external event sources like message queues, databases, and custom metrics. This guide shows you how to build comprehensive auto-scaling pipelines for event-driven workloads.

## Understanding KEDA Architecture

KEDA operates as a Kubernetes operator that extends the HPA with custom metrics. It includes a metrics server that exposes external metrics to Kubernetes and a controller that manages ScaledObject resources. When events arrive in your queue or trigger threshold, KEDA scales your deployment from zero to many pods and back down when idle.

The scale-to-zero capability is particularly powerful. Unlike traditional deployments that always consume resources, KEDA can scale workloads to zero pods when no events are pending. When new events arrive, KEDA rapidly scales up to process them.

KEDA supports dozens of scalers including Kafka, RabbitMQ, Azure Service Bus, AWS SQS, PostgreSQL, Redis, Prometheus, and more. Each scaler knows how to query specific event sources and translate metrics into scaling decisions.

## Installing KEDA

Install KEDA using Helm:

```bash
# Add KEDA Helm repository
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

# Create namespace
kubectl create namespace keda

# Install KEDA
helm install keda kedacore/keda \
  --namespace keda \
  --set prometheus.metricServer.enabled=true \
  --set prometheus.operator.enabled=true

# Verify installation
kubectl get pods -n keda
kubectl get apiservices | grep keda
```

Check that KEDA's custom resource definitions are installed:

```bash
kubectl get crd | grep keda
# Should show:
# scaledobjects.keda.sh
# scaledjobs.keda.sh
# triggerauthentications.keda.sh
```

## Scaling Based on Queue Depth

Create a RabbitMQ-based auto-scaling pipeline:

```yaml
# rabbitmq-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
  namespace: default
spec:
  replicas: 1  # KEDA will manage this
  selector:
    matchLabels:
      app: order-processor
  template:
    metadata:
      labels:
        app: order-processor
    spec:
      containers:
      - name: processor
        image: your-registry/order-processor:latest
        env:
        - name: RABBITMQ_URL
          value: "amqp://rabbitmq:5672"
        - name: QUEUE_NAME
          value: "orders"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
---
# rabbitmq-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: order-processor

  # Scaling policy
  pollingInterval: 10  # Check every 10 seconds
  cooldownPeriod: 30   # Wait 30s before scaling down
  minReplicaCount: 0   # Scale to zero when idle
  maxReplicaCount: 50  # Max 50 pods

  # RabbitMQ trigger
  triggers:
  - type: rabbitmq
    metadata:
      host: "amqp://rabbitmq:5672"
      queueName: "orders"
      queueLength: "10"  # Target 10 messages per pod
      protocol: "auto"
```

The order processor application:

```python
# order_processor.py
import pika
import json
import time
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RABBITMQ_URL = os.getenv('RABBITMQ_URL')
QUEUE_NAME = os.getenv('QUEUE_NAME')

def process_order(order):
    """Process a single order"""
    logger.info(f"Processing order {order['id']}")

    # Simulate processing time
    time.sleep(2)

    # Your business logic here
    # - Validate order
    # - Check inventory
    # - Process payment
    # - Update database

    logger.info(f"Completed order {order['id']}")

def main():
    """Main consumer loop"""
    connection = pika.BlockingConnection(
        pika.URLParameters(RABBITMQ_URL)
    )
    channel = connection.channel()

    # Declare queue (idempotent)
    channel.queue_declare(queue=QUEUE_NAME, durable=True)

    # Prefetch one message at a time
    channel.basic_qos(prefetch_count=1)

    def callback(ch, method, properties, body):
        try:
            order = json.loads(body)
            process_order(order)
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Processing failed: {e}")
            # Reject and requeue
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    channel.basic_consume(
        queue=QUEUE_NAME,
        on_message_callback=callback
    )

    logger.info(f"Waiting for messages on {QUEUE_NAME}")
    channel.start_consuming()

if __name__ == '__main__':
    main()
```

## Scaling with Kafka Consumer Lag

Scale based on Kafka consumer lag:

```yaml
# kafka-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: event-processor-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: event-processor

  pollingInterval: 15
  cooldownPeriod: 60
  minReplicaCount: 1   # Keep at least 1 pod running
  maxReplicaCount: 100

  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka-broker-1:9092,kafka-broker-2:9092
      consumerGroup: event-processor-group
      topic: user-events
      lagThreshold: "100"  # Scale when lag > 100 per pod
      offsetResetPolicy: latest
---
# With authentication
apiVersion: v1
kind: Secret
metadata:
  name: kafka-credentials
type: Opaque
stringData:
  sasl: "plaintext"
  username: "kafka-user"
  password: "kafka-password"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: kafka-trigger-auth
spec:
  secretTargetRef:
  - parameter: sasl
    name: kafka-credentials
    key: sasl
  - parameter: username
    name: kafka-credentials
    key: username
  - parameter: password
    name: kafka-credentials
    key: password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: secure-kafka-scaler
spec:
  scaleTargetRef:
    name: event-processor
  triggers:
  - type: kafka
    authenticationRef:
      name: kafka-trigger-auth
    metadata:
      bootstrapServers: kafka-broker:9093
      consumerGroup: event-processor-group
      topic: user-events
      lagThreshold: "100"
```

## Multi-Trigger Scaling

Scale based on multiple metrics simultaneously:

```yaml
# multi-trigger-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: api-worker-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: api-worker

  pollingInterval: 10
  cooldownPeriod: 30
  minReplicaCount: 2
  maxReplicaCount: 100

  # Multiple triggers (OR logic - any trigger can cause scaling)
  triggers:
  # Scale based on SQS queue depth
  - type: aws-sqs-queue
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789/api-tasks
      queueLength: "5"
      awsRegion: us-east-1
      identityOwner: operator

  # Also scale based on HTTP request rate
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: http_requests_total
      threshold: "100"
      query: |
        sum(rate(http_requests_total{job="api-gateway"}[1m]))

  # Also scale based on CPU (fallback)
  - type: cpu
    metricType: Utilization
    metadata:
      value: "70"
```

## Database Query-Based Scaling

Scale based on pending database records:

```yaml
# postgresql-scaledobject.yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-credentials
type: Opaque
stringData:
  connection: "postgresql://user:password@postgres:5432/mydb?sslmode=require"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: postgres-trigger-auth
spec:
  secretTargetRef:
  - parameter: connection
    name: postgres-credentials
    key: connection
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: report-generator-scaler
spec:
  scaleTargetRef:
    name: report-generator

  pollingInterval: 30
  cooldownPeriod: 60
  minReplicaCount: 0
  maxReplicaCount: 20

  triggers:
  - type: postgresql
    authenticationRef:
      name: postgres-trigger-auth
    metadata:
      query: "SELECT COUNT(*) FROM reports WHERE status = 'pending'"
      targetQueryValue: "5"  # Scale to handle 5 pending reports per pod
```

The report generator application:

```go
// report_generator.go
package main

import (
    "database/sql"
    "log"
    "os"
    "time"

    _ "github.com/lib/pq"
)

func main() {
    dbURL := os.Getenv("DATABASE_URL")
    db, err := sql.Open("postgres", dbURL)
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    log.Println("Report generator started")

    for {
        // Query for pending reports
        var reportID int
        err := db.QueryRow(`
            SELECT id FROM reports
            WHERE status = 'pending'
            ORDER BY created_at
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        `).Scan(&reportID)

        if err == sql.ErrNoRows {
            // No pending reports, wait before checking again
            time.Sleep(5 * time.Second)
            continue
        }

        if err != nil {
            log.Printf("Query error: %v", err)
            time.Sleep(1 * time.Second)
            continue
        }

        // Process the report
        log.Printf("Generating report %d", reportID)
        err = generateReport(db, reportID)

        if err != nil {
            log.Printf("Report generation failed: %v", err)
            updateReportStatus(db, reportID, "failed")
        } else {
            log.Printf("Report %d completed", reportID)
            updateReportStatus(db, reportID, "completed")
        }
    }
}

func generateReport(db *sql.DB, reportID int) error {
    // Your report generation logic
    time.Sleep(10 * time.Second) // Simulate work
    return nil
}

func updateReportStatus(db *sql.DB, reportID int, status string) {
    _, err := db.Exec(
        "UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2",
        status, reportID,
    )
    if err != nil {
        log.Printf("Failed to update status: %v", err)
    }
}
```

## Custom Metrics with Prometheus

Scale based on custom application metrics:

```yaml
# custom-metrics-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: video-transcoder-scaler
spec:
  scaleTargetRef:
    name: video-transcoder

  pollingInterval: 15
  cooldownPeriod: 120  # Longer cooldown for expensive operations
  minReplicaCount: 0
  maxReplicaCount: 10

  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: pending_video_transcoding_jobs
      threshold: "2"
      query: |
        sum(video_transcode_queue_length{status="pending"})

  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: video_transcode_success_rate
      threshold: "0.95"
      query: |
        sum(rate(video_transcode_total{status="success"}[5m]))
        /
        sum(rate(video_transcode_total[5m]))
```

Expose custom metrics from your application:

```javascript
// video-transcoder/metrics.js
const client = require('prom-client');
const express = require('express');

const register = new client.Registry();

// Custom metric for queue length
const queueLength = new client.Gauge({
  name: 'video_transcode_queue_length',
  help: 'Number of videos waiting to be transcoded',
  labelNames: ['status'],
  registers: [register]
});

// Custom metric for transcoding operations
const transcodeCounter = new client.Counter({
  name: 'video_transcode_total',
  help: 'Total number of transcoding operations',
  labelNames: ['status'],
  registers: [register]
});

// Update queue length periodically
async function updateQueueMetrics() {
  const pendingCount = await getPendingTranscodeCount();
  queueLength.set({ status: 'pending' }, pendingCount);
}

setInterval(updateQueueMetrics, 10000);

// Expose metrics endpoint
const metricsApp = express();
metricsApp.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

metricsApp.listen(9090, () => {
  console.log('Metrics server listening on :9090');
});

module.exports = { transcodeCounter, queueLength };
```

## Advanced Scaling Strategies

Implement complex scaling policies:

```yaml
# advanced-scaling.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: adaptive-processor
spec:
  scaleTargetRef:
    name: adaptive-processor

  pollingInterval: 5
  cooldownPeriod: 30

  # Advanced scaling behavior
  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleDown:
          stabilizationWindowSeconds: 300
          policies:
          - type: Percent
            value: 50
            periodSeconds: 60
          - type: Pods
            value: 2
            periodSeconds: 60
          selectPolicy: Min  # Use most conservative policy
        scaleUp:
          stabilizationWindowSeconds: 0
          policies:
          - type: Percent
            value: 100
            periodSeconds: 30
          - type: Pods
            value: 10
            periodSeconds: 30
          selectPolicy: Max  # Scale up aggressively

  minReplicaCount: 1
  maxReplicaCount: 100

  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka:9092
      consumerGroup: adaptive-group
      topic: events
      lagThreshold: "50"
```

## Monitoring KEDA Performance

Track scaling behavior:

```bash
# Check ScaledObject status
kubectl get scaledobjects

# View detailed scaling status
kubectl describe scaledobject order-processor-scaler

# Check HPA created by KEDA
kubectl get hpa

# View KEDA operator logs
kubectl logs -n keda -l app=keda-operator

# View metrics server logs
kubectl logs -n keda -l app=keda-metrics-apiserver

# Check custom metrics
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1/namespaces/default/s0-rabbitmq-orders" | jq .
```

Create dashboards with Prometheus queries:

```promql
# Current replica count
keda_scaler_active{scaledObject="order-processor-scaler"}

# Scaling events
rate(keda_scaler_errors_total[5m])

# Time spent scaling
histogram_quantile(0.95, rate(keda_scaler_scaling_duration_bucket[5m]))

# External metric value
keda_scaler_metrics_value{metric="s0-rabbitmq-orders"}
```

## Best Practices

Choose appropriate polling intervals. Shorter intervals provide faster scaling but increase load on external systems. Balance responsiveness with resource usage.

Set realistic min and max replica counts. Minimum replicas should handle baseline load. Maximum replicas should consider cluster capacity and cost constraints.

Use longer cooldown periods for expensive operations. Rapid scaling down and up wastes resources. Allow time for metrics to stabilize before scaling down.

Implement proper health checks. KEDA scales based on metrics, but pods must be healthy to process work. Configure liveness and readiness probes correctly.

Monitor scaling lag. Track the time between metric changes and actual scaling. If lag is high, optimize polling intervals and scaling policies.

Test scale-to-zero carefully. Ensure your application handles cold starts gracefully. Consider keeping minimum replicas for latency-sensitive workloads.

## Conclusion

KEDA transforms Kubernetes into a truly event-driven platform by enabling intelligent auto-scaling based on external metrics. By scaling workloads in response to actual demand rather than resource utilization, you can optimize both cost and performance. The ability to scale to zero during idle periods dramatically reduces resource consumption while maintaining the ability to rapidly scale up when events arrive. With support for dozens of event sources and flexible scaling policies, KEDA provides the foundation for efficient, responsive event-driven architectures.
