# How to Send Istio Access Logs to Elasticsearch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Elasticsearch, Access Logs, Logging, ELK Stack, Observability

Description: Complete guide to shipping Istio service mesh access logs to Elasticsearch for search, analysis, and long-term storage using Fluent Bit and OpenTelemetry.

---

Elasticsearch is one of the most popular destinations for Istio access logs, and for good reason. Its full-text search, structured queries, and Kibana visualization layer make it straightforward to find specific requests, analyze traffic patterns, and investigate incidents. Getting the pipeline set up properly takes some work, though, especially around log parsing and index management.

## Architecture Overview

The typical pipeline looks like this:

```mermaid
graph LR
    A[Envoy Sidecar] -->|stdout| B[Container Log Files]
    B -->|tail| C[Fluent Bit DaemonSet]
    C -->|bulk API| D[Elasticsearch]
    D -->|query| E[Kibana]
```

An alternative pipeline using OpenTelemetry:

```mermaid
graph LR
    A[Envoy Sidecar] -->|gRPC ALS| B[OTel Collector]
    B -->|bulk API| C[Elasticsearch]
    C -->|query| D[Kibana]
```

I will cover both approaches.

## Step 1: Configure JSON Access Logs

JSON logs are far easier to index in Elasticsearch than text logs. Configure Istio to output JSON:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: json-file-log
        envoyFileAccessLog:
          path: /dev/stdout
          logFormat:
            labels:
              timestamp: "%START_TIME%"
              method: "%REQ(:METHOD)%"
              path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
              protocol: "%PROTOCOL%"
              response_code: "%RESPONSE_CODE%"
              response_flags: "%RESPONSE_FLAGS%"
              bytes_received: "%BYTES_RECEIVED%"
              bytes_sent: "%BYTES_SENT%"
              duration_ms: "%DURATION%"
              upstream_service_time_ms: "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%"
              upstream_host: "%UPSTREAM_HOST%"
              upstream_cluster: "%UPSTREAM_CLUSTER%"
              request_id: "%REQ(X-REQUEST-ID)%"
              authority: "%REQ(:AUTHORITY)%"
              user_agent: "%REQ(USER-AGENT)%"
              pod_name: "%ENVIRONMENT(POD_NAME)%"
              pod_namespace: "%ENVIRONMENT(POD_NAMESPACE)%"
```

Enable it:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: json-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: json-file-log
```

## Step 2: Deploy Fluent Bit

