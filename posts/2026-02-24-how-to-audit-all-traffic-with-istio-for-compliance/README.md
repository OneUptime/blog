# How to Audit All Traffic with Istio for Compliance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Auditing, Compliance, Access Logs, Telemetry

Description: Complete guide to auditing all network traffic in an Istio service mesh for regulatory compliance and security monitoring.

---

When compliance requirements say "audit all traffic," they mean you need to be able to answer questions like: Which service accessed the database at 3 AM? Was the connection encrypted? What data was transferred? How long did the operation take? Istio sits in the middle of every service-to-service connection, making it the perfect place to collect this audit data.

Setting up comprehensive traffic auditing in Istio involves configuring access logs, telemetry, and log forwarding. Done right, you get a complete record of every network interaction in your mesh.

## Enabling Access Logs

Access logs are the foundation of traffic auditing. Every request and TCP connection through Envoy generates a log entry with detailed metadata.

### Basic Access Log Configuration

Enable access logging mesh-wide:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

This logs every request in JSON format to stdout, where your container log collector picks it up. For compliance, JSON is preferred over TEXT because it's easier to parse and query.

### Custom Access Log Format

The default format doesn't capture everything you need for compliance. Create a comprehensive format:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    accessLogFormat: |
      {
        "start_time": "%START_TIME%",
        "request_method": "%REQ(:METHOD)%",
        "request_path": "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%",
        "protocol": "%PROTOCOL%",
        "response_code": "%RESPONSE_CODE%",
        "response_flags": "%RESPONSE_FLAGS%",
        "bytes_received": "%BYTES_RECEIVED%",
        "bytes_sent": "%BYTES_SENT%",
        "duration_ms": "%DURATION%",
        "upstream_service_time": "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%",
        "source_address": "%DOWNSTREAM_REMOTE_ADDRESS%",
        "source_principal": "%DOWNSTREAM_PEER_URI_SAN%",
        "source_namespace": "%DOWNSTREAM_PEER_NAMESPACE%",
        "destination_address": "%UPSTREAM_HOST%",
        "destination_principal": "%UPSTREAM_PEER_URI_SAN%",
        "destination_service": "%UPSTREAM_CLUSTER%",
        "connection_id": "%CONNECTION_ID%",
        "request_id": "%REQ(X-REQUEST-ID)%",
        "authority": "%REQ(:AUTHORITY)%",
        "user_agent": "%REQ(USER-AGENT)%",
        "tls_version": "%DOWNSTREAM_TLS_VERSION%",
        "tls_cipher": "%DOWNSTREAM_TLS_CIPHER%",
        "connection_termination_details": "%CONNECTION_TERMINATION_DETAILS%",
        "route_name": "%ROUTE_NAME%",
        "upstream_transport_failure_reason": "%UPSTREAM_TRANSPORT_FAILURE_REASON%"
      }
```

This captures:
- **Who** accessed what (source and destination principals, SPIFFE identities)
- **What** was accessed (method, path, authority)
- **When** it happened (start_time)
- **How** the connection was secured (tls_version, tls_cipher)
- **What happened** (response_code, duration, bytes transferred)

## Enabling Telemetry API

Istio's Telemetry API provides more flexible control over what gets logged:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "true"
```

The `expression: "true"` means log everything. You can also filter selectively:

```yaml
# Log only failed requests
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: error-logging
  namespace: default
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

For compliance, you typically want to log everything, but you can use different log levels for different types of traffic:

```yaml
# Enhanced logging for PII services
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: pii-audit
  namespace: pii-services
spec:
  accessLogging:
    - providers:
        - name: envoy
