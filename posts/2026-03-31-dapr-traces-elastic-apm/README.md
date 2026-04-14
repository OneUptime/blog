# How to Send Dapr Traces to Elastic APM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Tracing, Elastic, APM, OpenTelemetry, Observability

Description: Route Dapr distributed traces to Elastic APM Server using the OpenTelemetry Collector with the OTLP/HTTP exporter and secret token authentication.

---

## Overview

Elastic APM supports OpenTelemetry natively via its OTLP intake endpoint. Dapr's built-in OpenTelemetry exporter can send spans to Elastic APM Server directly or through the OpenTelemetry Collector. APM Server translates OTLP spans into Elasticsearch documents for visualization in Kibana.

## Elastic APM Server Setup

If using Elastic Cloud, the APM endpoint and secret token are available in Kibana under Observability > APM > Settings. For self-managed:

```yaml
# apm-server.yml
apm-server:
  host: "0.0.0.0:8200"
  auth:
    secret_token: "YOUR_SECRET_TOKEN"
output.elasticsearch:
  hosts: ["http://elasticsearch:9200"]
```

## Direct Export from Dapr Sidecar

Configure Dapr to send OTLP traces directly to APM Server:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-elastic-apm
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "apm-server.elastic:8200"
      isSecure: false
      protocol: http
```

Set the secret token via environment variable injection:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "inventory-service"
  dapr.io/config: "dapr-elastic-apm"
  dapr.io/env: "OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer YOUR_SECRET_TOKEN"
```

## Via OpenTelemetry Collector

The collector approach supports enrichment and fan-out:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: monitoring
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317

    processors:
      batch:
        timeout: 5s
      resource:
        attributes:
          - key: deployment.environment
            value: production
            action: upsert

    exporters:
      otlphttp/elastic:
        endpoint: https://YOUR_CLUSTER.apm.us-east-1.aws.elastic-cloud.com
        headers:
          Authorization: "Bearer ${ELASTIC_APM_TOKEN}"

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch, resource]
          exporters: [otlphttp/elastic]
```

Store the token:

```bash
kubectl create secret generic elastic-credentials \
  --from-literal=apm-token=YOUR_SECRET_TOKEN \
  -n monitoring
```

## Kibana APM Service Map

Once traces arrive, Kibana's APM service map shows Dapr service dependencies. Ensure each Dapr app ID maps to a distinct `service.name` attribute:

```yaml
annotations:
  dapr.io/env: "OTEL_RESOURCE_ATTRIBUTES=service.name=inventory-service,service.version=1.0.0"
```

## Custom Transactions in Application Code

Augment Dapr spans with your own application spans using the OTEL SDK:

```python
from opentelemetry import trace

tracer = trace.get_tracer("inventory-service")

def update_stock(item_id: str, quantity: int):
    with tracer.start_as_current_span("update_stock") as span:
        span.set_attribute("item.id", item_id)
        span.set_attribute("stock.delta", quantity)
        # Elastic APM will link this to the parent Dapr span
        perform_db_update(item_id, quantity)
```

## Verifying in Kibana

```bash
# Check APM server received traces
curl -s http://apm-server:8200/ | jq '.version'

# Verify spans in Elasticsearch
curl -s "http://elasticsearch:9200/traces-apm-*/_search?size=1" \
  -H "Content-Type: application/json" \
  -d '{"query": {"match": {"service.name": "inventory-service"}}}' \
  | jq '.hits.total.value'
```

## Summary

Routing Dapr traces to Elastic APM requires configuring the OTLP exporter to point at APM Server's intake endpoint with the secret token in the `Authorization: Bearer` header. The collector approach adds environment labels and batching before forwarding to Elastic Cloud or a self-managed APM Server. Consistent `service.name` attributes ensure Kibana's APM service map accurately reflects your Dapr microservice topology.
