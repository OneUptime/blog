# How to Monitor Event Flow in Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Monitoring, Pub/Sub, Prometheus, Grafana, Observability

Description: Monitor event flow in Dapr pub/sub systems with Prometheus metrics, distributed tracing, and Grafana dashboards for end-to-end visibility.

---

## Overview

Monitoring event flow in Dapr pub/sub systems requires visibility into publish rates, delivery latency, processing success/failure rates, and consumer lag. Dapr exposes Prometheus metrics for pub/sub operations, which combined with distributed tracing, provide complete end-to-end observability.

## Dapr Pub/Sub Metrics

Enable Prometheus metrics in Dapr:

```yaml
# dapr-config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
spec:
  metrics:
    enabled: true
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://zipkin:9411/api/v2/spans"
```

Key Dapr pub/sub metrics:

| Metric | Description |
|---|---|
| `dapr_component_pubsub_ingress_count` | Messages received by component |
| `dapr_component_pubsub_egress_count` | Messages published by app |
| `dapr_component_pubsub_ingress_latencies` | Processing latency histogram |
| `dapr_component_pubsub_egress_latencies` | Publish latency histogram |

## Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'dapr'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_enabled]
        action: keep
        regex: "true"
      - source_labels: [__meta_kubernetes_pod_ip]
        target_label: __address__
        replacement: "$1:9090"
    metrics_path: /metrics
```

## Grafana Dashboard Queries

Track publish success rate:

```promql
# Pub/Sub success rate
rate(dapr_component_pubsub_egress_count{success="true"}[5m])
/
rate(dapr_component_pubsub_egress_count[5m])
```

Track consumer processing rate:

```promql
# Messages processed per second
rate(dapr_component_pubsub_ingress_count{status="success",topic="OrderPlaced"}[1m])
```

Monitor processing latency P99:

```promql
# 99th percentile processing latency
histogram_quantile(0.99,
  rate(dapr_component_pubsub_ingress_latencies_bucket{topic="OrderPlaced"}[5m])
)
```

## Custom Application Metrics

Add business-level metrics to your event handlers:

```python
from prometheus_client import Counter, Histogram, start_http_server
from flask import Flask, request, jsonify
import time

app = Flask(__name__)

# Custom metrics
orders_processed = Counter(
    'orders_processed_total',
    'Total orders processed',
    ['status', 'region']
)

order_processing_duration = Histogram(
    'order_processing_seconds',
    'Order processing duration',
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0]
)

@app.route('/orders/placed', methods=['POST'])
def handle_order_placed():
    event_data = request.json.get("data", {})
    region = event_data.get("region", "unknown")

    start = time.time()
    try:
        process_order(event_data)
        orders_processed.labels(status="success", region=region).inc()
        return jsonify({"status": "SUCCESS"}), 200
    except Exception as e:
        orders_processed.labels(status="error", region=region).inc()
        return jsonify({"status": "RETRY"}), 500
    finally:
        order_processing_duration.observe(time.time() - start)

def process_order(data: dict):
    print(f"Processing order {data.get('orderId')}")

# Expose metrics on port 8001
start_http_server(8001)
app.run(port=8080)
```

## Distributed Tracing for Event Flow

Dapr automatically propagates trace context through pub/sub messages. View the complete event flow in Jaeger or Zipkin:

```bash
# Start Jaeger for local testing
docker run -d \
  --name jaeger \
  -p 16686:16686 \
  -p 14268:14268 \
  jaegertracing/all-in-one:latest

# Configure Dapr to use Jaeger
kubectl apply -f - <<EOF
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "http://jaeger-collector:4317"
      isSecure: false
      protocol: grpc
EOF
```

## Consumer Lag Monitoring

For Kafka, monitor consumer lag to detect processing bottlenecks:

```bash
# Check consumer group lag
kafka-consumer-groups.sh \
  --bootstrap-server kafka:9092 \
  --describe \
  --group dapr-consumer-group

# Kafka exporter metrics (e.g., danielqsj/kafka_exporter)
kafka_consumergroup_lag{consumergroup="dapr-consumer-group", topic="OrderPlaced"}
```

Grafana alert for consumer lag:

```yaml
groups:
- name: dapr-pubsub
  rules:
  - alert: DaprConsumerLagHigh
    expr: kafka_consumergroup_lag{consumergroup=~"dapr-.*"} > 1000
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Dapr consumer group {{ $labels.consumergroup }} is lagging"
```

## Summary

Complete event flow monitoring in Dapr pub/sub combines Dapr's built-in Prometheus metrics, custom business metrics from handlers, and distributed tracing for end-to-end visibility. Grafana dashboards with success rate, latency, and consumer lag panels provide operational confidence. Setting alerts on consumer lag thresholds enables proactive response to processing bottlenecks before they impact downstream services.
