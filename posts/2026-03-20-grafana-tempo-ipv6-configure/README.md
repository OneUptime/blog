# How to Configure Grafana Tempo with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Tempo, IPv6, Tracing, Observability, OpenTelemetry

Description: A guide to configuring Grafana Tempo to accept traces over IPv6 and querying IPv6 trace data from Grafana's Explore view.

Grafana Tempo is a distributed tracing backend. Configuring it for IPv6 allows traces from IPv6-addressed services to be collected and correlated with IPv6 network events, providing complete observability for IPv6 workloads.

## Step 1: Configure Tempo to Listen on IPv6

Edit `tempo.yaml` to expose Tempo on IPv6-capable listen addresses:

```yaml
# tempo.yaml - Tempo configuration with IPv6 listeners

server:
  # Empty listen addresses use Tempo's default all-interface bind
  http_listen_address: ""
  http_listen_port: 3200
  grpc_listen_address: ""
  grpc_listen_port: 9095

# Distributor accepts traces from OpenTelemetry Collector
distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          # Bind the OTLP receiver on the IPv6 wildcard address
          endpoint: "[::]:4317"
        http:
          endpoint: "[::]:4318"
    jaeger:
      protocols:
        thrift_http:
          endpoint: "[::]:14268"
    zipkin:
      endpoint: "[::]:9411"

# Storage backend
storage:
  trace:
    backend: local
    local:
      path: /var/tempo/traces

compactor:
  compaction:
    block_retention: 48h
```

## Step 2: Start Tempo with IPv6 Config

```bash
# Start Tempo with the IPv6 configuration
tempo --config.file=tempo.yaml

# Verify it's listening on IPv6
ss -6 -tlnp | grep tempo
# Look for LISTEN entries on [::]:3200, [::]:9095, and [::]:4317
```

## Step 3: Configure OpenTelemetry Collector to Send to Tempo over IPv6

```yaml
# otel-collector-config.yaml - Send traces to Tempo via IPv6
receivers:
  otlp:
    protocols:
      grpc:

processors:
  batch:

exporters:
  otlp:
    # Use an IPv6 literal for Tempo's OTLP/gRPC endpoint
    endpoint: "[2001:db8::1]:4317"
    tls:
      insecure: true    # For development; use proper TLS in production

  # Or use Tempo's OTLP/HTTP endpoint and switch the pipeline exporter to [otlphttp]
  otlphttp:
    endpoint: "http://[2001:db8::1]:4318"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

## Step 4: Configure Grafana to Use Tempo Data Source over IPv6

In Grafana's UI or via provisioning:

```yaml
# grafana/provisioning/datasources/tempo.yaml - Tempo data source with IPv6
apiVersion: 1

datasources:
  - name: Tempo
    type: tempo
    # Connect to Tempo via IPv6
    url: "http://[2001:db8::1]:3200"
    access: proxy
    isDefault: false
    jsonData:
      # Enable trace to logs correlation
      tracesToLogsV2:
        datasourceUid: "loki"
      # Enable service graph
      serviceMap:
        datasourceUid: "prometheus"
```

## Step 5: Query IPv6 Trace Data in Grafana

In the Grafana Explore view with Tempo selected, use TraceQL to find traces that use IPv6 network attributes:

```text
# Find traces recorded over IPv6
{ span.network.type = "ipv6" }

# Find slow IPv6 requests (>1s)
{ span.network.type = "ipv6" && span:duration > 1s }

# Find server spans where the client address is an IPv6 literal
{ span.client.address =~ ".*:.*" && span:kind = server }
```

## Step 6: Kubernetes Deployment with IPv6

```yaml
# tempo-deployment.yaml - Kubernetes deployment for Tempo with IPv6
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tempo
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: tempo
  template:
    metadata:
      labels:
        app: tempo
    spec:
      containers:
        - name: tempo
          image: grafana/tempo:latest
          args:
            - --config.file=/etc/tempo/tempo.yaml
          ports:
            - name: http
              containerPort: 3200
              protocol: TCP
            - name: otlp-grpc
              containerPort: 4317
              protocol: TCP
```

## Verify Trace Ingestion

```bash
# Send a test trace to Tempo via IPv6
curl -X POST "http://[2001:db8::1]:4318/v1/traces" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [{
          "key": "service.name",
          "value": { "stringValue": "tempo-ipv6-demo" }
        }]
      },
      "scopeSpans": [{
        "scope": { "name": "curl-demo" },
        "spans": [{
          "traceId": "5B8EFFF798038103D269B633813FC60C",
          "spanId": "EEE19B7EC3C1B174",
          "name": "ipv6-test-span",
          "startTimeUnixNano": "1544712660000000000",
          "endTimeUnixNano": "1544712661000000000",
          "kind": 2
        }]
      }]
    }]
  }'

# Query for the test trace
curl -G "http://[2001:db8::1]:3200/api/search" \
  --data-urlencode 'q={ span:name = "ipv6-test-span" }' \
  --data-urlencode 'limit=5' | jq '.traces[].rootTraceName'
```

Configuring Tempo to listen on IPv6 ensures that traces from IPv6-addressed services are collected without any special routing, providing full observability coverage for dual-stack and IPv6-only deployments.
