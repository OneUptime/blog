# How to Audit Dapr API Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Security, Audit, Logging, Observability

Description: Learn how to audit Dapr API access by enabling structured logging, integrating with log aggregation platforms, and building audit trails for compliance.

---

## Overview

Auditing Dapr API access means recording who called what, when, and with what result. Dapr emits structured logs for every API call through its sidecar, which you can collect, filter, and alert on. Combined with Kubernetes audit logs and distributed tracing, you get a complete picture of activity across your microservices.

## Enabling JSON Structured Logging

By default, Dapr sidecars output structured JSON logs. Ensure this is not disabled:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/log-level: "info"
  dapr.io/log-as-json: "true"
```

A typical sidecar log entry looks like:

```json
{
  "time": "2026-03-31T10:23:45.123Z",
  "level": "info",
  "type": "log",
  "msg": "HTTP API Called",
  "app_id": "order-service",
  "method": "POST",
  "path": "/v1.0/state/my-store",
  "status": 200,
  "duration": "12ms",
  "ver": "1.12.0"
}
```

## Collecting Logs with Fluent Bit

Deploy Fluent Bit as a DaemonSet to collect sidecar logs and forward them to a log aggregation platform:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: kube-system
data:
  fluent-bit.conf: |
    [INPUT]
        Name              tail
        Path              /var/log/containers/*dapr*.log
        Parser            docker
        Tag               dapr.*
        Refresh_Interval  5

    [FILTER]
        Name    grep
        Match   dapr.*
        Regex   msg HTTP API Called

    [OUTPUT]
        Name  es
        Match dapr.*
        Host  elasticsearch.logging.svc
        Port  9200
        Index dapr-audit
```

## Filtering Specific API Calls

To create an audit trail focused on sensitive operations like secret access, filter log lines by path:

```bash
kubectl logs -l app=order-service -c daprd --since=1h \
  | grep -E '"path":"/v1.0/secrets' \
  | jq '{time, app_id, path, status}'
```

## Using OpenTelemetry Traces for Audit

Enable tracing on the Dapr sidecar to record every API call with full context:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing-config
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://jaeger-collector:9411/api/v2/spans"
```

Each span includes the app ID, method, component name, and result code, providing a correlation ID that links API calls across services.

## Alerting on Anomalous Access

Set up alerts in your log platform for suspicious patterns:

- High rate of `401` or `403` responses indicating failed authentication
- Access to secret APIs from unexpected app IDs
- Sudden spike in state write operations

Example Prometheus alert rule (using the Dapr metrics endpoint):

```yaml
groups:
- name: dapr-security
  rules:
  - alert: DaprAPIAuthFailures
    expr: |
      increase(dapr_http_server_response_count{status="401"}[5m]) > 10
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "High rate of Dapr API authentication failures"
```

## Summary

Auditing Dapr API access requires structured logging from sidecars, log collection via Fluent Bit or similar agents, distributed tracing for full call context, and alerting on anomalous patterns. Together these tools give you the audit trail needed for security compliance and incident investigation.
