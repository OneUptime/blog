# How to Use Datadog Distribution (DDOT) of OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Datadog, DDOT, Observability, Monitoring, APM

Description: Learn how to deploy and configure the Datadog Distribution of OpenTelemetry Collector to send traces, metrics, and logs to Datadog.

---

Datadog has its own distribution of the OpenTelemetry Collector, sometimes referred to as DDOT. It is built into the Datadog Agent and includes a curated set of OpenTelemetry components, Datadog-specific components, and configuration defaults that map well to Datadog's data model. This gives you the ability to use standard OpenTelemetry instrumentation and Collector-style pipelines while sending data to Datadog.

That said, Datadog also supports receiving OTLP data through the standard Datadog Agent without enabling the full DDOT Collector pipeline. So you have options. Let's walk through how DDOT works and when to use each approach.

## Two Ways to Send OTel Data to Datadog

Before we dig into DDOT, it helps to understand the two main approaches:

```mermaid
flowchart TD
    subgraph Option1["Option 1: Datadog Agent with OTLP"]
        A1[App with OTel SDK] -->|OTLP| B1[Datadog Agent]
        B1 --> C1[Datadog Backend]
    end

    subgraph Option2["Option 2: DDOT Collector"]
        A2[App with OTel SDK] -->|OTLP| B2[DDOT Collector]
        B2 --> C2[Datadog Backend]
    end
```

**Option 1** uses the standard Datadog Agent with OTLP ingestion enabled. This is simpler if you already run the Datadog Agent for infrastructure monitoring.

**Option 2** uses the DDOT Collector embedded in the Datadog Agent. This is better if you want Collector-style pipelines, processors, and multi-backend export while still using Datadog's Agent-based features.

## Installing DDOT

### On Linux

Install the Datadog Agent with the DDOT Collector enabled:

```bash
DD_API_KEY=your-datadog-api-key \
DD_SITE=datadoghq.com \
DD_OTELCOLLECTOR_ENABLED=true \
DD_AGENT_MAJOR_VERSION=7 \
bash -c "$(curl -L https://install.datadoghq.com/scripts/install_script_agent7.sh)"
```

### On Kubernetes with Helm

Deploy the Datadog Agent with the DDOT Collector enabled using the Datadog Helm chart:

```bash
# Add the Datadog Helm repository
helm repo add datadog https://helm.datadoghq.com
helm repo update

# Install the Datadog Agent with DDOT Collector enabled
helm upgrade -i datadog datadog/datadog \
  --namespace monitoring \
  --create-namespace \
  --set datadog.apiKey=your-datadog-api-key \
  --set datadog.site=datadoghq.com \
  --set datadog.otelCollector.enabled=true \
  --set datadog.otelCollector.ports[0].containerPort=4317 \
  --set datadog.otelCollector.ports[0].hostPort=4317 \
  --set datadog.otelCollector.ports[0].name=otel-grpc \
  --set datadog.otelCollector.ports[1].containerPort=4318 \
  --set datadog.otelCollector.ports[1].hostPort=4318 \
  --set datadog.otelCollector.ports[1].name=otel-http
```

### Using a Custom Collector Configuration

If you need custom Collector configuration, pass it to the Datadog Helm chart:

```bash
helm upgrade -i datadog datadog/datadog \
  --namespace monitoring \
  -f datadog-values.yaml \
  --set-file datadog.otelCollector.config=ddot-config.yaml
```

## Basic DDOT Configuration

Here is a configuration that sends traces, metrics, and logs to Datadog:

```yaml
# DDOT Collector configuration
# Sends all signal types to Datadog

receivers:
  # Accept OTLP from instrumented applications
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Batch data before sending to Datadog
  batch:
    timeout: 10s
    send_batch_size: 1000

  # Add resource attributes for better Datadog tagging
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: upsert

  # Limit memory to prevent OOM in constrained environments
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

connectors:
  # The Datadog connector computes APM stats from traces
  # This is required for Datadog APM to show accurate metrics
  datadog/connector:
    traces:
      compute_stats_by_span_kind: true
      compute_top_level_by_span_kind: true
      peer_tags_aggregation: true

exporters:
  # Send traces and metrics to Datadog
  datadog:
    api:
      key: "${env:DD_API_KEY}"
      site: "${env:DD_SITE}"
    traces:
      span_name_as_resource_name: true
    metrics:
      histograms:
        mode: distributions
      sums:
        cumulative_monotonic_mode: to_delta

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      # Export traces and also feed them to the Datadog connector
      exporters: [datadog, datadog/connector]
    # This pipeline receives computed APM metrics from the connector
    metrics/apm:
      receivers: [datadog/connector]
      processors: [batch]
      exporters: [datadog]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [datadog]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [datadog]
```

## Understanding the Datadog Connector

