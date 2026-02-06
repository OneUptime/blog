# How to Implement Log Level Optimization (DEBUG in Dev, ERROR in Prod) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Logging, Log Levels, Cost Optimization

Description: Configure environment-aware log level filtering using OpenTelemetry SDK and Collector to cut production log costs.

Production environments should not emit DEBUG logs. This sounds obvious, but it is surprisingly common to find services running with verbose log levels in production because someone enabled them during an incident and never reverted the change. With OpenTelemetry, you can enforce environment-specific log levels at both the SDK and Collector layers, creating a safety net that prevents verbose logging from inflating your observability bill.

## The Cost of Verbose Logging

A typical microservice emits log records in roughly this distribution:

| Level | Percentage of Records | Operational Value in Prod |
|-------|----------------------|--------------------------|
| DEBUG | 60-70% | Almost none |
| INFO | 20-25% | Low to moderate |
| WARN | 5-8% | High |
| ERROR | 2-5% | Critical |

Filtering out DEBUG logs in production immediately removes 60-70% of your log volume. For a service generating 100 GB of logs per day, that is 60-70 GB saved daily.

## Approach 1: SDK-Level Log Filtering

The cleanest approach is filtering at the SDK before logs are ever serialized or transmitted. This saves both CPU and network bandwidth.

Here is how to configure environment-based log level filtering in a Go application:

```go
// Configure the OTel log provider with environment-aware
// minimum severity. DEBUG logs are only emitted in non-prod.
package main

import (
    "os"

    "go.opentelemetry.io/otel/log"
    sdklog "go.opentelemetry.io/otel/sdk/log"
)

func newLogProvider() *sdklog.LoggerProvider {
    env := os.Getenv("DEPLOYMENT_ENVIRONMENT")

    // Set minimum severity based on environment.
    // Production only exports WARN and above.
    // Staging exports INFO and above.
    // Development exports everything including DEBUG.
    var minSeverity log.Severity
    switch env {
    case "production":
        minSeverity = log.SeverityWarn
    case "staging":
        minSeverity = log.SeverityInfo
    default:
        minSeverity = log.SeverityDebug
    }

    // Create a filter processor that drops logs below
    // the minimum severity before they reach the exporter.
    exporter := newOTLPExporter()
    filterProc := sdklog.NewFilterProcessor(
        sdklog.NewBatchProcessor(exporter),
        sdklog.WithMinSeverity(minSeverity),
    )

    return sdklog.NewLoggerProvider(
        sdklog.WithProcessor(filterProc),
    )
}
```

For Python applications, use the standard logging integration with level configuration:

```python
# Python log level configuration that reads the environment
# and sets the appropriate minimum level for the OTel handler.
import os
import logging
from opentelemetry.sdk._logs import LoggerProvider
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter

# Map environments to log levels
ENV_LOG_LEVELS = {
    "production": logging.WARNING,
    "staging": logging.INFO,
    "development": logging.DEBUG,
}

env = os.getenv("DEPLOYMENT_ENVIRONMENT", "development")
min_level = ENV_LOG_LEVELS.get(env, logging.DEBUG)

# Configure the OTel log provider
provider = LoggerProvider()
provider.add_log_record_processor(
    BatchLogRecordProcessor(OTLPLogExporter())
)

# Set the root logger level based on environment
logging.basicConfig(level=min_level)
```

## Approach 2: Collector-Level Filtering as a Safety Net

Even with SDK-level filtering, a Collector-level filter acts as a safety net. This catches cases where a service was misconfigured or where a third-party library bypasses your log level settings.

```yaml
# Collector configuration that filters logs based on
# severity and deployment environment. This acts as a
# backstop for any SDK-level misconfigurations.
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Filter processor drops log records that do not meet
  # the minimum severity for their environment.
  filter/log_levels:
    error_mode: ignore
    logs:
      log_record:
        # Drop DEBUG logs from production environments
        - resource.attributes["deployment.environment"] == "production"
            and severity_number < 9
        # Drop DEBUG and INFO from staging
        - resource.attributes["deployment.environment"] == "staging"
            and severity_number < 9

  # Transform processor can also downgrade log levels
  # for specific noisy libraries.
  transform/normalize:
    log_statements:
      - context: log
        statements:
          # Some libraries log connection pool stats at INFO level
          # every second. Downgrade these to DEBUG so they get
          # filtered out in production.
          - set(severity_number, 5) where
              resource.attributes["service.name"] == "api-gateway"
              and IsMatch(body, ".*connection pool stats.*")

  batch:
    send_batch_size: 8192
    timeout: 5s

exporters:
  otlphttp:
    endpoint: https://log-backend.internal:4318

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [transform/normalize, filter/log_levels, batch]
      exporters: [otlphttp]
```

## Approach 3: Dynamic Log Level Control

Sometimes you need DEBUG logs from a production service during an active incident. Rather than redeploying with a different log level, use the OpenTelemetry Collector's `remotetap` extension or a feature flag to temporarily increase verbosity.

Here is a pattern using environment variables that can be updated without restarting:

```yaml
# Kubernetes deployment with a configmap-based log level
# that can be changed with a kubectl command during incidents.
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-log-config
  namespace: production
data:
  # Change this value during incidents, then restart the pod
  # or use a sidecar that watches for configmap changes.
  MIN_LOG_LEVEL: "WARN"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-api
spec:
  template:
    spec:
      containers:
        - name: checkout-api
          envFrom:
            - configMapRef:
                name: otel-log-config
          env:
            - name: DEPLOYMENT_ENVIRONMENT
              value: "production"
            - name: OTEL_RESOURCE_ATTRIBUTES
              value: "service.name=checkout-api"
```

## Severity Number Reference

OpenTelemetry uses numeric severity levels. Here is the mapping to keep handy when writing filter conditions:

| Severity | Number Range | Common Name |
|----------|-------------|-------------|
| TRACE | 1-4 | TRACE/VERBOSE |
| DEBUG | 5-8 | DEBUG |
| INFO | 9-12 | INFO |
| WARN | 13-16 | WARN |
| ERROR | 17-20 | ERROR |
| FATAL | 21-24 | FATAL/CRITICAL |

## Measuring the Impact

After implementing log level optimization, track the reduction:

```promql
# Compare log volume before and after filtering.
# Group by environment to verify production is filtered.
sum by (deployment_environment) (
  rate(otel_exporter_sent_log_records_total[1h])
)
```

A well-configured log level strategy typically reduces production log volume by 60-80% while preserving every signal that matters for alerting and debugging. The key insight is layering: SDK-level filtering for efficiency, Collector-level filtering for safety, and dynamic controls for incident response.
