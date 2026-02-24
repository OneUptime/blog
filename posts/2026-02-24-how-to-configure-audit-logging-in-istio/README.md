# How to Configure Audit Logging in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Audit Logging, Security, Observability, Kubernetes

Description: How to set up audit logging in Istio to track service-to-service communication, authorization decisions, and security events for compliance.

---

Audit logging answers the question "who did what, when, and from where." In a service mesh, this means tracking every request between services, every authorization decision, and every security-relevant event. For compliance requirements like SOC 2, HIPAA, or PCI DSS, having a comprehensive audit trail of service communication is not optional.

Istio provides several mechanisms for audit logging: Envoy access logs, authorization policy logging, and the Telemetry API. Combined with external log aggregation, these tools give you a complete picture of communication patterns in your mesh.

## Envoy Access Logging

The most straightforward way to get audit logs is through Envoy access logs. Each sidecar proxy can log every request it handles.

Enable access logging globally:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-access-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
```

This enables access logging for all sidecars in the mesh. Each log entry contains:

- Source and destination service identity
- HTTP method and path
- Response code
- Request duration
- Bytes sent and received
- Upstream and downstream connection details

Check the logs:

```bash
kubectl logs <pod-name> -c istio-proxy -n default --tail=10
```

A typical log line looks like:

```
[2026-02-24T10:15:30.123Z] "GET /api/v1/users HTTP/1.1" 200 - via_upstream - "-" 0 1234 15 14 "-" "Go-http-client/1.1" "abc-123" "user-service.production.svc.cluster.local:8080" "10.244.1.5:8080" inbound|8080|| 10.244.2.3:0 10.244.1.5:8080 10.244.2.3:45678 - default
```

## Custom Access Log Format

The default log format might not include everything you need for audit purposes. Customize it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogFormat: |
      [%START_TIME%] "%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%"
      %RESPONSE_CODE% %RESPONSE_FLAGS% %BYTES_RECEIVED% %BYTES_SENT%
      %DURATION% %RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%
      "%REQ(X-FORWARDED-FOR)%" "%REQ(USER-AGENT)%"
      "%REQ(X-REQUEST-ID)%" "%REQ(:AUTHORITY)%"
      "%UPSTREAM_HOST%" "%UPSTREAM_TRANSPORT_FAILURE_REASON%"
      source_identity="%DOWNSTREAM_PEER_URI_SAN%"
      destination_identity="%UPSTREAM_PEER_URI_SAN%"
      source_namespace="%DOWNSTREAM_PEER_NAMESPACE%"
```

The `%DOWNSTREAM_PEER_URI_SAN%` and `%UPSTREAM_PEER_URI_SAN%` fields show the SPIFFE identities of the source and destination services. These are critical for audit trails because they provide cryptographically verified identities.

## JSON Access Log Format

For easier parsing by log aggregation systems, use JSON format:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    accessLogFormat: ""
```

Setting `accessLogEncoding: JSON` with an empty format string outputs the default fields in JSON format. Each log entry becomes a JSON object that's easy to parse and index.

For a custom JSON format:

```yaml
meshConfig:
  accessLogEncoding: JSON
  accessLogFormat: |
    {
      "timestamp": "%START_TIME%",
      "method": "%REQ(:METHOD)%",
      "path": "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%",
      "protocol": "%PROTOCOL%",
      "response_code": "%RESPONSE_CODE%",
      "response_flags": "%RESPONSE_FLAGS%",
      "bytes_received": "%BYTES_RECEIVED%",
      "bytes_sent": "%BYTES_SENT%",
      "duration_ms": "%DURATION%",
      "source_identity": "%DOWNSTREAM_PEER_URI_SAN%",
      "destination_identity": "%UPSTREAM_PEER_URI_SAN%",
      "source_ip": "%DOWNSTREAM_REMOTE_ADDRESS%",
      "destination_ip": "%UPSTREAM_HOST%",
      "request_id": "%REQ(X-REQUEST-ID)%",
      "authority": "%REQ(:AUTHORITY)%",
      "user_agent": "%REQ(USER-AGENT)%"
    }
```

## Selective Access Logging

Logging every request generates a lot of data. For audit purposes, you might only need logs for specific namespaces, services, or request types.

Log only server-side (inbound) requests for a specific namespace:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: audit-logging
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
      match:
        mode: SERVER
```

The `mode: SERVER` only logs inbound requests to pods in this namespace, not outbound requests. This cuts the log volume roughly in half.

For specific workloads:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: payment-audit
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  accessLogging:
    - providers:
        - name: envoy
```

This enables access logging only for the payment service pods.

## Authorization Policy Logging

When an AuthorizationPolicy denies a request, you want to know about it. This is a security event that should always be logged.

Authorization denials appear in the Envoy access logs with specific response flags. Look for:

- `RBAC: access denied` in the response body
- Response code 403
- Response flag containing `UAEX` (upstream authorization error)

You can also audit authorization decisions by enabling dry-run mode on policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: audit-all-access
  namespace: production
  annotations:
    istio.io/dry-run: "true"
spec:
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/production/sa/frontend
```

The dry-run policy doesn't enforce anything but logs what would be allowed or denied. Check the shadow decisions:

```bash
kubectl logs <pod-name> -c istio-proxy -n production | grep "shadow"
```

## Sending Logs to External Systems

For production audit logging, you need to ship logs to a centralized system. Common approaches:

### Using Fluentd/Fluent Bit

Deploy Fluent Bit as a DaemonSet to collect sidecar logs:

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
              mountPath: /fluent-bit/etc/
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: config
          configMap:
            name: fluent-bit-config
```

### Using OpenTelemetry Collector

Istio supports sending access logs to an OpenTelemetry collector:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: otel-als
        envoyOtelAls:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
```

Then reference this provider in the Telemetry resource:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: otel-audit-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: otel-als
```

The OpenTelemetry collector can then forward logs to any supported backend: Elasticsearch, Splunk, Datadog, or cloud-native logging services.

## Audit Log Retention

For compliance, audit logs typically need to be retained for specific periods:

- SOC 2: Minimum 1 year
- HIPAA: 6 years
- PCI DSS: 1 year

Configure your log storage backend with appropriate retention policies. In Elasticsearch:

```json
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
          "shrink": {
            "number_of_shards": 1
          }
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

## Querying Audit Logs

Once logs are in a centralized system, you can answer audit questions:

- "Who accessed the payment service yesterday?"
- "Which services communicated with the database between 2am and 4am?"
- "How many requests were denied by authorization policies this week?"
- "What external services did the order-service connect to?"

Sample queries for Elasticsearch:

```json
{
  "query": {
    "bool": {
      "must": [
        {"match": {"destination_identity": "spiffe://cluster.local/ns/production/sa/payment-service"}},
        {"range": {"timestamp": {"gte": "2026-02-23", "lte": "2026-02-24"}}},
        {"match": {"response_code": 403}}
      ]
    }
  }
}
```

## Security Event Alerting

Set up alerts for security-relevant events:

- Spike in 403 responses (potential attack or misconfiguration)
- Requests from unknown identities
- Connections to previously unused external services
- Traffic patterns outside normal business hours

In Prometheus:

```promql
# Alert on high rate of authorization denials
sum(rate(istio_requests_total{response_code="403"}[5m])) by (destination_service) > 10
```

Audit logging in Istio is about capturing the right data, shipping it reliably to a centralized system, and retaining it for the required duration. Start with JSON-formatted access logs, include SPIFFE identities, ship to a proper log aggregation system, and set up alerts for security events. This gives you the audit trail you need for both security monitoring and compliance requirements.
