# How to Fix Collector Config Errors When the OTLP Exporter insecure Flag Moved Under the tls Section

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, OTLP, TLS Configuration

Description: Fix Collector configuration errors caused by the OTLP exporter insecure flag moving from a top-level field to the tls section.

You upgrade the Collector and your configuration that worked perfectly before now produces an error:

```
Error: failed to get config: 1 error(s) decoding:
  'exporters.otlp.insecure' has invalid keys: insecure
```

The `insecure` flag for the OTLP exporter moved from a top-level field to a nested field under the `tls` section. This breaking change has tripped up many teams during upgrades.

## What Changed

### Old Configuration (pre-change)

```yaml
exporters:
  otlp:
    endpoint: backend:4317
    insecure: true              # top-level field
```

### New Configuration

```yaml
exporters:
  otlp:
    endpoint: backend:4317
    tls:
      insecure: true            # nested under tls section
```

The same change applies to the OTLP HTTP exporter:

```yaml
# OLD
exporters:
  otlphttp:
    endpoint: http://backend:4318
    insecure: true

# NEW
exporters:
  otlphttp:
    endpoint: http://backend:4318
    tls:
      insecure: true
```

## The Fix

Move `insecure` under the `tls` section:

```yaml
exporters:
  otlp:
    endpoint: backend:4317
    tls:
      insecure: true
```

If you had other TLS settings, they also belong in the `tls` section:

```yaml
# OLD
exporters:
  otlp:
    endpoint: backend:4317
    insecure: false
    ca_file: /etc/ssl/ca.crt
    cert_file: /etc/ssl/client.crt
    key_file: /etc/ssl/client.key

# NEW
exporters:
  otlp:
    endpoint: backend:4317
    tls:
      insecure: false
      ca_file: /etc/ssl/ca.crt
      cert_file: /etc/ssl/client.crt
      key_file: /etc/ssl/client.key
```

## Receivers Were Also Affected

The same change applies to receivers that accept TLS connections:

```yaml
# OLD
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        tls_settings:
          cert_file: /etc/ssl/server.crt
          key_file: /etc/ssl/server.key

# NEW
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        tls:
          cert_file: /etc/ssl/server.crt
          key_file: /etc/ssl/server.key
```

Note that `tls_settings` was also renamed to just `tls`.

## Checking All Affected Components

Search your configuration for any component that uses TLS:

```bash
# Find all TLS-related configuration
grep -n "insecure\|tls_settings\|ca_file\|cert_file\|key_file" collector-config.yaml
```

Update each occurrence to use the new nested `tls` section.

## Multiple Exporters

If you have multiple OTLP exporters, update all of them:

```yaml
exporters:
  otlp/traces:
    endpoint: tempo:4317
    tls:
      insecure: true

  otlp/metrics:
    endpoint: mimir:4317
    tls:
      insecure: true

  otlp/logs:
    endpoint: loki:4317
    tls:
      insecure: true
```

## Using Environment Variables

If your TLS settings come from environment variables, update the references:

```yaml
# OLD
exporters:
  otlp:
    endpoint: ${OTEL_BACKEND}
    insecure: ${OTEL_INSECURE}

# NEW
exporters:
  otlp:
    endpoint: ${OTEL_BACKEND}
    tls:
      insecure: ${OTEL_INSECURE}
```

## Validation

After making the changes, validate the configuration:

```bash
otelcol-contrib validate --config collector-config.yaml
```

A successful validation means the configuration structure is correct.

## Helm Chart Values

If you configure the Collector through Helm values, update the values file:

```yaml
# OLD values.yaml
config:
  exporters:
    otlp:
      endpoint: backend:4317
      insecure: true

# NEW values.yaml
config:
  exporters:
    otlp:
      endpoint: backend:4317
      tls:
        insecure: true
```

## ConfigMap Update

If your config is in a ConfigMap, update it:

```bash
# Edit the ConfigMap directly
kubectl edit configmap otel-collector-config

# Or update from file
kubectl create configmap otel-collector-config \
  --from-file=config.yaml=collector-config.yaml \
  --dry-run=client -o yaml | kubectl apply -f -
```

After updating the ConfigMap, restart the Collector to pick up the changes:

```bash
kubectl rollout restart deployment otel-collector
```

## Summary

The `insecure` flag and other TLS settings moved from top-level exporter/receiver fields to a nested `tls` section. Additionally, `tls_settings` was renamed to `tls`. Search your config for all TLS-related fields and move them under the `tls` key. Validate the config before deploying. This is a one-time migration that affects all components using TLS.
