# How to Set Up Alerting Rules for Istio Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Alerting, Prometheus, SRE, Monitoring

Description: Configure Prometheus alerting rules for Istio service mesh metrics to detect errors, latency spikes, traffic anomalies, and control plane issues.

---

Collecting Istio metrics is only useful if someone acts on them when things go wrong. Setting up good alerting rules means your team gets notified about problems before users start complaining. The challenge is finding the balance between alerting on real issues and drowning in noise. This guide covers practical alerting rules for Istio metrics that actually work in production.

## How Alerting Works with Prometheus

Prometheus evaluates alerting rules at regular intervals. When an expression returns results and the condition persists for the specified `for` duration, the alert fires. Alertmanager then handles routing, grouping, and sending notifications to your channels (Slack, PagerDuty, email, etc.).

If you're using the Prometheus Operator (kube-prometheus-stack), you define alerts using PrometheusRule resources:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-alerts
  namespace: monitoring
  labels:
    release: monitoring  # Must match your Prometheus operator's label selector
spec:
  groups:
    - name: istio-service-alerts
      rules:
        - alert: ExampleAlert
          expr: vector(1) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "This is an example"
```

## Service-Level Alerts

### High Error Rate

The most important alert. Fire when a service's 5xx error rate exceeds a threshold:

```yaml
- alert: IstioHighErrorRate
  expr: |
    (
      sum(rate(istio_requests_total{
        reporter="destination",
        response_code=~"5.."
      }[5m])) by (destination_workload, destination_workload_namespace)
      /
      sum(rate(istio_requests_total{
        reporter="destination"
      }[5m])) by (destination_workload, destination_workload_namespace)
    ) > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High 5xx error rate on {{ $labels.destination_workload }}"
    description: "{{ $labels.destination_workload }} in {{ $labels.destination_workload_namespace }} has a {{ $value | humanizePercentage }} error rate"
```

This fires when any service has more than 5% server errors sustained for 5 minutes. Adjust the threshold based on your SLOs.

### High Latency

Alert when P99 latency exceeds your SLO:

```yaml
- alert: IstioHighLatency
  expr: |
    histogram_quantile(0.99,
      sum(rate(istio_request_duration_milliseconds_bucket{
        reporter="destination"
      }[5m])) by (destination_workload, destination_workload_namespace, le)
    ) > 1000
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High P99 latency on {{ $labels.destination_workload }}"
    description: "P99 latency is {{ $value | humanize }}ms on {{ $labels.destination_workload }}"
```

### Traffic Drop

Detect when a service suddenly stops receiving traffic:

```yaml
- alert: IstioTrafficDrop
  expr: |
    (
      sum(rate(istio_requests_total{
        reporter="destination"
      }[5m])) by (destination_workload, destination_workload_namespace)
      < 0.1 *
      sum(rate(istio_requests_total{
        reporter="destination"
      }[5m] offset 1h)) by (destination_workload, destination_workload_namespace)
    )
    and
    sum(rate(istio_requests_total{
      reporter="destination"
    }[5m] offset 1h)) by (destination_workload, destination_workload_namespace) > 1
  for: 10m
  labels:
    severity: critical
  annotations:
    summary: "Traffic drop on {{ $labels.destination_workload }}"
    description: "{{ $labels.destination_workload }} traffic dropped to less than 10% of an hour ago"
```

The second condition (`> 1`) ensures we don't alert on services that normally have very low traffic.

### Traffic Spike

Detect unusual traffic increases that might indicate a DDoS or a misconfigured client:

```yaml
- alert: IstioTrafficSpike
  expr: |
    (
      sum(rate(istio_requests_total{
        reporter="destination"
      }[5m])) by (destination_workload, destination_workload_namespace)
      > 5 *
      sum(rate(istio_requests_total{
        reporter="destination"
      }[5m] offset 1h)) by (destination_workload, destination_workload_namespace)
    )
    and
    sum(rate(istio_requests_total{
      reporter="destination"
    }[5m])) by (destination_workload, destination_workload_namespace) > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Traffic spike on {{ $labels.destination_workload }}"
    description: "{{ $labels.destination_workload }} traffic is 5x higher than an hour ago"
```

## Control Plane Alerts

### istiod Down

```yaml
- alert: IstiodDown
  expr: absent(up{job="istiod"} == 1)
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "istiod is down"
    description: "No healthy istiod instances detected for 2 minutes"
