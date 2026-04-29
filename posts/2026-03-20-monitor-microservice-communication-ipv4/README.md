# How to Monitor Microservice Communication over IPv4 Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microservice, IPv4, Monitoring, Prometheus, Jaeger, Service Mesh, Observability

Description: Monitor inter-service TCP/HTTP communication over IPv4 using Prometheus metrics, distributed tracing with Jaeger, and service mesh observability tools like Istio.

## Introduction

Microservices communicate over IPv4 TCP, and failures - latency spikes, connection resets, retries - are hard to diagnose without proper instrumentation. Combining metrics, traces, and network-level visibility gives a complete picture.

## Prometheus Node Exporter - Network Metrics

```yaml
# prometheus.yml scrape config

scrape_configs:
  - job_name: node
    static_configs:
      - targets:
          - 10.0.0.10:9100
          - 10.0.0.11:9100
          - 10.0.0.12:9100
```

Key metrics to alert on:
```promql
# TCP connection states per host
node_netstat_Tcp_CurrEstab

# Retransmissions
rate(node_netstat_Tcp_RetransSegs[5m])

# Dropped packets
rate(node_network_receive_drop_total{device="eth0"}[5m]) > 0
```

## HTTP Client Instrumentation (Node.js)

```javascript
const http = require('http');
const { Histogram, Counter } = require('prom-client');

const requestDuration = new Histogram({
    name: 'http_client_request_duration_seconds',
    help: 'Duration of HTTP requests to downstream services',
    labelNames: ['target_ip', 'method', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

const errorCounter = new Counter({
    name: 'http_client_errors_total',
    help: 'Total HTTP client errors',
    labelNames: ['target_ip', 'error_code'],
});

async function callService(targetIp, port, path) {
    const end = requestDuration.startTimer({ target_ip: targetIp });
    return new Promise((resolve, reject) => {
        const req = http.get({ host: targetIp, port, path }, (res) => {
            end({ method: 'GET', status: res.statusCode });
            resolve(res.statusCode);
        });
        req.on('error', (err) => {
            errorCounter.inc({ target_ip: targetIp, error_code: err.code });
            reject(err);
        });
    });
}
```

## Distributed Tracing with OpenTelemetry

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');

// Jaeger accepts OTLP natively on port 4318 (HTTP) / 4317 (gRPC).
// The legacy @opentelemetry/exporter-jaeger package was deprecated in 2024.
const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
        url: 'http://10.0.0.20:4318/v1/traces',
    }),
    instrumentations: [new HttpInstrumentation()],
});
sdk.start();
```

## Istio Service Mesh Telemetry

```yaml
# Enable Prometheus metrics for the mesh
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
```

```bash
# Query Istio metrics (promtool query instant requires a server URL)
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'istio_request_duration_milliseconds_bucket{destination_workload="order-service"}'
```

## TCP Connection Monitoring with ss

```bash
# Watch established connections between microservices
watch -n2 "ss -tnp | grep ESTABLISHED | awk '{print \$5}' | sort | uniq -c | sort -rn"

# Count connections per destination IP
ss -tn state established | awk 'NR>1{print $5}' | \
  cut -d: -f1 | sort | uniq -c | sort -rn
```

## Alertmanager Rules

```yaml
groups:
  - name: microservice_network
    rules:
      - alert: HighTCPRetransmitRate
        expr: rate(node_netstat_Tcp_RetransSegs[5m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High TCP retransmit rate on {{ $labels.instance }}"

      - alert: ServiceLatencyHigh
        expr: histogram_quantile(0.99, rate(http_client_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: critical
```

## Conclusion

Effective microservice network monitoring combines Prometheus for metrics, distributed tracing (Jaeger/Zipkin) for request flows, and service mesh telemetry for aggregate stats. Instrument HTTP clients to record per-IP latency and error metrics so you can quickly identify which IPv4 endpoint is misbehaving.
