# How to Set Up Security Monitoring and Alerting in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security Monitoring, Alerting, Prometheus, Kubernetes, Observability

Description: How to monitor security events in Istio and set up alerts for authorization denials, mTLS failures, certificate issues, and anomalous traffic.

---

A security configuration is only as good as your ability to detect when something goes wrong. You can have perfect authorization policies and strict mTLS, but if no one notices when policies are being violated or certificates are failing, those controls are less effective. Security monitoring in Istio means watching for authorization denials, TLS handshake failures, anomalous traffic patterns, and certificate rotation issues.

Istio generates a wealth of security-related metrics through its Envoy sidecars. These metrics are available in Prometheus format and can be scraped, stored, and used for alerting.

## Security Metrics Overview

Istio exposes several security-relevant metrics:

- `istio_requests_total` - Total request count, filterable by response code (403 = denied)
- `envoy_server_ssl_handshake` - Successful TLS handshakes
- `envoy_cluster_ssl_handshake_error` - Failed TLS handshakes
- `envoy_cluster_upstream_cx_connect_fail` - Connection failures
- `envoy_server_ssl_no_certificate` - Connections without client certificates
- `envoy_cluster_upstream_rq_retry` - Retried requests
- RBAC-related stats from the authorization filter

## Setting Up Prometheus for Istio Metrics

If you don't have Prometheus running yet, install it alongside Istio:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/prometheus.yaml
```

For production, use the Prometheus Operator:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istio-sidecar
  namespace: monitoring
spec:
  selector:
    matchLabels:
      istio: sidecar
  namespaceSelector:
    any: true
  endpoints:
    - port: http-envoy-prom
      path: /stats/prometheus
      interval: 15s
```

This tells Prometheus to scrape all Istio sidecars for metrics every 15 seconds.

## Monitoring Authorization Denials

Authorization denials (403 responses from RBAC) are one of the most important security signals. They can indicate:

- Attempted unauthorized access
- Misconfigured policies blocking legitimate traffic
- A compromised service trying to access resources it shouldn't

Prometheus query for authorization denials:

```promql
sum(rate(istio_requests_total{response_code="403", response_flags="UAEX"}[5m])) by (source_workload, destination_service)
```

The `response_flags="UAEX"` filter isolates denials from Istio's authorization engine specifically, not other sources of 403 responses.

Create a Prometheus alerting rule:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-security-alerts
  namespace: monitoring
spec:
  groups:
    - name: istio-security
      interval: 30s
      rules:
        - alert: HighAuthorizationDenials
          expr: |
            sum(rate(istio_requests_total{response_code="403"}[5m])) by (destination_service, source_workload) > 5
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High rate of authorization denials"
            description: "{{ $labels.source_workload }} is being denied access to {{ $labels.destination_service }} at {{ $value }} requests/sec"
```

## Monitoring mTLS Failures

TLS handshake failures indicate problems with the mTLS infrastructure. They can mean expired certificates, misconfigured PeerAuthentication, or non-mesh services trying to access strict-mTLS services.

```promql
# TLS handshake errors across the mesh
sum(rate(envoy_cluster_ssl_handshake_error[5m])) by (cluster_name)
```

Alert on TLS failures:

```yaml
- alert: TLSHandshakeFailures
  expr: |
    sum(rate(envoy_cluster_ssl_handshake_error[5m])) by (pod) > 0.1
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "TLS handshake failures detected"
    description: "Pod {{ $labels.pod }} is experiencing TLS handshake failures"
```

## Certificate Monitoring

Istio rotates workload certificates automatically, but issues can still occur. Monitor certificate expiration and rotation:

Check certificate status per pod:

```bash
istioctl proxy-config secret <pod-name> -n default
```

The output shows the certificate serial number, valid from/to dates, and the SPIFFE identity.

For bulk monitoring, use the Envoy stats:

```promql
# Time until certificate expiry (from the Envoy cert stats)
envoy_server_ssl_days_until_first_cert_expiring
```

Alert when certificates are close to expiring:

```yaml
- alert: CertificateExpiringWithinDay
  expr: |
    envoy_server_ssl_days_until_first_cert_expiring < 1
  for: 10m
  labels:
    severity: critical
  annotations:
    summary: "Istio workload certificate expiring soon"
    description: "Certificate for pod {{ $labels.pod }} expires in less than 1 day"
