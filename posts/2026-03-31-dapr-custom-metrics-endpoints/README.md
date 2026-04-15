# How to Configure Custom Metrics Endpoints in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Metric, Prometheus, Configuration, Custom

Description: Learn how to configure and customize Dapr metrics endpoints including port selection, metric filtering, and exposing custom application metrics alongside Dapr sidecar metrics.

---

## Overview

Dapr exposes a Prometheus-compatible metrics endpoint on each sidecar. While the default configuration works for most cases, you may need to customize the metrics port, filter specific metrics, or add your own application metrics to the same endpoint. This guide covers all three scenarios.

## Default Metrics Endpoint

By default, Dapr exposes metrics on port `9090`. Verify it is accessible:

```bash
# Port-forward the Dapr sidecar metrics port
kubectl port-forward deployment/order-service 9090:9090

# Check metrics are available
curl http://localhost:9090/metrics | grep "dapr_"
```

## Changing the Metrics Port

Change the metrics port to avoid conflicts with application metrics:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/app-port: "8080"
  dapr.io/metrics-port: "9091"
```

## Configuring Metrics via the Configuration CRD

Enable metrics and set options via the Dapr Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: custom-metrics-config
  namespace: default
spec:
  metrics:
    enabled: true
    rules:
      - name: dapr_http_server_request_count
        labels:
          - name: app_id
          - name: status_code
          - name: method
      - name: dapr_resiliency_activations_total
        labels:
          - name: app_id
          - name: policy
          - name: target
```

## Exposing Custom Application Metrics on a Separate Port

For Node.js services, expose custom Prometheus metrics alongside Dapr:

```javascript
const promClient = require('prom-client');
const express = require('express');

// Create custom metrics
const ordersProcessed = new promClient.Counter({
  name: 'orders_processed_total',
  help: 'Total number of orders processed',
  labelNames: ['status', 'region']
});

const orderValue = new promClient.Histogram({
  name: 'order_value_usd',
  help: 'Distribution of order values in USD',
  buckets: [10, 50, 100, 500, 1000]
});

// Expose on port 8081 (separate from Dapr's port 9090)
const metricsApp = express();
metricsApp.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.send(await promClient.register.metrics());
});
metricsApp.listen(8081, () => console.log('App metrics on :8081'));

// Use in business logic
async function processOrder(order) {
  try {
    await saveOrder(order);
    ordersProcessed.inc({ status: 'success', region: order.region });
    orderValue.observe(order.totalUsd);
  } catch (err) {
    ordersProcessed.inc({ status: 'error', region: order.region });
    throw err;
  }
}
```

## Configuring Prometheus to Scrape Both Endpoints

Scrape both Dapr sidecar metrics (9090) and application metrics (8081):

```yaml
scrape_configs:
  - job_name: dapr-sidecar
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_enabled]
        action: keep
        regex: "true"
      - source_labels: [__meta_kubernetes_pod_ip]
        replacement: "${1}:9090"
        target_label: __address__
    metrics_path: /metrics

  - job_name: dapr-app-metrics
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_enabled]
        action: keep
        regex: "true"
      - source_labels: [__meta_kubernetes_pod_ip]
        replacement: "${1}:8081"
        target_label: __address__
    metrics_path: /metrics
```

## Validating Custom Metrics

Check that custom metrics appear in Prometheus:

```bash
# Query custom order metrics
curl -s "http://prometheus:9090/api/v1/query?query=orders_processed_total" \
  | jq '.data.result[] | {service: .metric.job, value: .value[1]}'
```

## Summary

Customizing Dapr metrics endpoints involves setting the metrics port via annotations, configuring label cardinality through the Configuration CRD, and optionally exposing additional application metrics on a separate port. Scraping both Dapr sidecar and application metrics with Prometheus gives you a complete picture of service behavior that combines infrastructure-level Dapr metrics with business-level application metrics.
