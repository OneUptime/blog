# How to Configure Dapr Sidecar Log Verbosity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sidecar, Logging, Kubernetes, Observability

Description: Configure Dapr sidecar log verbosity levels to control the volume and detail of logs emitted by daprd, from info-level production logs to debug traces for troubleshooting.

---

The Dapr sidecar emits logs for every component initialization, API call, and internal event. In production, verbose logging can flood your log aggregator and increase storage costs. In development, you want detailed traces to understand what is happening. Dapr gives you fine-grained control over log verbosity.

## Available Log Levels

Dapr supports standard log levels:

| Level | Use Case |
|-------|----------|
| `debug` | Detailed tracing, development troubleshooting |
| `info` | Normal operation events (default) |
| `warn` | Warnings that do not require immediate action |
| `error` | Errors that may affect functionality |
| `fatal` | Critical errors that cause shutdown |

## Setting Log Level via Annotation

In Kubernetes, set the log level using a pod annotation:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "inventory-service"
  dapr.io/log-level: "info"
```

To enable debug logging during troubleshooting:

```yaml
annotations:
  dapr.io/log-level: "debug"
```

## Enable JSON Logging

For production environments where logs are ingested by a log aggregator (ELK, Loki, etc.), enable JSON-formatted logs:

```yaml
annotations:
  dapr.io/log-as-json: "true"
```

With JSON logging enabled, each log line is a structured JSON object:

```json
{
  "time": "2026-03-31T10:00:00Z",
  "level": "info",
  "type": "log",
  "msg": "component loaded. name: statestore (state.redis/v1)",
  "scope": "dapr.runtime",
  "instance": "inventory-service-pod-xxxx",
  "ver": "1.14.0"
}
```

## Setting Log Level via CLI (Self-Hosted)

When running Dapr in self-hosted mode:

```bash
dapr run --app-id my-service \
  --log-level debug \
  --log-as-json \
  -- node app.js
```

## Setting Global Log Level via Helm

Set the log level for Dapr system components (sidecar injector, operator, placement, sentry) when deploying Dapr with Helm:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_sidecar_injector.logLevel=info \
  --set dapr_operator.logLevel=info \
  --set dapr_placement.logLevel=info \
  --set dapr_sentry.logLevel=info
```

To set the default log level for injected sidecars, use the `dapr.io/log-level` annotation on each pod or apply it across deployments using Kustomize or a policy engine.

## Filtering Logs by Component

With JSON logging, use jq to filter logs from specific scopes or components:

```bash
kubectl logs my-pod -c daprd | jq 'select(.scope == "dapr.runtime")'
kubectl logs my-pod -c daprd | jq 'select(.level == "error")'
kubectl logs my-pod -c daprd | jq 'select(.msg | contains("statestore"))'
```

## Temporarily Increasing Verbosity

You can restart a pod with increased log verbosity using `kubectl patch` without editing the original manifest:

```bash
kubectl patch deployment my-deployment -p \
  '{"spec":{"template":{"metadata":{"annotations":{"dapr.io/log-level":"debug"}}}}}'
```

After troubleshooting, restore the original log level.

## Summary

Configuring Dapr sidecar log verbosity lets you balance observability with operational cost. Use `info` level with JSON logging in production, enable `debug` temporarily during troubleshooting, and use structured log queries to filter the signals you care about without being overwhelmed by noise.
