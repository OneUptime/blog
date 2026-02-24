# How to Set Up Audit Logging in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Audit Logging, Compliance, Observability, Kubernetes

Description: A complete guide to configuring audit logging in Istio for compliance, security investigations, and operational visibility.

---

Audit logging records who did what, when, and whether it was allowed. In a service mesh, that means capturing every service-to-service request with enough detail to reconstruct what happened during a security incident or satisfy a compliance auditor.

Istio generates access logs from every Envoy sidecar proxy, which gives you a natural audit trail for all service communication. But the default configuration might not capture everything you need, and you need to make sure those logs get to a safe place where they can't be tampered with.

## Enabling Access Logging

The simplest way to enable access logging across the entire mesh is with the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-audit-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
```

This enables access logging for every sidecar in the mesh. Logs go to stdout of the istio-proxy container, which means your cluster's log collection pipeline will pick them up.

You can also enable it through the IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

JSON encoding is better for audit purposes because it's structured and easier to parse, query, and index.

## Customizing the Log Format

The default access log format captures the basics, but for audit purposes you might want additional fields. Here's a custom format that captures audit-relevant information:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    accessLogFormat: |
      {
        "timestamp": "%START_TIME%",
        "source_identity": "%DOWNSTREAM_PEER_URI_SAN%",
        "source_ip": "%DOWNSTREAM_REMOTE_ADDRESS%",
        "source_namespace": "%DOWNSTREAM_PEER_NAMESPACE%",
        "destination_service": "%UPSTREAM_CLUSTER%",
        "destination_ip": "%UPSTREAM_HOST%",
        "method": "%REQ(:METHOD)%",
        "path": "%REQ(PATH)%",
        "protocol": "%PROTOCOL%",
        "response_code": "%RESPONSE_CODE%",
        "response_flags": "%RESPONSE_FLAGS%",
        "bytes_received": "%BYTES_RECEIVED%",
        "bytes_sent": "%BYTES_SENT%",
        "duration_ms": "%DURATION%",
        "authority": "%REQ(:AUTHORITY)%",
        "user_agent": "%REQ(USER-AGENT)%",
        "request_id": "%REQ(X-REQUEST-ID)%",
        "trace_id": "%REQ(X-B3-TRACEID)%",
        "tls_version": "%DOWNSTREAM_TLS_VERSION%",
        "tls_cipher": "%DOWNSTREAM_TLS_CIPHER%",
        "connection_mtls": "%DOWNSTREAM_PEER_ISSUER%"
      }
```

This format captures:

- **Who**: Source identity (SPIFFE URI), source IP, source namespace
- **What**: HTTP method, path, authority
- **When**: Timestamp
- **Result**: Response code, response flags, duration
- **Security context**: TLS version, cipher suite, whether mTLS was used
- **Correlation**: Request ID, trace ID for cross-referencing with traces

## Selective Logging for Sensitive Namespaces

You might not want to log everything everywhere (the volume can be enormous). Use the Telemetry API to enable detailed logging only where it matters:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: sensitive-namespace-logging
  namespace: payment-processing
spec:
  accessLogging:
    - providers:
        - name: envoy
```

For less sensitive namespaces, you can log only errors:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: error-only-logging
  namespace: internal-tools
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

Or log based on other conditions:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: audit-critical-ops
  namespace: user-service
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "request.method == 'DELETE' || request.method == 'PUT' || response.code == 403"
```

This logs all write operations and all denied access attempts, which is typically what auditors care about most.

## Shipping Logs to Tamper-Proof Storage

Audit logs lose their value if someone can modify or delete them. Ship them to immutable storage as quickly as possible.

### Fluentd/Fluent Bit to S3 with Object Lock

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush        5
        Log_Level    info
        Parsers_File parsers.conf

    [INPUT]
        Name             tail
        Path             /var/log/containers/*istio-proxy*.log
        Parser           docker
        Tag              istio.*
        Mem_Buf_Limit    50MB

    [FILTER]
        Name    parser
        Match   istio.*
        Key_Name log
        Parser  json
        Reserve_Data On

    [OUTPUT]
        Name              s3
        Match             istio.*
        bucket            audit-logs-immutable
        region            us-west-2
        total_file_size   50M
        upload_timeout    5m
        s3_key_format     /istio-audit/%Y/%m/%d/%H/$TAG_%M%S
        use_put_object    On
```

Configure the S3 bucket with Object Lock for immutability:

```bash
aws s3api put-object-lock-configuration \
  --bucket audit-logs-immutable \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "COMPLIANCE",
        "Days": 365
      }
    }
  }'
```

### Using OpenTelemetry Collector

For a more modern approach, use the OpenTelemetry Collector to ship logs:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: otel-audit
        opentelemetry:
          port: 4317
          service: otel-collector.monitoring.svc.cluster.local
```

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: otel-audit-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: otel-audit
```

## Querying Audit Logs

Once logs are in your storage backend, you need to be able to query them efficiently. Common audit queries include:

**Who accessed a specific service in the last 24 hours:**

```bash
# If using Elasticsearch
curl -s "http://elasticsearch:9200/istio-audit-*/_search" -H 'Content-Type: application/json' -d '{
  "query": {
    "bool": {
      "must": [
        {"match": {"destination_service": "payment-api"}},
        {"range": {"timestamp": {"gte": "now-24h"}}}
      ]
    }
  }
}'
```

**All denied access attempts:**

```bash
curl -s "http://elasticsearch:9200/istio-audit-*/_search" -H 'Content-Type: application/json' -d '{
  "query": {
    "match": {"response_code": "403"}
  },
  "sort": [{"timestamp": "desc"}],
  "size": 100
}'
```

**All DELETE operations on user data:**

```bash
curl -s "http://elasticsearch:9200/istio-audit-*/_search" -H 'Content-Type: application/json' -d '{
  "query": {
    "bool": {
      "must": [
        {"match": {"method": "DELETE"}},
        {"wildcard": {"path": "/api/v1/users/*"}}
      ]
    }
  }
}'
```

## Alerting on Audit Events

Set up real-time alerts for suspicious audit events:

```yaml
groups:
  - name: audit-alerts
    rules:
      - alert: HighDeniedAccessRate
        expr: |
          sum(rate(istio_requests_total{response_code="403"}[5m])) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High rate of access denials detected"

      - alert: SensitiveDataBulkAccess
        expr: |
          sum(rate(istio_requests_total{
            destination_service_namespace="user-service",
            request_method="GET"
          }[1m])) > 100
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Unusual bulk access to sensitive data detected"
```

## Log Retention and Lifecycle

Different compliance frameworks have different retention requirements:

- PCI DSS: At least 1 year, with 3 months immediately available
- HIPAA: 6 years
- SOC 2: Typically 12 months
- GDPR: As long as necessary for the purpose

Configure your storage lifecycle accordingly. For S3:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket audit-logs-immutable \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "audit-retention",
        "Status": "Enabled",
        "Filter": {"Prefix": "istio-audit/"},
        "Transitions": [
          {"Days": 90, "StorageClass": "GLACIER"},
          {"Days": 365, "StorageClass": "DEEP_ARCHIVE"}
        ],
        "Expiration": {"Days": 2190}
      }
    ]
  }'
```

This keeps logs in standard storage for 90 days (for quick access during investigations), moves them to Glacier for 9 months, then Deep Archive for up to 6 years total.

Audit logging is one of those things that seems boring until you need it. When a security incident happens or an auditor shows up, having comprehensive, tamper-proof logs of all service communication is invaluable. Set it up early and test that you can actually query it before you need to rely on it.