The Datadog connector is a critical component in DDOT. It sits between the traces pipeline and a metrics pipeline, computing APM statistics (like request rate, error rate, and latency percentiles) from your trace data.

Without the connector, Datadog APM would not show these computed metrics, and the APM UI would be incomplete.

```mermaid
flowchart LR
    A[OTLP Traces] --> B[Traces Pipeline]
    B --> C[Datadog Exporter - traces]
    B --> D[Datadog Connector]
    D --> E[Metrics/APM Pipeline]
    E --> F[Datadog Exporter - metrics]
```

## Host Metrics Collection

If you are using a Collector-style pipeline for infrastructure telemetry, add host metrics collection:

```yaml
receivers:
  # Collect system-level metrics
  hostmetrics:
    collection_interval: 15s
    scrapers:
      cpu:
        metrics:
          system.cpu.utilization:
            enabled: true
      memory:
        metrics:
          system.memory.utilization:
            enabled: true
      disk:
      network:
      filesystem:
      load:
      paging:
      processes:

processors:
  batch:

  # Map OTel resource attributes to Datadog tags
  # Datadog expects specific tag formats
  resource/datadog:
    attributes:
      - key: host.name
        from_attribute: host.name
        action: upsert
      - key: service.name
        from_attribute: service.name
        action: upsert

exporters:
  datadog:
    api:
      key: "${env:DD_API_KEY}"
      site: "${env:DD_SITE}"
    host_metadata:
      enabled: true
      hostname_source: config_or_system

service:
  pipelines:
    metrics:
      receivers: [hostmetrics]
      processors: [resource/datadog, batch]
      exporters: [datadog]
```

## Kubernetes Deployment

Example Kubernetes configuration for DDOT using the Datadog Operator:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-agent-config-map
  namespace: monitoring
data:
  otel-config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

      # Scrape kubelet for node and pod metrics
      kubeletstats:
        collection_interval: 30s
        auth_type: serviceAccount
        endpoint: "https://${env:NODE_NAME}:10250"
        insecure_skip_verify: true

    processors:
      batch:
        timeout: 10s
      memory_limiter:
        check_interval: 5s
        limit_mib: 400
      k8sattributes:
        extract:
          metadata:
            - k8s.pod.name
            - k8s.namespace.name
            - k8s.deployment.name
            - k8s.node.name

    connectors:
      datadog/connector:
        traces:
          compute_stats_by_span_kind: true

    exporters:
      datadog:
        api:
          key: "${env:DD_API_KEY}"
          site: "${env:DD_SITE}"
        traces:
          span_name_as_resource_name: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, k8sattributes, batch]
          exporters: [datadog, datadog/connector]
        metrics/apm:
          receivers: [datadog/connector]
          processors: [batch]
          exporters: [datadog]
        metrics:
          receivers: [otlp, kubeletstats]
          processors: [memory_limiter, k8sattributes, batch]
          exporters: [datadog]
        logs:
          receivers: [otlp]
          processors: [memory_limiter, k8sattributes, batch]
          exporters: [datadog]
---
apiVersion: datadoghq.com/v2alpha1
kind: DatadogAgent
metadata:
  name: datadog
  namespace: monitoring
spec:
  global:
    clusterName: my-cluster
    site: datadoghq.com
    credentials:
      apiSecret:
        secretName: datadog-secret
        keyName: api-key
  features:
    otelCollector:
      enabled: true
      ports:
        - containerPort: 4317
          hostPort: 4317
          name: otel-grpc
        - containerPort: 4318
          hostPort: 4318
          name: otel-http
      conf:
        configMap:
          name: otel-agent-config-map
```

## DDOT vs Datadog Agent with OTLP

The Datadog Agent can also receive OTLP data. Here is how the two compare:

| Feature | DDOT Collector | Datadog Agent + OTLP |
|---------|---------------|---------------------|
| Infrastructure monitoring | Built-in through the Agent | Built-in |
| APM stats computation | Via connector | Automatic |
| Live processes | Available through Agent features | Built-in |
| Network monitoring | Available through Agent features | Built-in |
| Config language | OTel YAML | Datadog YAML |
| Multi-backend export | Easy | Not supported |
| OTel ecosystem | Collector pipelines and components | OTLP receiver only |

## When to Use DDOT

Choose DDOT when:

- You want to use standard OTel configuration and tooling
- You need to send data to Datadog and other backends simultaneously
- You are standardizing on OTel across your organization
- You want Datadog Agent features together with OpenTelemetry Collector pipelines

## When to Use the Datadog Agent Instead

Stick with the Datadog Agent when:

- You need full Datadog feature set (NPM, Live Processes, Runtime Metrics)
- You already have the Datadog Agent deployed
- You want a simpler setup with less configuration
- You do not need multi-backend export

Both paths get your OTel data into Datadog. DDOT keeps you closer to the OTel ecosystem, while the Datadog Agent gives you more Datadog-specific features out of the box.
