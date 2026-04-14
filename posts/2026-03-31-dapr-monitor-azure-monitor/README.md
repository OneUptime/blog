# How to Monitor Dapr on Azure with Azure Monitor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Monitoring, Observability, Kubernetes

Description: Configure Dapr telemetry to flow into Azure Monitor and Application Insights for full observability of your microservices on Azure Kubernetes Service.

---

## Overview

Dapr emits metrics, logs, and distributed traces that can be shipped to Azure Monitor. On Azure Kubernetes Service (AKS), you can use the Azure Monitor agent, OpenTelemetry Collector, or direct Application Insights integration to capture Dapr observability data.

## Prerequisites

- AKS cluster with Dapr installed
- Azure Monitor workspace or Application Insights resource
- OpenTelemetry Collector deployed (recommended)

## Enabling Dapr Telemetry

By default, Dapr exposes Prometheus metrics on port 9090 and can send traces in Zipkin format to a configured collector endpoint. Configure telemetry in the Dapr configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://otel-collector:9411/api/v2/spans"
  metrics:
    enabled: true
```

## Deploying the OpenTelemetry Collector

The OpenTelemetry Collector bridges Dapr telemetry to Azure Monitor:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
data:
  config.yaml: |
    receivers:
      zipkin:
        endpoint: 0.0.0.0:9411
      prometheus:
        config:
          scrape_configs:
          - job_name: dapr
            static_configs:
            - targets: ["dapr-sidecar:9090"]
    exporters:
      azuremonitor:
        connection_string: "InstrumentationKey=<YOUR_KEY>"
    service:
      pipelines:
        traces:
          receivers: [zipkin]
          exporters: [azuremonitor]
        metrics:
          receivers: [prometheus]
          exporters: [azuremonitor]
```

Deploy the collector:

```bash
kubectl apply -f otel-collector-config.yaml
kubectl apply -f otel-collector-deployment.yaml
```

## Viewing Metrics in Azure Monitor

Query Dapr metrics in Azure Monitor Logs using KQL:

```text
customMetrics
| where name startswith "dapr_"
| summarize avg(value) by name, bin(timestamp, 5m)
| render timechart
```

## Setting Up Alerts

Create an alert for high request latency:

```bash
az monitor metrics alert create \
  --name "dapr-high-latency" \
  --resource-group myRG \
  --scopes /subscriptions/<SUB>/resourceGroups/myRG/providers/microsoft.insights/components/myAppInsights \
  --condition "avg customMetrics/dapr_http_server_latency > 500" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action myActionGroup
```

## Distributed Trace Analysis

In Application Insights, navigate to the Transaction Search to view end-to-end Dapr traces. Filter by `cloud_RoleName` matching your Dapr app ID:

```text
requests
| where cloud_RoleName == "order-service"
| where duration > 200
| project timestamp, name, duration, resultCode
| order by duration desc
```

## Summary

Azure Monitor and Application Insights provide powerful observability for Dapr-based microservices on AKS. By routing Dapr's built-in telemetry through the OpenTelemetry Collector, you gain distributed tracing, metrics dashboards, and proactive alerting without modifying application code.