Fluent Bit runs as a DaemonSet and ships logs from every node to Elasticsearch:

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
        Log_Level     info
        Parsers_File  parsers.conf
        HTTP_Server   On
        HTTP_Listen   0.0.0.0
        HTTP_Port     2020

    [INPUT]
        Name              tail
        Tag               istio.*
        Path              /var/log/containers/*istio-proxy*.log
        Parser            cri
        DB                /var/log/flb_istio.db
        Mem_Buf_Limit     10MB
        Skip_Long_Lines   On
        Refresh_Interval  5

    [FILTER]
        Name         kubernetes
        Match        istio.*
        Kube_URL     https://kubernetes.default.svc:443
        Merge_Log    On
        Keep_Log     Off
        Labels       On
        Annotations  Off

    [FILTER]
        Name    grep
        Match   istio.*
        Regex   log ^{

    [OUTPUT]
        Name            es
        Match           istio.*
        Host            elasticsearch.logging.svc.cluster.local
        Port            9200
        Index           istio-access-logs
        Logstash_Format On
        Logstash_Prefix istio-access
        Suppress_Type_Name On
        Buffer_Size     512KB
        Retry_Limit     3

  parsers.conf: |
    [PARSER]
        Name        cri
        Format      regex
        Regex       ^(?<time>[^ ]+) (?<stream>stdout|stderr) (?<logtag>[^ ]*) (?<log>.*)$
        Time_Key    time
        Time_Format %Y-%m-%dT%H:%M:%S.%L%z
```

The grep filter (`Regex log ^{`) ensures only JSON lines are sent to Elasticsearch. Envoy sometimes outputs non-JSON lines during startup or configuration changes.

Deploy the DaemonSet:

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
      tolerations:
        - operator: Exists
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:3.0
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              memory: 256Mi
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

## Step 3: Elasticsearch Index Template

Create an index template so Elasticsearch correctly maps the fields:

```bash
curl -X PUT "elasticsearch.logging.svc.cluster.local:9200/_index_template/istio-access-logs" \
  -H "Content-Type: application/json" \
  -d '{
  "index_patterns": ["istio-access-*"],
  "template": {
    "settings": {
      "number_of_shards": 2,
      "number_of_replicas": 1,
      "index.lifecycle.name": "istio-access-logs-policy",
      "index.lifecycle.rollover_alias": "istio-access-logs"
    },
    "mappings": {
      "properties": {
        "timestamp": { "type": "date" },
        "method": { "type": "keyword" },
        "path": { "type": "keyword" },
        "protocol": { "type": "keyword" },
        "response_code": { "type": "keyword" },
        "response_flags": { "type": "keyword" },
        "bytes_received": { "type": "long" },
        "bytes_sent": { "type": "long" },
        "duration_ms": { "type": "long" },
        "upstream_service_time_ms": { "type": "long" },
        "upstream_host": { "type": "keyword" },
        "upstream_cluster": { "type": "keyword" },
        "request_id": { "type": "keyword" },
        "authority": { "type": "keyword" },
        "user_agent": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
        "pod_name": { "type": "keyword" },
        "pod_namespace": { "type": "keyword" }
      }
    }
  }
}'
```

Using `keyword` type for response_code (instead of integer) lets you do prefix searches like `response_code: 5*` in Kibana.

## Step 4: Index Lifecycle Management

Set up an ILM policy to manage retention:

```bash
curl -X PUT "elasticsearch.logging.svc.cluster.local:9200/_ilm/policy/istio-access-logs-policy" \
  -H "Content-Type: application/json" \
  -d '{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_primary_shard_size": "10gb",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "3d",
        "actions": {
          "shrink": { "number_of_shards": 1 },
          "forcemerge": { "max_num_segments": 1 }
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}'
```

This rolls over indices daily, shrinks them after 3 days, and deletes them after 30 days.

## Alternative: OpenTelemetry Collector Pipeline

If you prefer to use the Envoy ALS (Access Log Service) to send logs directly to a collector:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: otel-als
        envoyOtelAls:
          service: otel-collector.logging.svc.cluster.local
          port: 4317
```

OTel Collector configuration:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s
    send_batch_size: 1000

  resource:
    attributes:
      - key: service.name
        value: istio-proxy
        action: upsert

exporters:
  elasticsearch:
    endpoints: ["https://elasticsearch.logging.svc.cluster.local:9200"]
    logs_index: istio-access-logs
    mapping:
      mode: ecs

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [elasticsearch]
```

## Kibana Queries

Once logs are in Elasticsearch, query them in Kibana:

```text
# Find all 503 errors
response_code: "503"

# Find errors for a specific service
pod_namespace: "production" AND response_flags: "UF"

# Find slow requests (over 2 seconds)
duration_ms > 2000

# Find requests from a specific source
authority: "payment-service.production.svc.cluster.local" AND response_code: "5*"

# Trace a specific request
request_id: "a1b2c3d4-e5f6-7890"
```

## Building Kibana Dashboards

Create visualizations for:

1. **Error rate over time** - Date histogram of response_code = 5xx
2. **Top error paths** - Terms aggregation on path filtered by 5xx codes
3. **Response code distribution** - Pie chart of response_code values
4. **Latency percentiles** - Percentile aggregation on duration_ms
5. **Top talkers** - Terms aggregation on authority

## Scaling Tips

- **Use data streams** instead of regular indices for better append performance
- **Disable `_source`** for the access log index if you do not need to reindex (saves 40-50% storage)
- **Set `refresh_interval: 30s`** on the index to reduce indexing overhead
- **Use ILM to tier storage** - hot nodes for recent data, warm nodes for older data
- **Avoid high-cardinality fields as keywords** - Fields like `request_id` are useful for individual lookups but expensive for aggregations

With JSON access logs, Fluent Bit, and proper Elasticsearch index management, you get a powerful search and analysis platform for your Istio mesh traffic. The setup takes some initial effort but provides invaluable debugging capability for production incidents.
