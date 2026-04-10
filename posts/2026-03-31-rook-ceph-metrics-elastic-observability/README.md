# How to Set Up Ceph Metrics in Elastic Observability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Elasticsearch, Elastic, Observability

Description: Learn how to collect and visualize Ceph cluster metrics in Elastic Observability using Metricbeat's Prometheus module and Kibana dashboards.

---

## Overview

Elastic Observability unifies metrics, logs, and traces in a single platform. For Ceph monitoring, you can use Metricbeat with the Prometheus module to scrape the Ceph manager metrics endpoint, or use the OpenTelemetry Collector to forward metrics to Elasticsearch. This guide covers the Metricbeat approach with Kibana dashboard creation.

## Step 1 - Enable the Ceph Prometheus Endpoint

```bash
# Enable the Prometheus module on Ceph manager
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- ceph mgr module enable prometheus

# Expose as a Kubernetes service for external scraping
kubectl -n rook-ceph expose deploy/rook-ceph-mgr-a \
  --name=ceph-mgr-prometheus \
  --port=9283 \
  --type=ClusterIP
```

## Step 2 - Deploy Metricbeat with the Prometheus Module

```yaml
# metricbeat-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: metricbeat
  namespace: elastic-system
spec:
  selector:
    matchLabels:
      app: metricbeat
  template:
    metadata:
      labels:
        app: metricbeat
    spec:
      containers:
        - name: metricbeat
          image: docker.elastic.co/beats/metricbeat:8.12.0
          volumeMounts:
            - name: config
              mountPath: /usr/share/metricbeat/metricbeat.yml
              subPath: metricbeat.yml
      volumes:
        - name: config
          configMap:
            name: metricbeat-config
```

## Step 3 - Configure the Metricbeat Prometheus Module

```yaml
# metricbeat-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: metricbeat-config
  namespace: elastic-system
data:
  metricbeat.yml: |
    metricbeat.modules:
      - module: prometheus
        metricsets: ["collector"]
        enabled: true
        period: 30s
        hosts:
          - "rook-ceph-mgr.rook-ceph.svc.cluster.local:9283"
        metrics_path: /metrics
        use_types: true
        rate_counters: true
        metrics_filters:
          include:
            - "ceph_health_status"
            - "ceph_osd_up"
            - "ceph_osd_in"
            - "ceph_pool_bytes_used"
            - "ceph_pool_max_avail"
            - "ceph_mon_quorum_status"
            - "ceph_osd_apply_latency_ms"
        processors:
          - add_fields:
              target: labels
              fields:
                cluster: "prod-ceph"

    output.elasticsearch:
      hosts: ["https://elasticsearch.elastic-system.svc.cluster.local:9200"]
      username: "${ELASTIC_USER}"
      password: "${ELASTIC_PASSWORD}"
      index: "metricbeat-ceph-%{+yyyy.MM.dd}"
```

## Step 4 - Create Index Template and Lifecycle Policy

```bash
# Create an ILM policy for Ceph metrics
curl -X PUT "https://elasticsearch:9200/_ilm/policy/ceph-metrics-policy" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "actions": {
            "rollover": {
              "max_size": "5gb",
              "max_age": "7d"
            }
          }
        },
        "warm": {
          "min_age": "7d",
          "actions": {
            "shrink": {"number_of_shards": 1},
            "forcemerge": {"max_num_segments": 1}
          }
        },
        "delete": {
          "min_age": "30d",
          "actions": {"delete": {}}
        }
      }
    }
  }'
```

## Step 5 - Build Kibana Dashboards

Use Kibana Lens to create visualizations. Here is an example Elasticsearch query in the Dev Tools Console:

```bash
# In Kibana Dev Tools console
GET metricbeat-ceph-*/_search
{
  "query": {
    "bool": {
      "must": [
        {"exists": {"field": "prometheus.metrics.ceph_health_status"}},
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ]
    }
  },
  "aggs": {
    "health_over_time": {
      "date_histogram": {
        "field": "@timestamp",
        "fixed_interval": "5m"
      },
      "aggs": {
        "avg_health": {"avg": {"field": "prometheus.metrics.ceph_health_status"}}
      }
    }
  }
}
```

## Step 6 - Set Up Kibana Alerting Rules

```bash
# Create an alert via Kibana API
curl -X POST "https://kibana:5601/api/alerting/rule" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:password \
  -d '{
    "name": "Ceph Health Degraded",
    "rule_type_id": ".index-threshold",
    "consumer": "stackAlerts",
    "schedule": {"interval": "5m"},
    "params": {
      "index": "metricbeat-ceph-*",
      "timeField": "@timestamp",
      "groupBy": "all",
      "aggType": "avg",
      "aggField": "prometheus.metrics.ceph_health_status",
      "threshold": [0],
      "thresholdComparator": ">",
      "timeWindowSize": 5,
      "timeWindowUnit": "m"
    }
  }'
```

## Summary

Elastic Observability integrates with Ceph by deploying Metricbeat with the Prometheus module to scrape the Ceph manager metrics endpoint. An ILM policy manages long-term storage efficiently, and Kibana Lens provides flexible dashboards. The Kibana alerting engine sends notifications when Ceph health degrades, completing a full observability pipeline on the Elastic Stack.