```

## TCP Traffic Auditing

HTTP access logs capture request-level details, but TCP traffic (databases, message queues) doesn't have HTTP methods and paths. Envoy still logs TCP connections:

```bash
# TCP log entries show connection-level information
kubectl logs my-pod -c istio-proxy | grep tcp
```

TCP logs include:
- Source and destination addresses
- Connection duration
- Bytes transferred
- TLS information

For database connections, the bytes transferred metric can be particularly useful for detecting unusual data access patterns.

## Configuring Log Forwarding

Audit logs need to be stored in a centralized, tamper-proof location. Forward them from your cluster to a log management system.

### Using Fluent Bit

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:latest
          volumeMounts:
            - name: varlog
              mountPath: /var/log
            - name: config
              mountPath: /fluent-bit/etc
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: config
          configMap:
            name: fluent-bit-config
---
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
        Path              /var/log/containers/*istio-proxy*.log
        Parser            docker
        Tag               istio.*
        Refresh_Interval  10

    [FILTER]
        Name          parser
        Match         istio.*
        Key_Name      log
        Parser        json
        Reserve_Data  On

    [OUTPUT]
        Name          s3
        Match         istio.*
        bucket        audit-logs-bucket
        region        us-east-1
        total_file_size 50M
        s3_key_format /istio-audit/%Y/%m/%d/$TAG[1]_%H%M%S.json

  parsers.conf: |
    [PARSER]
        Name        docker
        Format      json
        Time_Key    time
        Time_Format %Y-%m-%dT%H:%M:%S.%L
```

### Using OpenTelemetry Collector

For a more modern approach, use the OpenTelemetry Collector:

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

Then configure the Telemetry resource to use it:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: otel-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: otel
```

## Monitoring for Compliance Violations

Beyond logging, set up active monitoring to detect compliance violations:

```yaml
# Prometheus alerts for compliance monitoring
groups:
  - name: compliance-audit
    rules:
      # Detect plaintext (non-mTLS) connections
      - alert: PlaintextConnection
        expr: |
          sum(rate(istio_tcp_connections_opened_total{
            connection_security_policy="none"
          }[5m])) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Plaintext connection detected in mesh"

      # Detect access from unauthorized namespaces
      - alert: CrossNamespaceAccess
        expr: |
          sum(rate(istio_requests_total{
            source_workload_namespace!="production",
            destination_service_namespace="production"
          }[5m])) > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Cross-namespace access to production detected"

      # Detect denied requests (potential unauthorized access attempts)
      - alert: HighDeniedRequests
        expr: |
          sum(rate(istio_requests_total{response_code="403"}[5m])) by (source_workload, destination_service) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High rate of denied requests from {{ $labels.source_workload }}"
```

## Querying Audit Logs

Once logs are in your log management system, you need to be able to query them for audits. Here are common audit queries:

```bash
# Who accessed the user-data-service in the last 24 hours?
# (Elasticsearch query)
{
  "query": {
    "bool": {
      "must": [
        {"match": {"destination_service": "user-data-service"}},
        {"range": {"start_time": {"gte": "now-24h"}}}
      ]
    }
  }
}

# Were there any unencrypted connections?
{
  "query": {
    "bool": {
      "must_not": [
        {"exists": {"field": "tls_version"}}
      ]
    }
  }
}

# What services did the admin-tool access?
{
  "query": {
    "match": {"source_principal": "*admin-tool*"}
  }
}
```

## Ensuring Log Integrity

For compliance, logs must be tamper-proof. Several approaches:

1. **Write-once storage** - Send logs to S3 with Object Lock enabled
2. **Log signing** - Use a log signing service to cryptographically sign log batches
3. **Separate access control** - Use different IAM roles for log writing vs. reading

```bash
# Enable S3 Object Lock for audit log bucket
aws s3api put-object-lock-configuration \
  --bucket audit-logs-bucket \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "COMPLIANCE",
        "Years": 7
      }
    }
  }'
```

## Verifying Audit Coverage

Regularly verify that all services are being audited:

```bash
# Check which pods have sidecars (and therefore audit logging)
kubectl get pods -A -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
total = 0
with_sidecar = 0
for pod in data['items']:
    ns = pod['metadata']['namespace']
    if ns in ['kube-system', 'kube-node-lease']:
        continue
    total += 1
    containers = [c['name'] for c in pod['spec']['containers']]
    if 'istio-proxy' in containers:
        with_sidecar += 1
    else:
        print(f'NO AUDIT: {ns}/{pod[\"metadata\"][\"name\"]}')
print(f'\nCoverage: {with_sidecar}/{total} pods ({100*with_sidecar//total}%)')
"
```

Any pod without a sidecar is a gap in your audit coverage. For true compliance, you need 100% coverage or documented exceptions for system namespaces.

Traffic auditing with Istio gives you visibility into every network interaction in your mesh. The combination of detailed access logs, centralized storage, active monitoring, and tamper-proof retention creates an audit trail that satisfies most regulatory frameworks.
