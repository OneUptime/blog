# How to Send Dapr Traces to Instana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Tracing, Instana, OpenTelemetry, Observability

Description: Route Dapr distributed traces to IBM Instana using the OpenTelemetry Collector with the OTLP exporter and Instana agent backend URL.

---

## Overview

IBM Instana's agent accepts OpenTelemetry traces via OTLP on a local port (4317 for gRPC, 4318 for HTTP). When running on Kubernetes, the Instana agent DaemonSet is typically deployed alongside your workloads, making it a natural local OTLP endpoint for Dapr sidecars to target via the OpenTelemetry Collector.

## Deploy the Instana Agent

Install the Instana agent using the Helm chart:

```bash
helm repo add instana https://agents.instana.io/helm
helm repo update

helm install instana-agent instana/instana-agent \
  --namespace instana-agent \
  --create-namespace \
  --set agent.key=YOUR_INSTANA_KEY \
  --set agent.endpointHost=YOUR_TENANT.instana.io \
  --set agent.endpointPort=443 \
  --set opentelemetry.enabled=true \
  --set opentelemetry.grpc.enabled=true
```

## OpenTelemetry Collector Configuration

Route Dapr spans through the collector to the local Instana agent:

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
          - key: com.instana.plugin.generic.trace.service
            from_attribute: service.name
            action: insert

    exporters:
      otlp/instana:
        endpoint: instana-agent.instana-agent:4317
        tls:
          insecure: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch, resource]
          exporters: [otlp/instana]
```

## Dapr Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-instana-tracing
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring:4317"
      isSecure: false
      protocol: grpc
```

Annotate your Dapr services:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "catalog-service"
  dapr.io/config: "dapr-instana-tracing"
  dapr.io/env: "OTEL_RESOURCE_ATTRIBUTES=service.name=catalog-service"
```

## Direct Agent Export (No Collector)

If the Instana agent is on the same node, export directly from the sidecar:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-instana-direct
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "instana-agent.instana-agent:4317"
      isSecure: false
      protocol: grpc
```

## Correlation with Infrastructure Monitoring

Instana automatically correlates OpenTelemetry traces with infrastructure metrics from its agent. Ensure the `host.id` attribute is set for correlation:

```bash
# Check that the Instana agent is ready to accept OTLP
kubectl exec -n instana-agent daemonset/instana-agent -- \
  curl -s http://localhost:42699/status | jq '.status'
```

## Viewing Traces in Instana

Navigate to Instana > Applications > Services. Your Dapr app IDs appear as services. The dependency graph shows Dapr service-to-service invocation flows mapped from trace parent-child relationships.

```bash
# Verify OTLP port is open on the agent
kubectl exec -n instana-agent daemonset/instana-agent -- \
  netstat -tlnp | grep 4317
```

## Summary

Sending Dapr traces to Instana works by routing OTLP spans from the sidecar through the OpenTelemetry Collector to the Instana agent's local OTLP endpoint. The Instana agent automatically correlates these traces with host and container metrics it collects independently, providing a unified view. Enabling the `opentelemetry.grpc.enabled=true` flag in the Helm chart is required for OTLP ingestion.
