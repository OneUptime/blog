# How to Configure Dapr Log Level and Format

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Logging, Observability, Configuration, JSON

Description: Configure Dapr sidecar log level, output format (JSON vs plain text), and log destinations for structured logging pipelines and observability stacks.

---

## Overview

Dapr sidecar (`daprd`) produces structured logs that can be tuned by level (`debug`, `info`, `warn`, `error`) and format (`text` or `json`). JSON logs integrate directly with log aggregation tools (Fluentd, Loki, Datadog, Splunk). Proper log configuration is essential for production observability.

## Log Level Hierarchy

```mermaid
graph LR
    D["debug\n(most verbose)"] --> I["info"]
    I --> W["warn"]
    W --> E["error\n(least verbose)"]
```

| Level | When to use |
|---|---|
| `debug` | Development, diagnosing Dapr internals |
| `info` | Production default; key lifecycle events |
| `warn` | Non-fatal issues that may need attention |
| `error` | Failures that affect functionality |

## Self-Hosted Configuration

### Set Log Level

```bash
# info (default)
dapr run --app-id my-service --log-level info -- go run main.go

# debug (verbose)
dapr run --app-id my-service --log-level debug -- go run main.go

# warn (quiet)
dapr run --app-id my-service --log-level warn -- go run main.go
```

### Set Log Format

```bash
# JSON format (default in production containers)
dapr run \
  --app-id my-service \
  --log-level info \
  --log-as-json \
  -- go run main.go

# Plain text format (default for human-readable output)
dapr run \
  --app-id my-service \
  --log-level info \
  -- go run main.go
```

### JSON Log Sample

```json
{
  "level": "info",
  "time": "2026-03-31T10:00:00.000Z",
  "type": "log",
  "msg": "starting Dapr Runtime",
  "app_id": "my-service",
  "scope": "dapr.runtime",
  "instance": "my-host-pod-abc123",
  "ver": "1.14.0"
}
```

### Plain Text Log Sample

```text
time="2026-03-31T10:00:00Z" level=info type=log msg="starting Dapr Runtime" app_id=my-service scope=dapr.runtime ver=1.14.0
```

## Kubernetes Configuration

### Via Pod Annotations

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-service"
        dapr.io/app-port: "8080"
        dapr.io/log-level: "info"
        dapr.io/log-as-json: "true"
    spec:
      containers:
      - name: my-service
        image: myapp:latest
```

Available log annotations:

| Annotation | Values | Default |
|---|---|---|
| `dapr.io/log-level` | `debug`, `info`, `warn`, `error` | `info` |
| `dapr.io/log-as-json` | `"true"`, `"false"` | `"false"` |

### Global Default via Helm Values

Set defaults for all sidecars deployed in the cluster:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_operator.logLevel=info \
  --set dapr_sidecar_injector.logLevel=info \
  --set global.logAsJson=true
```

Or via `values.yaml`:

```yaml
# helm/values.yaml
global:
  logAsJson: true

dapr_operator:
  logLevel: info

dapr_placement:
  logLevel: warn
```

## Dapr System Services Log Level

The Dapr system pods (operator, placement, sentry, scheduler) have their own log flags:

```bash
# Check current Dapr system service log levels
kubectl logs -n dapr-system -l app=dapr-operator | head -5

# Change log level via Helm upgrade
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_operator.logLevel=debug
```

## Structured Log Fields Reference

| Field | Description |
|---|---|
| `level` | Log level (`debug`, `info`, `warn`, `error`) |
| `time` | ISO 8601 timestamp |
| `type` | Log entry type (always `log`) |
| `msg` | Human-readable message |
| `app_id` | Dapr app ID |
| `scope` | Internal Dapr subsystem (`dapr.runtime`, `dapr.grpc.api`, etc.) |
| `instance` | Pod or host name |
| `ver` | Dapr runtime version |

## Fluentd / FluentBit Integration

Parse Dapr JSON logs in FluentBit:

```yaml
# fluentbit-config.yaml
[INPUT]
    Name              tail
    Tag               dapr.*
    Path              /var/log/containers/*_daprd_*.log
    Parser            docker
    Refresh_Interval  5

[FILTER]
    Name              parser
    Match             dapr.*
    Key_Name          log
    Parser            json

[OUTPUT]
    Name              loki
    Match             dapr.*
    Host              loki.monitoring.svc.cluster.local
    Port              3100
    Labels            job=dapr,app=$app_id,level=$level
```

## Loki Query Examples

```logql
# All Dapr errors
{job="dapr"} | json | level="error"

# Errors for a specific app
{job="dapr"} | json | app_id="order-service" | level="error"

# Component-related logs
{job="dapr"} | json | component != "" | level="warn" or level="error"

# Service invocation logs
{job="dapr"} | json | scope="dapr.grpc.api"
```

## Enabling Debug Logs for Specific Scopes (Advanced)

In self-hosted mode, you can tune logging at the Go logger scope level:

```bash
# This sets ALL scopes to debug; filter in your log aggregator
dapr run --log-level debug --app-id my-service -- go run main.go
```

## Checking What Your Sidecar Logs at Startup

```bash
# Self-hosted: watch the sidecar output
dapr run --app-id test --log-level debug 2>&1 | head -50

# Kubernetes: follow sidecar container logs
kubectl logs -f pod/my-pod-xyz -c daprd

# Filter for specific scope
kubectl logs pod/my-pod-xyz -c daprd | grep '"scope":"dapr.runtime.pubsub"'
```

## Summary

Dapr sidecar log level is controlled by `--log-level` (CLI) or the `dapr.io/log-level` annotation (Kubernetes). JSON format is enabled with `--log-as-json` or `dapr.io/log-as-json: "true"`. Use `info` in production for key lifecycle events and `debug` for troubleshooting. JSON logs integrate directly with Fluentd, Loki, and Datadog. Standard JSON fields (`level`, `msg`, `app_id`, `scope`, `component`) enable precise filtering in log aggregation pipelines.
