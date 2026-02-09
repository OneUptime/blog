# How to Set Up Ingestion Keys and Hostname Configuration for the Mezmo OpenTelemetry Exporter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Mezmo, Ingestion Keys, Hostname Configuration

Description: Set up Mezmo ingestion keys and hostname configuration for the OpenTelemetry exporter to ensure logs are properly authenticated and organized.

Getting the Mezmo OpenTelemetry integration right requires two things: a valid ingestion key for authentication and proper hostname configuration for log organization. This post covers how to generate and manage ingestion keys, configure hostname resolution, and troubleshoot common setup issues.

## Generating a Mezmo Ingestion Key

Log into the Mezmo dashboard and navigate to Settings then Organization then API Keys. Create a new ingestion key:

```bash
# You can also create keys via the Mezmo API
curl -X POST "https://api.mezmo.com/v1/config/ingestion" \
  -H "Authorization: Basic $(echo -n 'your-service-key:' | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "otel-collector-production",
    "description": "Ingestion key for the OpenTelemetry Collector in production"
  }'
```

## Storing the Ingestion Key Securely

Never hardcode ingestion keys in your configuration files. Use environment variables or secrets management.

In Kubernetes:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mezmo-credentials
  namespace: observability
type: Opaque
stringData:
  ingestion-key: "your-mezmo-ingestion-key-here"
```

Reference it in the Collector deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  template:
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          env:
            - name: MEZMO_INGESTION_KEY
              valueFrom:
                secretKeyRef:
                  name: mezmo-credentials
                  key: ingestion-key
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
```

## Hostname Configuration Strategies

Mezmo groups logs by hostname. The hostname you configure determines how logs appear in the Mezmo UI. There are several strategies depending on your environment.

### Strategy 1: System Hostname

Use the resource detection processor to automatically pick up the system hostname:

```yaml
processors:
  resourcedetection/system:
    detectors: [system]
    system:
      hostname_sources: ["os"]
      # This sets the host.name resource attribute

  # Map host.name to what Mezmo expects
  transform/hostname:
    log_statements:
      - context: resource
        statements:
          - set(attributes["mezmo.hostname"], attributes["host.name"])
            where attributes["host.name"] != nil
```

### Strategy 2: Kubernetes Node Name

In Kubernetes, the pod hostname is not very useful. Use the node name instead:

```yaml
processors:
  resourcedetection/k8s:
    detectors: [env]
    # This picks up NODE_NAME from the environment

  resource/k8s-hostname:
    attributes:
      - key: mezmo.hostname
        value: "${NODE_NAME}"
        action: upsert
      - key: mezmo.app
        from_attribute: k8s.deployment.name
        action: upsert
```

### Strategy 3: Custom Hostname per Service

If you want each service to have its own hostname in Mezmo:

```yaml
processors:
  resource/custom-hostname:
    attributes:
      - key: mezmo.hostname
        value: "${SERVICE_NAME}-${ENVIRONMENT}"
        action: upsert
```

## Complete Configuration with Both Settings

```yaml
# otel-collector-mezmo-complete.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

  filelog:
    include:
      - /var/log/pods/**/*.log
    start_at: end

processors:
  resourcedetection:
    detectors: [env, system]

  k8sattributes:
    auth_type: serviceAccount
    extract:
      metadata:
        - k8s.pod.name
        - k8s.namespace.name
        - k8s.node.name
        - k8s.deployment.name

  resource/mezmo:
    attributes:
      - key: mezmo.hostname
        from_attribute: k8s.node.name
        action: upsert
      - key: mezmo.app
        from_attribute: k8s.deployment.name
        action: upsert

  batch:
    timeout: 2s
    send_batch_size: 200

exporters:
  mezmo:
    ingest_key: "${MEZMO_INGESTION_KEY}"
    ingest_url: "https://logs.mezmo.com/otel/ingest/rest"
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s

service:
  pipelines:
    logs:
      receivers: [otlp, filelog]
      processors: [resourcedetection, k8sattributes, resource/mezmo, batch]
      exporters: [mezmo]
```

## Testing the Configuration

Send a test log to verify authentication and hostname are working:

```bash
# Send a test log via OTLP HTTP
curl -X POST http://localhost:4318/v1/logs \
  -H "Content-Type: application/json" \
  -d '{
    "resourceLogs": [{
      "resource": {
        "attributes": [
          {"key": "service.name", "value": {"stringValue": "test-service"}},
          {"key": "host.name", "value": {"stringValue": "test-host-01"}}
        ]
      },
      "scopeLogs": [{
        "logRecords": [{
          "timeUnixNano": "1706000000000000000",
          "body": {"stringValue": "Test log message from OpenTelemetry"},
          "severityText": "INFO",
          "severityNumber": 9
        }]
      }]
    }]
  }'
```

## Troubleshooting

Common issues and fixes:

```bash
# Check if the ingestion key is valid
curl -X POST "https://logs.mezmo.com/otel/ingest/rest" \
  -H "Authorization: Basic $(echo -n "${MEZMO_INGESTION_KEY}:" | base64)" \
  -H "Content-Type: application/json" \
  -d '{"lines": [{"line": "test", "app": "test"}]}'
# 200 = valid key, 401 = invalid key

# Check Collector logs for export errors
docker logs otel-collector 2>&1 | grep -i "mezmo\|error\|unauthorized"
```

If logs appear in Mezmo but under the wrong hostname, check the order of your processors. The resource detection and hostname processors must run before the batch processor. Getting the hostname right is important because it determines how you filter and group logs in the Mezmo search interface.
