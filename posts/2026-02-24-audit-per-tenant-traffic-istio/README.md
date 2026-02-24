# How to Audit Per-Tenant Traffic in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Auditing, Multi-Tenancy, Access Logging, Compliance

Description: Set up comprehensive per-tenant traffic auditing in Istio using access logs, telemetry configuration, and structured logging for compliance requirements.

---

In multi-tenant environments, auditing is not optional. You need to know who accessed what, when, and from where. Some of your tenants might have compliance requirements like SOC 2, HIPAA, or PCI DSS that mandate detailed access logs. Istio makes this possible through its access logging and telemetry features, and you can configure different audit levels per tenant.

## Enabling Access Logging

Istio's access logging captures detailed information about every request that flows through the mesh. You can enable it globally or per namespace.

Global access logging through the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

But for multi-tenant auditing, you probably want different logging levels per tenant. Use the Telemetry API for that:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: full-audit-logging
  namespace: tenant-a
spec:
  accessLogging:
  - providers:
    - name: envoy
    filter:
      expression: "true"
```

This enables full access logging for every request in tenant-a. For tenants with lighter audit requirements:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: error-audit-logging
  namespace: tenant-b
spec:
  accessLogging:
  - providers:
    - name: envoy
    filter:
      expression: "response.code >= 400"
```

Tenant-b only logs requests that result in errors.

## Customizing the Access Log Format

The default access log format contains a lot of information, but you might want to add tenant-specific fields or restructure the log for your SIEM system.

Configure a custom log format using an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-audit-log
  namespace: tenant-a
spec:
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: MERGE
      value:
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          access_log:
          - name: envoy.access_loggers.file
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
              path: /dev/stdout
              log_format:
                json_format:
                  timestamp: "%START_TIME%"
                  tenant: "tenant-a"
                  source_ip: "%DOWNSTREAM_REMOTE_ADDRESS%"
                  source_namespace: "%REQ(X-FORWARDED-CLIENT-CERT)%"
                  destination_service: "%REQ(:AUTHORITY)%"
                  method: "%REQ(:METHOD)%"
                  path: "%REQ(PATH)%"
                  protocol: "%PROTOCOL%"
                  response_code: "%RESPONSE_CODE%"
                  response_flags: "%RESPONSE_FLAGS%"
                  bytes_received: "%BYTES_RECEIVED%"
                  bytes_sent: "%BYTES_SENT%"
                  duration_ms: "%DURATION%"
                  upstream_host: "%UPSTREAM_HOST%"
                  user_agent: "%REQ(USER-AGENT)%"
                  request_id: "%REQ(X-REQUEST-ID)%"
```

This produces structured JSON logs with a `tenant` field hardcoded to `tenant-a`, making it easy to filter in your log aggregation system.

## Capturing Authentication Details in Audit Logs

For compliance, you often need to log who made the request, not just what the request was. If tenants use JWT authentication, you can include JWT claims in the audit log.

First, make sure the JWT payload is available as a header:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: tenant-a
spec:
  jwtRules:
  - issuer: "https://auth.tenant-a.com"
    jwksUri: "https://auth.tenant-a.com/.well-known/jwks.json"
    outputPayloadToHeader: x-jwt-payload
```

Then reference the header in the access log format:

```yaml
log_format:
  json_format:
    timestamp: "%START_TIME%"
    tenant: "tenant-a"
    user_identity: "%REQ(X-JWT-PAYLOAD)%"
    method: "%REQ(:METHOD)%"
    path: "%REQ(PATH)%"
    response_code: "%RESPONSE_CODE%"
    duration_ms: "%DURATION%"
```

Now your audit logs include the full JWT payload, which typically contains the user ID, email, roles, and other identity information.

## Shipping Audit Logs to External Systems

Audit logs sitting in container stdout are only useful if they are collected and stored somewhere durable. Use a log collection pipeline:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentbit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluentbit
  template:
    metadata:
      labels:
        app: fluentbit
    spec:
      containers:
      - name: fluentbit
        image: fluent/fluent-bit:latest
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: config
          mountPath: /fluent-bit/etc/
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: config
        configMap:
          name: fluentbit-config
