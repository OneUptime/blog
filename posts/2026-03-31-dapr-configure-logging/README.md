# How to Configure Dapr Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Logging, Configuration, Kubernetes, Observability

Description: Configure Dapr sidecar logging format, output level, and JSON mode to produce structured logs compatible with your log aggregation platform.

---

Dapr sidecars log startup events, component initialization, API calls, and errors. Proper logging configuration ensures your logs are structured, at the right verbosity, and routed to the correct aggregation backend.

## Dapr Log Configuration Options

The Dapr sidecar accepts logging configuration via command-line flags and Kubernetes annotations:

| Option | Annotation | Default |
|--------|-----------|---------|
| Log level | `dapr.io/log-level` | `info` |
| JSON format | `dapr.io/log-as-json` | `false` |

## Setting Log Level via Annotation

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/log-level: "info"
        dapr.io/log-as-json: "true"
```

Valid log levels from most to least verbose: `debug`, `info`, `warn`, `error`.

## Enabling JSON Structured Logging

JSON format is required for most log aggregation platforms (ELK, Loki, Datadog, etc.):

```yaml
metadata:
  annotations:
    dapr.io/log-as-json: "true"
```

With JSON enabled, each log line is a JSON object:

```json
{"time":"2026-03-31T10:00:00.000Z","level":"info","type":"log","msg":"starting Dapr Runtime","ver":"1.13.0","scope":"dapr.runtime","instance":"order-service"}
{"time":"2026-03-31T10:00:01.000Z","level":"info","type":"log","msg":"component loaded. name: statestore, type: state.redis","ver":"1.13.0","scope":"dapr.runtime","instance":"order-service"}
```

## Global Default via Helm

Set logging defaults for all Dapr sidecars at installation time:

```bash
helm install dapr dapr/dapr \
  --namespace dapr-system \
  --set global.logAsJson=true \
  --set dapr_sidecar_injector.logLevel=info \
  --set dapr_operator.logLevel=info \
  --set dapr_placement.logLevel=info
```

Or update an existing installation:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --reuse-values \
  --set global.logAsJson=true
```

## Configuring Log Output in Self-Hosted Mode

When running Dapr outside Kubernetes, pass the log level flag directly:

```bash
dapr run \
  --app-id order-service \
  --app-port 8080 \
  --log-level info \
  -- node app.js
```

To enable JSON logging in self-hosted mode, run `daprd` directly instead of using `dapr run`:

```bash
daprd \
  --app-id order-service \
  --app-port 8080 \
  --log-level info \
  --log-as-json \
  --app-protocol http
```

## Viewing Sidecar Logs

```bash
# Follow sidecar logs for a specific pod
kubectl logs -f deploy/order-service -c daprd

# Filter for errors only
kubectl logs deploy/order-service -c daprd | grep '"level":"error"'

# Follow logs across all Dapr-enabled pods
kubectl logs -l dapr.io/enabled=true -c daprd --all-namespaces
```

## Common Startup Log Messages

Look for these messages to confirm correct initialization:

```bash
# Component loaded successfully
kubectl logs deploy/order-service -c daprd | grep "component loaded"

# Confirm app port connectivity
kubectl logs deploy/order-service -c daprd | grep "app channel"

# Check mTLS initialization
kubectl logs deploy/order-service -c daprd | grep "mTLS"
```

## Summary

Dapr logging configuration is controlled by two key annotations: `dapr.io/log-level` for verbosity and `dapr.io/log-as-json` for structured output. Always enable JSON logging in production environments to ensure log aggregation tools can parse and index sidecar logs. Set global defaults via Helm and override per-deployment as needed. Use `debug` level only temporarily during troubleshooting as it significantly increases log volume.
