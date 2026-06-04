# How to Collect Logs from Multiple Kubernetes Clusters into a Central Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Logging, Multi-Cluster, Observability, Log Aggregation

Description: Learn how to centralize log collection from multiple Kubernetes clusters using popular tools like Loki, Elasticsearch, and Fluentd for unified log analysis.

---

Managing logs across multiple Kubernetes clusters creates operational challenges. Each cluster generates logs from applications, system components, and infrastructure, but viewing these logs in isolation makes troubleshooting distributed applications difficult. Centralized log collection solves this by aggregating logs from all clusters into a single backend where you can search, analyze, and correlate events across your entire infrastructure.

In this guide, you'll learn practical approaches to centralize logs from multiple Kubernetes clusters using different popular tools and architectures.

## Understanding Log Collection Architecture

A typical multi-cluster log collection architecture has three layers. The collection layer runs in each Kubernetes cluster and gathers logs from containers, nodes, and system components. The aggregation layer receives logs from all clusters and stores them in a centralized backend. The query layer provides interfaces for searching and analyzing logs.

The key decision is choosing between node-local collection and API-based collection. Node-local agents like Fluentd, Fluent Bit, and Grafana Alloy tail log files on each node and send logs directly to the central backend. API-based collectors can read Pod logs through the Kubernetes API, which avoids privileged node filesystem access but increases API server and kubelet traffic. Most production Kubernetes deployments use node-local collection for lower overhead and better scalability.

## Approach 1: Loki with Grafana Alloy

Grafana Loki provides a cost-effective log aggregation system inspired by Prometheus. It indexes only metadata rather than full text, significantly reducing storage costs compared to Elasticsearch.

Deploy Loki as a central log backend:

```yaml
# loki-values.yaml
deploymentMode: Distributed

loki:
  auth_enabled: true  # Enable multi-tenancy
  tenants:
  - name: cluster-1
    password: "change-me"  # Change per cluster and store securely
  schemaConfig:
    configs:
    - from: 2024-04-01
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: loki_index_
        period: 24h

  storage:
    type: s3
    bucketNames:
      chunks: loki-chunks
      ruler: loki-ruler
      admin: loki-admin
    s3:
      region: us-east-1

  limits_config:
    reject_old_samples: true
    reject_old_samples_max_age: 168h
    ingestion_rate_mb: 50
    ingestion_burst_size_mb: 100

# Scale for multi-cluster
ingester:
  enabled: true
  replicas: 6

querier:
  enabled: true
  replicas: 4
  resources:
    requests:
      cpu: 1
      memory: 2Gi

distributor:
  enabled: true
  replicas: 3

gateway:
  enabled: true
  replicas: 2
  basicAuth:
    enabled: true
  ingress:
    enabled: true
    hosts:
    - host: loki.example.com
```

Deploy Loki:

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm install loki grafana/loki \
  -n logging \
  --create-namespace \
  -f loki-values.yaml
```

Deploy Grafana Alloy in each Kubernetes cluster to collect and forward logs:

```yaml
# alloy-values.yaml
alloy:
  configMap:
    content: |
      discovery.kubernetes "pod" {
        role = "pod"
        selectors {
          role = "pod"
          field = "spec.nodeName=" + coalesce(sys.env("HOSTNAME"), constants.hostname)
        }
      }

      discovery.relabel "pod_logs" {
        targets = discovery.kubernetes.pod.targets

        rule {
          source_labels = ["__meta_kubernetes_namespace"]
          target_label  = "namespace"
        }

        rule {
          source_labels = ["__meta_kubernetes_pod_name"]
          target_label  = "pod"
        }

        rule {
          source_labels = ["__meta_kubernetes_pod_container_name"]
          target_label  = "container"
        }

        rule {
          source_labels = ["__meta_kubernetes_pod_node_name"]
          target_label  = "node_name"
        }
      }

      loki.source.kubernetes "pod_logs" {
        targets    = discovery.relabel.pod_logs.output
        forward_to = [loki.process.pod_logs.receiver]
      }

      loki.process "pod_logs" {
        stage.static_labels {
          values = {
            cluster = "cluster-1",
            region  = "us-east-1",
          }
        }

        forward_to = [loki.write.central.receiver]
      }

      loki.write "central" {
        endpoint {
          url       = "https://loki.example.com/loki/api/v1/push"
          tenant_id = "cluster-1"
          basic_auth {
            username = "cluster-1"
            password = sys.env("LOKI_PASSWORD")
          }
        }
      }

  extraEnv:
  - name: LOKI_PASSWORD
    valueFrom:
      secretKeyRef:
        name: loki-credentials
        key: password
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      memory: 512Mi