```

## Monitoring Connection Anomalies

Watch for unusual connection patterns that might indicate security issues:

```promql
# Sudden spike in connection attempts
sum(rate(istio_tcp_connections_opened_total[5m])) by (destination_service)
  > 2 * sum(rate(istio_tcp_connections_opened_total[1h])) by (destination_service)
```

This detects when the current connection rate is more than 2x the hourly average.

```yaml
- alert: ConnectionSpike
  expr: |
    sum(rate(istio_tcp_connections_opened_total[5m])) by (destination_service)
    > 2 * avg_over_time(sum(rate(istio_tcp_connections_opened_total[5m])) by (destination_service)[1h:5m])
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Unusual connection spike detected"
    description: "{{ $labels.destination_service }} is receiving an abnormal number of connections"
```

## Monitoring Egress Traffic

Track outbound traffic to detect data exfiltration or unauthorized external access:

```promql
# Requests to external services
sum(rate(istio_requests_total{destination_service_namespace="unknown"}[5m])) by (source_workload)
```

```yaml
- alert: UnexpectedEgressTraffic
  expr: |
    sum(rate(istio_tcp_sent_bytes_total{destination_service_namespace="unknown"}[5m])) by (source_workload) > 1048576
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High volume egress traffic detected"
    description: "{{ $labels.source_workload }} is sending >1MB/s to external services"
```

## Building a Security Dashboard

Create a Grafana dashboard with these panels:

### Authorization Denials Over Time

```promql
sum(rate(istio_requests_total{response_code="403"}[5m])) by (source_workload, destination_service)
```

### mTLS Coverage

```promql
# Percentage of requests using mTLS
sum(rate(istio_requests_total{connection_security_policy="mutual_tls"}[5m]))
/
sum(rate(istio_requests_total[5m]))
```

### Top Denied Source-Destination Pairs

```promql
topk(10, sum(increase(istio_requests_total{response_code="403"}[1h])) by (source_workload, destination_service))
```

### Circuit Breaker Trips

```promql
sum(rate(envoy_cluster_upstream_rq_pending_overflow[5m])) by (cluster_name)
```

### Failed Connection Attempts

```promql
sum(rate(envoy_cluster_upstream_cx_connect_fail[5m])) by (cluster_name)
```

## Alerting Integration

Connect your alerts to notification channels:

```yaml
apiVersion: monitoring.coreos.com/v1alpha1
kind: AlertmanagerConfig
metadata:
  name: istio-security
  namespace: monitoring
spec:
  route:
    groupBy:
      - alertname
      - severity
    groupWait: 30s
    groupInterval: 5m
    repeatInterval: 1h
    receiver: security-team
    routes:
      - match:
          severity: critical
        receiver: security-pager
  receivers:
    - name: security-team
      slackConfigs:
        - channel: "#security-alerts"
          sendResolved: true
    - name: security-pager
      pagerdutyConfigs:
        - serviceKey:
            name: pagerduty-key
            key: service-key
```

## Istiod Health Monitoring

The Istio control plane (istiod) manages certificates, policies, and configurations. Monitor its health:

```promql
# Certificate signing requests
sum(rate(citadel_server_csr_count[5m]))

# Certificate signing errors
sum(rate(citadel_server_csr_parsing_err_count[5m]))

# Push errors to sidecars
sum(rate(pilot_xds_push_errors[5m]))
```

```yaml
- alert: IstiodCertificateErrors
  expr: |
    sum(rate(citadel_server_csr_parsing_err_count[5m])) > 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Istiod certificate signing errors"
    description: "Certificate signing requests are failing, which may prevent certificate rotation"
```

## Regular Security Audits

Beyond automated monitoring, perform regular audits:

```bash
# Check all authorization policies
kubectl get authorizationpolicies -A

# Check PeerAuthentication policies
kubectl get peerauthentication -A

# Verify no services are in permissive mode when they should be strict
kubectl get peerauthentication -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: {.spec.mtls.mode}{"\n"}{end}'

# Check for services without sidecars
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: {range .spec.containers[*]}{.name} {end}{"\n"}{end}' | grep -v istio-proxy
```

Security monitoring in Istio combines metrics, logs, and alerting. Set up Prometheus to scrape Istio metrics, create alerts for authorization denials and TLS failures, build dashboards for visibility, and perform regular audits. The goal is to know about security issues within minutes, not days.
