# How to Forward Ceph Logs to Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Elasticsearch, Logging, ELK Stack, Observability

Description: Forward Rook-managed Ceph daemon logs to Elasticsearch using Fluent Bit for centralized search, analysis, and alerting on cluster events.

---

Elasticsearch provides powerful full-text search and analytics for log data. Forwarding Ceph logs to Elasticsearch enables you to query across all daemons, build dashboards in Kibana, and set up alerting on specific log patterns.

## Prerequisites

- Elasticsearch deployed in the cluster (or accessible externally)
- Fluent Bit or Fluentd available for log shipping

## Deploy Fluent Bit with Elasticsearch Output

Create a Fluent Bit ConfigMap targeting Elasticsearch:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-es-config
  namespace: rook-ceph
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush     5
        Log_Level info

    [INPUT]
        Name   tail
        Path   /var/log/containers/rook-ceph-*.log
        Tag    ceph
        Parser json
        DB     /var/log/flb_ceph.db

    [FILTER]
        Name   record_modifier
        Match  ceph
        Record cluster_name my-ceph-cluster
        Record environment production

    [OUTPUT]
        Name            es
        Match           ceph
        Host            elasticsearch.elastic-system.svc.cluster.local
        Port            9200
        HTTP_User       elastic
        HTTP_Passwd     ${ELASTIC_PASSWORD}
        Logstash_Format On
        Logstash_Prefix ceph-logs
        Suppress_Type_Name On
        Retry_Limit     5
        Replace_Dots    On
        Trace_Error     On
```

Create the DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit-ceph
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      app: fluent-bit-ceph
  template:
    metadata:
      labels:
        app: fluent-bit-ceph
    spec:
      serviceAccountName: fluent-bit
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:2.2
        envFrom:
        - secretRef:
            name: elasticsearch-credentials
        volumeMounts:
        - name: config
          mountPath: /fluent-bit/etc/
        - name: varlog
          mountPath: /var/log
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: fluent-bit-es-config
      - name: varlog
        hostPath:
          path: /var/log
```

## Create Elasticsearch Index Template

Set up an index template to define the Ceph log schema:

```bash
curl -X PUT "http://elasticsearch:9200/_index_template/ceph-logs" \
  -H 'Content-Type: application/json' \
  -d '{
    "index_patterns": ["ceph-logs-*"],
    "template": {
      "settings": {
        "number_of_shards": 2,
        "number_of_replicas": 1
      },
      "mappings": {
        "properties": {
          "@timestamp": {"type": "date"},
          "ceph_daemon": {"type": "keyword"},
          "log": {"type": "text"},
          "cluster_name": {"type": "keyword"}
        }
      }
    }
  }'
```

## Query Ceph Logs in Elasticsearch

Find slow request warnings:

```bash
curl -s "http://elasticsearch:9200/ceph-logs-*/_search" \
  -H 'Content-Type: application/json' \
  -d '{"query": {"match": {"log": "slow request"}}}'
```

## Summary

Forwarding Ceph logs to Elasticsearch with Fluent Bit running as a DaemonSet gives you a searchable, indexed view of all Ceph daemon activity. Adding environment and cluster name labels during forwarding makes it easy to distinguish between multiple clusters in a shared Elasticsearch deployment.
