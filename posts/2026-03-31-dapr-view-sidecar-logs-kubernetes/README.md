# How to View Dapr Sidecar Logs on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Logging, Sidecar, Observability

Description: Learn multiple ways to view and filter Dapr sidecar logs on Kubernetes, including structured JSON logging, log streaming, and aggregation with Loki.

---

## Accessing Sidecar Logs with kubectl

The Dapr sidecar container is named `daprd`. Use the `-c daprd` flag to target it:

```bash
# View last 100 lines of sidecar logs
kubectl logs <pod-name> -c daprd --tail=100

# Follow live log stream
kubectl logs -f <pod-name> -c daprd

# View logs for all pods with a label selector
kubectl logs -l app=order-service -c daprd --tail=50

# View previous container logs (after a crash)
kubectl logs <pod-name> -c daprd --previous
```

## Enabling Structured JSON Logging

Enable JSON format logs for easier parsing by log aggregators:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/log-as-json: "true"
  dapr.io/log-level: "info"
```

JSON log output example:

```json
{"level":"info","time":"2026-03-31T10:05:22Z","msg":"component loaded","app_id":"order-service","component_name":"statestore","component_type":"state.redis"}
{"level":"info","time":"2026-03-31T10:05:23Z","msg":"api_response","status":200,"method":"GetState","elapsed_ms":3.5}
```

## Enabling API Call Logging

To log every Dapr API call made by the app:

```yaml
annotations:
  dapr.io/enable-api-logging: "true"
```

Then filter for specific operations:

```bash
kubectl logs -l app=order-service -c daprd | grep "api_response" | jq .
```

## Filtering Logs by Level

```bash
# Only errors
kubectl logs <pod> -c daprd | grep '"level":"error"'

# Component init logs
kubectl logs <pod> -c daprd | grep '"msg":"component loaded"'

# Subscription messages
kubectl logs <pod> -c daprd | grep -E "pubsub|subscribe|publish"
```

## Aggregating Logs with Loki

If you run Grafana Loki for log aggregation, Dapr JSON logs integrate seamlessly:

```yaml
# promtail/fluent-bit label configuration
pipeline_stages:
- json:
    expressions:
      level: level
      app_id: app_id
      component: component_name
- labels:
    level:
    app_id:
    component:
```

Query in Grafana:

```bash
{app="order-service", container="daprd"} | json | level="error"
```

## Checking Control Plane Component Logs

```bash
# Dapr operator (handles component CRDs)
kubectl logs -n dapr-system deployment/dapr-operator --tail=50

# Dapr sidecar injector (webhook injection)
kubectl logs -n dapr-system deployment/dapr-sidecar-injector --tail=50

# Dapr sentry (mTLS certificates)
kubectl logs -n dapr-system deployment/dapr-sentry --tail=50
```

## Summary

Dapr sidecar logs are accessible via `kubectl logs -c daprd` and provide detailed information about component initialization, API calls, and errors. Enabling `dapr.io/log-as-json: "true"` produces structured logs that integrate with Loki, Elasticsearch, and other log aggregation systems for production observability.