controller:
  tolerations:
  - operator: Exists
    effect: NoSchedule
```

Deploy Alloy in each cluster:

```bash
helm install alloy grafana/alloy \
  -n logging \
  --create-namespace \
  -f alloy-values.yaml
```

Query logs from all clusters in Grafana:

```logql
# All errors from cluster-1
{cluster="cluster-1"} |= "error"

# Application logs from specific namespace across all clusters
{namespace="production", app="myapp"}

# Compare error rates between clusters
sum by (cluster) (rate({cluster=~".+"} |= "error" [5m]))

# Find logs containing specific text across all clusters
{cluster=~".+"} |= "database connection failed"
```

## Approach 2: Elasticsearch with Fluent Bit

Elasticsearch provides powerful full-text search capabilities for log analysis. Fluent Bit offers a lightweight alternative to Fluentd with better performance.

Deploy Elasticsearch cluster:

```yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: logs-cluster
  namespace: logging
spec:
  version: 8.12.0
  nodeSets:
  - name: masters
    count: 3
    config:
      node.roles: ["master"]
    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 100Gi
        storageClassName: fast-ssd

  - name: data
    count: 6
    config:
      node.roles: ["data", "ingest"]
    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 1Ti
        storageClassName: fast-ssd
    podTemplate:
      spec:
        containers:
        - name: elasticsearch
          resources:
            requests:
              memory: 16Gi
              cpu: 4
            limits:
              memory: 16Gi

  http:
    tls:
      selfSignedCertificate:
        disabled: false
```

Deploy Fluent Bit in each cluster:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         5
        Daemon        Off
        Log_Level     info
        Parsers_File  parsers.conf
        HTTP_Server   On
        HTTP_Listen   0.0.0.0
        HTTP_Port     2020

    [INPUT]
        Name              tail
        Path              /var/log/containers/*.log
        Parser            cri
        Tag               kube.*
        Refresh_Interval  5
        Mem_Buf_Limit     50MB
        Skip_Long_Lines   On

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Merge_Log           On
        K8S-Logging.Parser  On
        K8S-Logging.Exclude On

    [FILTER]
        Name    modify
        Match   kube.*
        Add     cluster cluster-1
        Add     region us-east-1

    [OUTPUT]
        Name            es
        Match           kube.*
        Host            logs-cluster-es-http.logging.svc
        Port            9200
        HTTP_User       elastic
        HTTP_Passwd     ${ELASTICSEARCH_PASSWORD}
        Logstash_Format On
        Logstash_Prefix k8s-logs
        Retry_Limit     10
        tls             On
        tls.verify      Off

  parsers.conf: |
    [PARSER]
        Name        cri
        Format      regex
        Regex       ^(?<time>[^ ]+) (?<stream>stdout|stderr) (?<flags>[^ ]*) (?<log>.*)$
        Time_Key    time
        Time_Format %Y-%m-%dT%H:%M:%S.%L%z

---
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
        env:
        - name: ELASTICSEARCH_PASSWORD
          valueFrom:
            secretKeyRef:
              name: elasticsearch-credentials
              key: password
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            memory: 256Mi
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: config
        configMap:
          name: fluent-bit-config
      tolerations:
      - operator: Exists
        effect: NoSchedule
```

Query logs using Elasticsearch DSL:

