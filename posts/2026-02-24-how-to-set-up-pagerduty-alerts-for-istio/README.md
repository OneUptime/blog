# How to Set Up PagerDuty Alerts for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, PagerDuty, Alerting, Prometheus, Alertmanager, Incident Management

Description: End-to-end guide to connecting Istio metrics with PagerDuty for automated incident creation and on-call notification.

---

Having Prometheus alerts for your Istio mesh is only useful if those alerts actually reach someone who can fix the problem. PagerDuty is one of the most popular incident management platforms, and connecting it to your Istio monitoring stack ensures that critical mesh issues trigger the right on-call workflow.

## Architecture Overview

The alert pipeline looks like this:

1. Istio sidecars and Istiod expose Prometheus metrics
2. Prometheus scrapes those metrics and evaluates alert rules
3. When an alert fires, Prometheus sends it to Alertmanager
4. Alertmanager routes the alert to PagerDuty based on labels
5. PagerDuty creates an incident and pages the on-call engineer

Each piece needs to be configured correctly for the pipeline to work end to end.

## Setting Up the PagerDuty Integration

First, create an integration in PagerDuty:

1. Go to your PagerDuty service (or create a new one for Istio)
2. Navigate to the Integrations tab
3. Add a new integration and select "Prometheus" or "Events API v2"
4. Copy the Integration Key (also called the routing key)

Store this key as a Kubernetes secret:

```bash
kubectl create secret generic pagerduty-config \
  --from-literal=integration-key=YOUR_PAGERDUTY_INTEGRATION_KEY \
  -n monitoring
```

## Configuring Alertmanager

Alertmanager needs to know how to send alerts to PagerDuty. Here is a complete Alertmanager configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    global:
      resolve_timeout: 5m
      pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

    route:
      group_by: ['alertname', 'namespace', 'destination_workload']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
      receiver: default-receiver
      routes:
      - match:
          severity: critical
        receiver: pagerduty-critical
        continue: true
      - match:
          severity: warning
          team: platform
        receiver: pagerduty-warning
      - match_re:
          alertname: Istio.*
        receiver: istio-pagerduty
        group_by: ['alertname', 'destination_workload']

    receivers:
    - name: default-receiver
      webhook_configs: []

    - name: pagerduty-critical
      pagerduty_configs:
      - service_key_file: /etc/alertmanager/secrets/integration-key
        severity: critical
        description: '{{ template "pagerduty.description" . }}'
        details:
          firing: '{{ template "pagerduty.firing" . }}'
          num_firing: '{{ .Alerts.Firing | len }}'
          num_resolved: '{{ .Alerts.Resolved | len }}'

    - name: pagerduty-warning
      pagerduty_configs:
      - service_key_file: /etc/alertmanager/secrets/integration-key
        severity: warning
        description: '{{ template "pagerduty.description" . }}'

    - name: istio-pagerduty
      pagerduty_configs:
      - service_key_file: /etc/alertmanager/secrets/integration-key
        severity: '{{ if eq (index .CommonLabels "severity") "critical" }}critical{{ else }}warning{{ end }}'
        description: '{{ .CommonAnnotations.summary }}'
        details:
          workload: '{{ .CommonLabels.destination_workload }}'
          namespace: '{{ .CommonLabels.destination_workload_namespace }}'
          description: '{{ .CommonAnnotations.description }}'

    templates:
    - '/etc/alertmanager/templates/*.tmpl'
```

## Creating Alert Templates

PagerDuty incidents look better with well-formatted details. Create a template:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-templates
  namespace: monitoring
data:
  pagerduty.tmpl: |
    {{ define "pagerduty.description" }}
    [{{ .Status | toUpper }}] {{ .CommonAnnotations.summary }}
    {{ end }}

    {{ define "pagerduty.firing" }}
    {{ range .Alerts.Firing }}
    Alert: {{ .Labels.alertname }}
    Workload: {{ .Labels.destination_workload }}
    Namespace: {{ .Labels.destination_workload_namespace }}
    Description: {{ .Annotations.description }}
    Started: {{ .StartsAt.Format "2006-01-02 15:04:05 UTC" }}
    ---
    {{ end }}
    {{ end }}
```

## Defining Istio Alert Rules for PagerDuty

Here are production-ready alert rules designed to work well with PagerDuty:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-pagerduty-alerts
  namespace: istio-system
