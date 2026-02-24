# How to Audit Service-to-Service Communication in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Auditing, Security, Observability, Service Mesh

Description: How to set up comprehensive auditing for service-to-service communication in Istio including access logs, telemetry, and compliance reporting.

---

When someone asks "which services talked to each other last Tuesday at 3 AM?", you need to have an answer. Auditing service-to-service communication is a requirement for compliance frameworks like SOC 2, PCI DSS, and HIPAA, and it is essential for incident response and forensics. Istio gives you the building blocks for comprehensive audit trails without modifying your application code.

The sidecar proxy intercepts every request between services, which means it can log every connection, every request, and every response. The question is how to capture this data effectively without drowning in noise or creating storage problems.

## What to Audit

For a meaningful audit trail, capture these data points for each service-to-service interaction:

- Source workload identity (service account)
- Destination workload identity
- Timestamp
- HTTP method and path (for HTTP/gRPC traffic)
- Response code
- Request duration
- TLS version and cipher suite used
- Whether mTLS was used
- Source and destination IP addresses
- Request and response sizes

## Enabling Envoy Access Logging

Istio's primary auditing mechanism is Envoy access logging. Enable it mesh-wide:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    accessLogFormat: ""
    enableAccessLogForExternalTraffic: true
```

The default access log format captures most audit-relevant fields. For a custom format that focuses on audit fields:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    defaultConfig:
      accessLog:
        - name: audit-log
          filter:
            responseFlagFilter:
              flags: []
          provider:
            name: envoy
```

## Structured JSON Access Logs

JSON logging is better for auditing because it is easier to parse and query. The default JSON access log includes these fields:

```json
{
  "authority": "payment-service.production:8080",
  "bytes_received": 0,
  "bytes_sent": 356,
  "connection_termination_details": null,
  "downstream_local_address": "10.244.0.15:8080",
  "downstream_remote_address": "10.244.0.12:45678",
  "duration": 3,
  "method": "POST",
  "path": "/process-payment",
  "protocol": "HTTP/2",
  "request_id": "abc-123-def-456",
  "requested_server_name": "outbound_.8080_._.payment-service.production.svc.cluster.local",
  "response_code": 200,
  "response_flags": "-",
  "route_name": "default",
  "start_time": "2026-02-24T10:30:00.000Z",
  "upstream_cluster": "inbound|8080||",
  "upstream_host": "127.0.0.1:8080",
  "upstream_service_time": "2",
  "upstream_transport_failure_reason": null,
  "x_forwarded_for": null
}
```

## Telemetry API for Audit Configuration

Istio's Telemetry API gives you more control over what gets logged and where:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: audit-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 200"
```

For namespace-specific audit configuration:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: production-audit
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "true"
```

To log only specific events (failed requests, requests to sensitive services):

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: sensitive-audit
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "true"
```

## Authorization Policy Audit Mode

Istio supports a CUSTOM action for authorization policies that can be used for audit logging without actually blocking traffic:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: audit-all-access
  namespace: production
spec:
  action: AUDIT
  rules:
    - to:
        - operation:
            paths: ["/api/*"]
```

The AUDIT action logs the request matching without allowing or denying it. Combine it with ALLOW and DENY policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: audit-sensitive-paths
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  action: AUDIT
  rules:
    - to:
        - operation:
            paths: ["/admin/*", "/internal/*"]
    - from:
        - source:
            notPrincipals: ["cluster.local/ns/production/sa/api-gateway"]
```

This audits requests to admin and internal paths, and requests from unexpected service accounts.

## Collecting Audit Logs

Access logs go to stdout of the istio-proxy container. You need a log collection pipeline to ship them to a central store.

### Using Fluentd/Fluent Bit

Deploy Fluent Bit as a DaemonSet to collect sidecar logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         5
        Log_Level     info
        Parsers_File  parsers.conf

    [INPUT]
        Name              tail
        Tag               istio.*
        Path              /var/log/containers/*istio-proxy*.log
        Parser            docker
        Refresh_Interval  10

    [FILTER]
        Name          parser
        Match         istio.*
        Key_Name      log
        Parser        json

    [OUTPUT]
        Name          es
        Match         istio.*
        Host          elasticsearch.logging.svc.cluster.local
        Port          9200
        Index         istio-audit
        Type          _doc
```

### Using OpenTelemetry Collector

For a more modern approach, use the OpenTelemetry Collector:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: otel-audit
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: otel
```

Configure the OpenTelemetry provider in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: otel
        opentelemetry:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
```

## Querying Audit Data

Once logs are in Elasticsearch, you can query for specific audit scenarios:

Find all requests to the payment service from unauthorized sources:

```json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "authority": "payment-service" }},
        { "range": { "response_code": { "gte": 403, "lte": 403 }}}
      ],
      "filter": {
        "range": {
          "start_time": {
            "gte": "2026-02-23T00:00:00Z",
            "lte": "2026-02-24T00:00:00Z"
          }
        }
      }
    }
  }
}
```

Find all inter-service communication for a specific service:

```json
{
  "query": {
    "bool": {
      "should": [
        { "match": { "upstream_cluster": "payment-service" }},
        { "match": { "authority": "payment-service" }}
      ]
    }
  }
}
```

## Istio Metrics for Audit

Beyond access logs, Istio metrics provide aggregate audit data through Prometheus:

```bash
# Total requests between services
istio_requests_total{source_workload="frontend", destination_workload="api-gateway"}

# Failed requests (potential security events)
istio_requests_total{response_code="403"}

# Requests without mTLS (security concern)
istio_requests_total{connection_security_policy="none"}
```

Create alerts for audit-relevant events:

```yaml
groups:
  - name: istio-audit-alerts
    rules:
      - alert: UnauthorizedAccessAttempt
        expr: rate(istio_requests_total{response_code="403"}[5m]) > 10
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "High rate of 403 responses detected"
      - alert: PlaintextCommunication
        expr: istio_requests_total{connection_security_policy="none"} > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Plaintext communication detected in mesh"
```

## Retention and Compliance

For compliance, define retention policies for audit data:

- **SOC 2**: Typically requires 1 year of audit logs
- **PCI DSS**: Requires at least 1 year, with 3 months immediately available
- **HIPAA**: Requires 6 years of audit trails

Configure your log storage accordingly. Use index lifecycle management in Elasticsearch or equivalent features in your log backend to automatically age out old data while keeping it accessible for the required period.

Auditing service-to-service communication in Istio is about setting up the right logging, collecting it reliably, and making it queryable. The mesh provides the raw data - your job is to build the pipeline and the queries that turn that data into meaningful audit trails.
