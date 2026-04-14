# How to Send Dapr Metrics to Elastic Observability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Elasticsearch, Elastic, Metric, Observability

Description: Learn how to send Dapr Prometheus metrics to Elastic Observability using Elastic Agent or Metricbeat for unified metrics, logs, and traces in Kibana.

---

## Overview

Elastic Observability combines metrics, logs, and traces in a single platform. Sending Dapr metrics to Elastic allows you to correlate service performance data from Dapr sidecars with application logs and distributed traces in Kibana, providing a unified observability experience.

## Enabling Dapr Metrics

Enable the Prometheus endpoint on Dapr sidecars:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-elastic-config
spec:
  metrics:
    enabled: true
```

```yaml
annotations:
  dapr.io/config: "dapr-elastic-config"
  dapr.io/enable-metrics: "true"
  dapr.io/metrics-port: "9090"
```

## Option 1: Using Elastic Agent with Prometheus Input

Deploy Elastic Agent in Kubernetes and configure a Prometheus integration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: elastic-agent-config
  namespace: elastic-system
data:
  agent.yml: |
    outputs:
      default:
        type: elasticsearch
        hosts:
          - https://elasticsearch.elastic-system.svc:9200
        username: elastic
        password: ${ELASTIC_PASSWORD}
        ssl.certificate_authorities:
          - /etc/elastic-agent/certs/ca.crt

    inputs:
      - type: prometheus/metrics
        streams:
          - data_stream:
              dataset: prometheus.collector
              namespace: dapr
              type: metrics
            period: 15s
            hosts:
              - http://order-service.default.svc:9090
            metrics_path: /metrics
        processors:
          - add_kubernetes_metadata:
              host: ${NODE_NAME}
```

## Option 2: Using Metricbeat with Prometheus Module

Configure Metricbeat to scrape Dapr metrics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: metricbeat-config
data:
  metricbeat.yml: |
    metricbeat.modules:
      - module: prometheus
        period: 15s
        metricsets: ["collector"]
        hosts:
          - "order-service.default.svc:9090"
          - "payment-service.default.svc:9090"
        metrics_path: /metrics
        processors:
          - add_fields:
              fields:
                service: dapr

    output.elasticsearch:
      hosts:
        - "https://elasticsearch.elastic-system.svc:9200"
      username: "elastic"
      password: "${ELASTIC_PASSWORD}"
      ssl.certificate_authorities: ["/etc/metricbeat/certs/ca.crt"]
      index: "dapr-metrics-%{+yyyy.MM.dd}"
```

## Viewing Dapr Metrics in Kibana

Query Dapr metrics in Kibana using KQL:

```text
# All Dapr metrics in last hour
data_stream.type: "metrics" AND prometheus.labels.app_id: "order-service"

# High latency events
prometheus.metrics.dapr_http_server_latency_sum > 1000
```

Use the Kibana Lens visualization to build charts:

1. Open Kibana Lens
2. Select the `metrics-*` index pattern
3. Filter by `prometheus.namespace: dapr`
4. Create a metric visualization for `dapr_http_server_request_count`

## Creating a Kibana Dashboard for Dapr

Build a TSVB (Time Series Visual Builder) dashboard:

```json
{
  "title": "Dapr Service Metrics",
  "type": "metrics",
  "params": {
    "id": "dapr-overview",
    "series": [
      {
        "id": "request-rate",
        "label": "Request Rate",
        "metrics": [
          {
            "type": "avg",
            "field": "prometheus.metrics.dapr_http_server_request_count"
          }
        ],
        "split_mode": "terms",
        "terms_field": "prometheus.labels.app_id"
      }
    ]
  }
}
```

## Setting Up Elastic Alerts for Dapr

Create an Elasticsearch alert rule in Kibana for Dapr resiliency activations:

```bash
curl -X POST "http://kibana:5601/api/alerting/rule" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dapr High Resiliency Rate",
    "rule_type_id": "metrics.alert.threshold",
    "params": {
      "criteria": [{
        "aggType": "rate",
        "metric": "prometheus.metrics.dapr_resiliency_activations_total",
        "comparator": ">",
        "threshold": [0.1],
        "timeSize": 5,
        "timeUnit": "m"
      }]
    },
    "actions": [{
      "id": "slack-connector",
      "group": "metrics.threshold.fired",
      "params": {
        "message": "Dapr resiliency activation rate is high. Check service health."
      }
    }]
  }'
```

## Summary

Elastic Observability provides a unified platform for Dapr metrics, logs, and traces. Use Elastic Agent or Metricbeat with the Prometheus module to scrape Dapr sidecar metrics, index them in Elasticsearch, and visualize them in Kibana alongside application logs and distributed traces. This unified view simplifies root cause analysis for Dapr service incidents.