spec:
  groups:
  - name: istio-critical
    rules:
    - alert: IstioServiceDown
      expr: |
        sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_workload, destination_workload_namespace) == 0
        and
        sum(rate(istio_requests_total{reporter="destination"}[5m] offset 1h)) by (destination_workload, destination_workload_namespace) > 0
      for: 5m
      labels:
        severity: critical
        team: platform
      annotations:
        summary: "Service {{ $labels.destination_workload }} stopped receiving traffic"
        description: "{{ $labels.destination_workload }} in {{ $labels.destination_workload_namespace }} was receiving traffic an hour ago but has stopped. This could indicate the service is down or routing is broken."
        runbook_url: "https://wiki.example.com/runbooks/istio-service-down"

    - alert: IstioHighErrorRate
      expr: |
        (
          sum(rate(istio_requests_total{response_code=~"5.*",reporter="destination"}[5m]))
          by (destination_workload, destination_workload_namespace)
          /
          sum(rate(istio_requests_total{reporter="destination"}[5m]))
          by (destination_workload, destination_workload_namespace)
        ) > 0.10
        and
        sum(rate(istio_requests_total{reporter="destination"}[5m]))
        by (destination_workload, destination_workload_namespace) > 1
      for: 3m
      labels:
        severity: critical
        team: platform
      annotations:
        summary: "{{ $labels.destination_workload }} error rate above 10%"
        description: "Error rate is {{ $value | humanizePercentage }}. Investigate immediately."
        runbook_url: "https://wiki.example.com/runbooks/istio-high-error-rate"

    - alert: IstioControlPlaneDown
      expr: |
        absent(up{job="istiod"} == 1)
      for: 2m
      labels:
        severity: critical
        team: platform
      annotations:
        summary: "Istio control plane (Istiod) is down"
        description: "Istiod is not responding. New configuration changes will not be applied and certificate rotation may stop."
        runbook_url: "https://wiki.example.com/runbooks/istiod-down"

    - alert: IstioGatewayHighLatency
      expr: |
        histogram_quantile(0.99,
          sum(rate(istio_request_duration_milliseconds_bucket{
            reporter="source",
            source_workload="istio-ingressgateway"
          }[5m])) by (le, destination_workload)
        ) > 5000
      for: 5m
      labels:
        severity: critical
        team: platform
      annotations:
        summary: "Gateway latency above 5s for {{ $labels.destination_workload }}"
        description: "P99 latency through the ingress gateway is {{ $value }}ms"

  - name: istio-warning
    rules:
    - alert: IstioCertificateExpiring
      expr: |
        (citadel_server_root_cert_expiry_timestamp - time()) / 86400 < 30
      for: 1h
      labels:
        severity: warning
        team: platform
      annotations:
        summary: "Istio root certificate expires in less than 30 days"
        description: "Plan certificate rotation soon."

    - alert: IstioProxySyncStale
      expr: |
        pilot_proxy_convergence_time{quantile="0.99"} > 30
      for: 10m
      labels:
        severity: warning
        team: platform
      annotations:
        summary: "Slow proxy configuration convergence"
        description: "P99 convergence time is {{ $value }}s. Configuration changes may be delayed."
```

## Testing the PagerDuty Integration

Always test your integration before relying on it. Create a test alert:

```bash
# Port-forward Alertmanager
kubectl port-forward svc/alertmanager -n monitoring 9093:9093

# Send a test alert
curl -X POST http://localhost:9093/api/v2/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {
      "alertname": "IstioTestAlert",
      "severity": "critical",
      "team": "platform",
      "destination_workload": "test-service",
      "destination_workload_namespace": "default"
    },
    "annotations": {
      "summary": "Test alert from Istio monitoring",
      "description": "This is a test alert to verify PagerDuty integration."
    }
  }]'
```

Check that an incident appears in PagerDuty within a few minutes. Resolve it manually after confirming.

## Grouping and Deduplication

PagerDuty works best when alerts are properly grouped. The `group_by` setting in Alertmanager determines how alerts are batched:

```yaml
route:
  group_by: ['alertname', 'destination_workload']
  group_wait: 30s      # Wait before sending first notification
  group_interval: 5m   # Wait before sending updates for a group
  repeat_interval: 4h  # Wait before re-sending a resolved-then-firing alert
```

With this config, all alerts for the same alertname and workload get bundled into a single PagerDuty incident. This prevents alert storms where every pod in a deployment triggers a separate page.

## Silencing During Maintenance

Before performing mesh maintenance, create a silence in Alertmanager:

```bash
# Silence all Istio alerts for 2 hours
curl -X POST http://localhost:9093/api/v2/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [{"name": "alertname", "value": "Istio.*", "isRegex": true}],
    "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%S)'Z",
    "endsAt": "'$(date -u -d "+2 hours" +%Y-%m-%dT%H:%M:%S)'Z",
    "createdBy": "admin",
    "comment": "Scheduled Istio maintenance window"
  }'
```

This prevents maintenance activities from triggering unnecessary pages.

Getting PagerDuty connected to your Istio monitoring stack closes the loop between detection and response. The key is good alert definitions with appropriate severity levels, proper grouping to avoid alert fatigue, and runbook links so the person who gets paged knows exactly what to do.