```

Configure Fluent Bit to parse the JSON logs and route them based on the tenant field:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentbit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Parsers_File parsers.conf

    [INPUT]
        Name tail
        Path /var/log/containers/*istio-proxy*.log
        Parser docker
        Tag kube.*

    [FILTER]
        Name kubernetes
        Match kube.*
        Merge_Log On
        K8S-Logging.Parser On

    [OUTPUT]
        Name es
        Match kube.*
        Host elasticsearch.logging
        Port 9200
        Index istio-audit
        Type _doc
```

## Querying Audit Logs Per Tenant

Once logs are in Elasticsearch (or whatever your log store is), query them per tenant:

```json
{
  "query": {
    "bool": {
      "must": [
        { "term": { "tenant": "tenant-a" } },
        { "range": { "timestamp": { "gte": "2026-02-01", "lte": "2026-02-28" } } }
      ]
    }
  },
  "sort": [{ "timestamp": "desc" }]
}
```

For specific audit queries like "show me all requests to the payments API by user X in the last 24 hours":

```json
{
  "query": {
    "bool": {
      "must": [
        { "term": { "tenant": "tenant-a" } },
        { "match": { "path": "/api/payments" } },
        { "match": { "user_identity": "user-123" } },
        { "range": { "timestamp": { "gte": "now-24h" } } }
      ]
    }
  }
}
```

## Authorization Decision Logging

Beyond access logs, you might need to audit authorization decisions. When Istio denies a request, you want to know why and log it.

Enable RBAC debug logging for specific workloads:

```bash
istioctl proxy-config log deploy/api-service -n tenant-a --level rbac:debug
```

For a persistent configuration, use the Telemetry API to capture RBAC decisions:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: audit-rbac
  namespace: tenant-a
spec:
  accessLogging:
  - providers:
    - name: envoy
    filter:
      expression: "response.code == 403 || response.code == 401"
```

This specifically logs all authentication and authorization failures, which is exactly what auditors typically want to see.

## Generating Audit Reports

Create periodic audit reports by aggregating log data. Here is a Prometheus query that shows request counts by tenant, response code, and path:

```promql
sum(increase(istio_requests_total{reporter="destination"}[24h])) by (destination_workload_namespace, response_code, destination_workload)
```

For a more detailed report, use your log aggregation system. A typical monthly audit report might include:

- Total requests per tenant
- Unique users per tenant
- Failed authentication attempts
- Authorization denials
- Top accessed endpoints
- Error rate trends

Automate report generation with a cron job:

```bash
#!/bin/bash
TENANT=$1
MONTH=$(date -d "last month" +%Y-%m)

# Query Elasticsearch for audit summary
curl -s "http://elasticsearch:9200/istio-audit/_search" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": {
      \"bool\": {
        \"must\": [
          {\"term\": {\"tenant\": \"$TENANT\"}},
          {\"range\": {\"timestamp\": {\"gte\": \"${MONTH}-01\", \"lt\": \"$(date +%Y-%m)-01\"}}}
        ]
      }
    },
    \"aggs\": {
      \"by_response_code\": {\"terms\": {\"field\": \"response_code\"}},
      \"by_path\": {\"terms\": {\"field\": \"path.keyword\", \"size\": 20}},
      \"total_bytes\": {\"sum\": {\"field\": \"bytes_sent\"}}
    },
    \"size\": 0
  }" > /reports/${TENANT}-${MONTH}-audit.json

echo "Audit report generated for $TENANT ($MONTH)"
```

## Retention Policies

Different tenants may have different retention requirements. Some compliance frameworks require 7 years of audit log retention. Configure your log storage with tenant-aware retention policies:

```yaml
# Elasticsearch ILM policy for tenant audit logs
PUT _ilm/policy/tenant-audit-policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "50gb",
            "max_age": "30d"
          }
        }
      },
      "warm": {
        "min_age": "30d",
        "actions": {
          "shrink": { "number_of_shards": 1 }
        }
      },
      "cold": {
        "min_age": "90d",
        "actions": {
          "freeze": {}
        }
      },
      "delete": {
        "min_age": "365d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

Adjust the delete phase based on each tenant's compliance requirements.

## Summary

Per-tenant traffic auditing in Istio combines access logging, custom log formats, authentication detail capture, and log aggregation. Use the Telemetry API to set different audit levels per tenant namespace. Ship logs to a durable store with tenant-aware indexing. Generate periodic reports for compliance. And configure retention policies that match each tenant's regulatory requirements. The investment in setting up proper auditing pays off when you need to answer questions about who did what and when.
