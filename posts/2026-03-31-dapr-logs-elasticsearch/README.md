# How to Send Dapr Logs to Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Elasticsearch, Logging, Observability, Kubernetes

Description: Learn how to ship Dapr sidecar and application logs to Elasticsearch using Fluentd or Fluent Bit for centralized log management and search.

---

## Overview

Centralizing Dapr logs in Elasticsearch enables powerful search, aggregation, and alerting across your microservices. Dapr sidecars emit structured JSON logs that are ideal for indexing in Elasticsearch when collected with a log shipper like Fluent Bit.

## Enabling JSON Logging in Dapr

Configure Dapr to emit structured JSON logs for easier Elasticsearch indexing:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-logging-config
spec:
  logging:
    apiLogging:
      enabled: true
      obfuscateURLs: false
      omitHealthChecks: true
```

Apply to your deployment:

```yaml
annotations:
  dapr.io/config: "dapr-logging-config"
  dapr.io/log-as-json: "true"
  dapr.io/log-level: "info"
```

## Deploying Fluent Bit as a DaemonSet

Deploy Fluent Bit to collect logs from all pods:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      serviceAccountName: fluent-bit
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:2.2
          volumeMounts:
            - name: varlog
              mountPath: /var/log
            - name: config
              mountPath: /fluent-bit/etc/
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: config
          configMap:
            name: fluent-bit-config
```

## Configuring Fluent Bit for Dapr Logs

Create the Fluent Bit ConfigMap to parse and forward Dapr logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Parsers_File parsers.conf

    [INPUT]
        Name tail
        Path /var/log/containers/*daprd*.log
        multiline.parser docker, cri
        Tag dapr.*
        Mem_Buf_Limit 5MB
        Skip_Long_Lines On

    [FILTER]
        Name kubernetes
        Match dapr.*
        Kube_URL https://kubernetes.default.svc:443
        Merge_Log On
        Keep_Log Off

    [OUTPUT]
        Name es
        Match dapr.*
        Host elasticsearch.logging.svc
        Port 9200
        Suppress_Type_Name On
        HTTP_User elastic
        HTTP_Passwd ${ELASTIC_PASSWORD}
        TLS On
        TLS.Verify Off
        Logstash_Format On
        Logstash_Prefix dapr-logs
```

## Searching Dapr Logs in Kibana

Once logs are indexed, use Kibana Discover to search Dapr logs:

```bash
# Example KQL queries in Kibana
app_id:"order-service" AND level:"error"
app_id:"order-service" AND msg:"circuit breaker"
kubernetes.namespace_name:"production" AND level:"warning"
```

## Creating an Index Template for Dapr Logs

Define an Elasticsearch index template for proper field mapping:

```bash
curl -X PUT "http://elasticsearch:9200/_index_template/dapr-logs" \
  -H "Content-Type: application/json" \
  -d '{
    "index_patterns": ["dapr-logs-*"],
    "template": {
      "mappings": {
        "properties": {
          "@timestamp": { "type": "date" },
          "app_id": { "type": "keyword" },
          "level": { "type": "keyword" },
          "msg": { "type": "text" },
          "instance": { "type": "keyword" }
        }
      }
    }
  }'
```

## Setting Up Elasticsearch Watcher Alerts

Create an Elasticsearch Watcher alert for error log spikes:

```bash
# Error rate alert via Elasticsearch Watcher
curl -X PUT "http://elasticsearch:9200/_watcher/watch/dapr-error-rate" \
  -H "Content-Type: application/json" \
  -d '{
    "trigger": { "schedule": { "interval": "1m" } },
    "input": {
      "search": {
        "request": {
          "indices": ["dapr-logs-*"],
          "body": {
            "query": {
              "bool": {
                "filter": [
                  { "term": { "level": "error" } },
                  { "range": { "@timestamp": { "gte": "now-1m" } } }
                ]
              }
            }
          }
        }
      }
    },
    "condition": { "compare": { "ctx.payload.hits.total.value": { "gt": 10 } } },
    "actions": { "log_action": { "logging": { "text": "High Dapr error rate detected" } } }
  }'
```

## Summary

Shipping Dapr logs to Elasticsearch using Fluent Bit provides powerful search, aggregation, and alerting capabilities across your microservice fleet. Enable Dapr JSON logging, deploy Fluent Bit as a DaemonSet, configure it to parse and forward Dapr container logs, and use Kibana to build dashboards and alerts for error patterns and operational insights.