```json
{
  "query": {
    "bool": {
      "must": [
        {"match": {"kubernetes.namespace": "production"}},
        {"match": {"level": "error"}},
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ],
      "filter": [
        {"term": {"cluster": "cluster-1"}}
      ]
    }
  },
  "sort": [{"@timestamp": {"order": "desc"}}],
  "size": 100
}
```

## Approach 3: Cloud-Native Solutions

Cloud providers offer managed log collection services that integrate well with Kubernetes.

For AWS CloudWatch Logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: amazon-cloudwatch
data:
  fluent-bit.conf: |
    [OUTPUT]
        Name              cloudwatch_logs
        Match             kube.*
        region            us-east-1
        log_group_name    /aws/eks/cluster-1/logs
        log_stream_prefix from-fluent-bit-
        auto_create_group true

    [FILTER]
        Name    modify
        Match   kube.*
        Add     cluster_name cluster-1
```

For Google Cloud Logging:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: kube-system
data:
  forward.conf: |
    <match **>
      @type google_cloud
      buffer_type file
      buffer_path /var/log/fluentd-buffer
      buffer_chunk_limit 8m
      buffer_queue_limit 32
      flush_interval 5s
      max_retry_wait 30
      disable_retry_limit
      num_threads 8
      <labels>
        cluster_name cluster-1
        region us-central1
      </labels>
    </match>
```

## Structured Logging Best Practices

Ensure applications emit structured logs that are easier to query:

```go
// Good: Structured logging in Go
package main

import (
    "time"

    "go.uber.org/zap"
)

func main() {
    logger, _ := zap.NewProduction()
    defer logger.Sync()

    logger.Info("user login",
        zap.String("user_id", "12345"),
        zap.String("ip_address", "192.168.1.1"),
        zap.String("cluster", "cluster-1"),
        zap.Duration("response_time", 230*time.Millisecond),
    )
}
```

```python
# Good: Structured logging in Python
import structlog

log = structlog.get_logger()
log.info("user_login",
    user_id="12345",
    ip_address="192.168.1.1",
    cluster="cluster-1",
    response_time=0.23
)
```

This creates logs that are easily searchable across clusters:

```logql
{cluster="cluster-1"} | json | user_id="12345"
```

## Log Retention and Lifecycle Policies

Manage storage costs with intelligent retention policies:

```yaml
# Loki retention config
limits_config:
  retention_period: 744h  # 31 days

# Elasticsearch ILM policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "searchable_snapshot": {
            "snapshot_repository": "logs-snapshots"
          }
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

## Monitoring Log Collection Pipeline

Monitor your log pipeline to detect issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: logging-alerts
  namespace: logging
spec:
  groups:
  - name: logging
    rules:
    - alert: FluentBitOutputErrors
      expr: rate(fluentbit_output_errors_total[5m]) > 0
      for: 10m
      annotations:
        summary: "Fluent Bit output errors detected"

    - alert: LogsNotBeingCollected
      expr: rate(fluentbit_input_records_total[5m]) == 0
      for: 5m
      annotations:
        summary: "No Fluent Bit input records received"

    - alert: BackpressureDetected
      expr: rate(fluentbit_output_retries_total[5m]) > 0
      for: 5m
      annotations:
        summary: "Log shipping backpressure detected"
```

## Best Practices

Always add cluster and region labels to logs at collection time. This makes it easy to filter and aggregate logs by cluster.

Use sampling for very high-volume logs to reduce costs. Not every debug log needs to be stored forever.

Implement log parsing at collection time rather than query time. Pre-parsed logs query much faster.

Set up alerts when log collection fails. Missing logs during incidents makes troubleshooting nearly impossible.

Regularly test your log queries to ensure you can find information quickly during incidents.

## Conclusion

Centralized log collection transforms multiple isolated Kubernetes clusters into an observable distributed system. Whether you choose Loki for cost-effectiveness, Elasticsearch for powerful search capabilities, or cloud-native solutions for simplified operations, the key is ensuring reliable log collection and maintaining consistent labeling across all clusters.

Start with a simple setup and add sophistication as your log volume and query requirements grow. Monitor your log pipeline as carefully as you monitor your applications to ensure logs are always available when you need them most.
