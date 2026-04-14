# How to Send Dapr Traces to Azure Application Insights

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Application Insights, Distributed Tracing, Observability, Microservice, Monitoring

Description: Export Dapr distributed traces to Azure Application Insights for end-to-end visibility and deep integration with Azure Monitor.

---

## Overview

Azure Application Insights is Azure's application performance monitoring (APM) service. It provides distributed tracing, dependency mapping, performance dashboards, and alerting. Dapr can send trace data to Application Insights through the OpenTelemetry Collector with the Azure Monitor exporter, giving you full visibility into Dapr-mediated microservice interactions.

## Prerequisites

- Azure subscription with Application Insights workspace
- OpenTelemetry Collector deployed in your cluster
- Dapr installed

## Creating Application Insights

```bash
# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group dapr-demo \
  --workspace-name dapr-workspace

# Create Application Insights (use the full resource ID for --workspace)
az monitor app-insights component create \
  --app dapr-tracing \
  --location eastus \
  --resource-group dapr-demo \
  --workspace "$(az monitor log-analytics workspace show \
    --resource-group dapr-demo \
    --workspace-name dapr-workspace \
    --query id -o tsv)"

# Get the connection string
az monitor app-insights component show \
  --app dapr-tracing \
  --resource-group dapr-demo \
  --query connectionString -o tsv
```

## OTel Collector Configuration

The OpenTelemetry Collector bridges Dapr's OTLP traces to Application Insights:

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
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        timeout: 5s
        send_batch_size: 512

    exporters:
      azuremonitor:
        connection_string: ${APPLICATIONINSIGHTS_CONNECTION_STRING}
        maxbatchsize: 100
        maxbatchinterval: 10s

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [azuremonitor]
```

Store the connection string as a Kubernetes secret:

```bash
kubectl create secret generic appinsights-secret \
  --from-literal=connectionString="InstrumentationKey=xxxx;IngestionEndpoint=https://eastus-0.in.applicationinsights.azure.com/" \
  -n monitoring
```

Reference in the OTel Collector deployment:

```yaml
env:
  - name: APPLICATIONINSIGHTS_CONNECTION_STRING
    valueFrom:
      secretKeyRef:
        name: appinsights-secret
        key: connectionString
```

## Dapr Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-appinsights
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring.svc.cluster.local:4317"
      isSecure: false
      protocol: grpc
```

Apply to deployments:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/config: "dapr-appinsights"
```

## Viewing Traces in Azure Portal

Navigate to Application Insights in the Azure Portal:

1. Open "Transaction search" to find individual traces
2. Use "Application map" to see service dependency graph
3. Open "Performance" for latency percentiles per operation
4. Use "Failures" to identify error patterns

## Querying Traces with KQL

```kql
dependencies
| where timestamp > ago(1h)
| where cloud_RoleName == "order-service"
| project timestamp, name, duration, success, resultCode
| order by duration desc
| take 20
```

```kql
// Find slow cross-service calls
dependencies
| where duration > 500
| summarize avg_duration=avg(duration), count=count() by name, target
| order by avg_duration desc
```

## Setting Up Alerts

```bash
az monitor scheduled-query create \
  --resource-group dapr-demo \
  --name high-latency-alert \
  --scopes "/subscriptions/<sub-id>/resourceGroups/dapr-demo/providers/microsoft.insights/components/dapr-tracing" \
  --condition "count 'HighLatencyQuery' > 10" \
  --condition-query HighLatencyQuery="dependencies | where duration > 1000" \
  --window-size 5m \
  --evaluation-frequency 1m
```

## Summary

Send Dapr traces to Azure Application Insights by routing through the OpenTelemetry Collector with the Azure Monitor exporter. Configure the collector with your Application Insights connection string, point Dapr's tracing configuration at the collector, and apply the configuration to your deployments. Application Insights' application map and transaction search provide powerful tools for understanding request flows and diagnosing performance issues.