```

### High Push Latency

```yaml
- alert: IstiodHighPushLatency
  expr: |
    histogram_quantile(0.99,
      sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le)
    ) > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "istiod configuration push latency is high"
    description: "P99 push convergence time is {{ $value | humanize }}s"
```

### xDS Push Errors

```yaml
- alert: IstiodPushErrors
  expr: sum(rate(pilot_xds_push_errors[5m])) > 0
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "istiod is experiencing xDS push errors"
    description: "Push error rate: {{ $value | humanize }}/s"
```

### Sidecar Injection Failures

```yaml
- alert: SidecarInjectionFailure
  expr: sum(rate(sidecar_injection_failure_total[5m])) > 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Sidecar injection is failing"
    description: "New pods may not be getting their Istio sidecars"
```

### Configuration Conflicts

```yaml
- alert: IstioConfigConflict
  expr: |
    pilot_conflict_inbound_listener > 0
    or
    pilot_conflict_outbound_listener_http_over_current_tcp > 0
    or
    pilot_conflict_outbound_listener_tcp_over_current_http > 0
  for: 15m
  labels:
    severity: warning
  annotations:
    summary: "Istio configuration conflicts detected"
    description: "Conflicting listener configurations found. Run 'istioctl analyze' to investigate."
```

## Certificate Alerts

### Root CA Expiring

```yaml
- alert: IstioRootCertExpiring
  expr: |
    (citadel_server_root_cert_expiry_timestamp - time()) / 86400 < 30
  for: 1h
  labels:
    severity: critical
  annotations:
    summary: "Istio root certificate expires in {{ $value | humanize }} days"
```

### Workload Certificate Errors

```yaml
- alert: IstioCertSigningErrors
  expr: sum(rate(citadel_server_csr_parsing_err_count[5m])) > 0
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Certificate signing request errors detected"
```

## Circuit Breaker Alerts

```yaml
- alert: IstioCircuitBreakerOpen
  expr: |
    envoy_cluster_circuit_breakers_default_cx_open == 1
    or
    envoy_cluster_circuit_breakers_default_rq_open == 1
    or
    envoy_cluster_circuit_breakers_default_rq_pending_open == 1
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "Circuit breaker triggered"
    description: "Circuit breaker is open on cluster {{ $labels.cluster_name }}"
```

## mTLS Coverage Alert

```yaml
- alert: IstioMTLSCoverageDropped
  expr: |
    (
      sum(rate(istio_requests_total{
        reporter="destination",
        connection_security_policy="mutual_tls"
      }[5m]))
      /
      sum(rate(istio_requests_total{
        reporter="destination"
      }[5m]))
    ) < 0.95
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "mTLS coverage below 95%"
    description: "Only {{ $value | humanizePercentage }} of traffic is using mTLS"
```

## Complete PrometheusRule Example

Here's a complete resource you can apply to your cluster:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-alerting-rules
  namespace: monitoring
  labels:
    release: monitoring
spec:
  groups:
    - name: istio-service-health
      interval: 30s
      rules:
        - alert: IstioHighErrorRate
          expr: |
            (
              sum(rate(istio_requests_total{reporter="destination",response_code=~"5.."}[5m]))
              by (destination_workload, destination_workload_namespace)
              /
              sum(rate(istio_requests_total{reporter="destination"}[5m]))
              by (destination_workload, destination_workload_namespace)
            ) > 0.05
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "{{ $labels.destination_workload }} error rate above 5%"
    - name: istio-control-plane
      interval: 30s
      rules:
        - alert: IstiodDown
          expr: absent(up{job="istiod"} == 1)
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "istiod is unreachable"
```

## Alerting Best Practices

**Use the `for` clause wisely.** Don't alert on transient spikes. A 5-minute `for` duration means the condition must be true for 5 consecutive evaluation cycles before firing.

**Set severity levels.** Use `critical` for things that need immediate human attention and `warning` for things that should be investigated during business hours.

**Include context in annotations.** Use `{{ $labels.destination_workload }}` and `{{ $value | humanize }}` to include relevant details in the alert message.

**Avoid alerting on every service individually.** Use aggregated alerts that fire for any service exceeding a threshold, rather than maintaining separate alert rules per service.

**Test your alerts.** Before deploying to production, use `promtool` to validate your rules:

```bash
promtool check rules istio-alerts.yaml
```

Good alerting is the difference between catching problems proactively and learning about outages from angry users. Start with the basics - error rate and latency - and expand as you learn your services' normal behavior patterns.
