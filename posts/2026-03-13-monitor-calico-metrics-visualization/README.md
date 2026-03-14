# How to Monitor Calico Metrics Visualization Health

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Metrics, Grafana, Monitoring

Description: Monitor the health of your Calico Grafana dashboards to detect broken panels, stale data, and dashboard availability issues before they affect operations.

---

## Introduction

Monitoring your Calico dashboards' health ensures that the visualization layer remains a reliable operational tool. Broken dashboards discovered during an incident - when you need them most - significantly increase time to resolution.

## Dashboard Health Monitoring

```bash
#!/bin/bash
# monitor-grafana-dashboard-health.sh
GRAFANA_URL="${GRAFANA_URL}"
TOKEN="${GRAFANA_TOKEN}"

echo "=== Grafana Dashboard Health Check ==="

# Check Grafana is accessible
if curl -sf "${GRAFANA_URL}/api/health" -H "Authorization: Bearer ${TOKEN}" > /dev/null; then
  echo "OK:   Grafana accessible"
else
  echo "FAIL: Grafana not accessible"
  exit 1
fi

# Check all Calico dashboards
curl -s "${GRAFANA_URL}/api/search?query=calico&type=dash-db" \
  -H "Authorization: Bearer ${TOKEN}" | \
  jq -r '.[] | .uid + " " + .title' | \
while read uid title; do
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    "${GRAFANA_URL}/api/dashboards/uid/${uid}" \
    -H "Authorization: Bearer ${TOKEN}")
  echo "Dashboard '${title}': HTTP ${status}"
done
```

## Alert for Dashboard Unavailability

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: grafana-health-alerts
  namespace: monitoring
spec:
  groups:
    - name: grafana.health
      rules:
        - alert: GrafanaDown
          expr: up{job="grafana"} == 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Grafana is down - Calico dashboards unavailable"

        - alert: GrafanaHighErrorRate
          expr: |
            rate(grafana_http_request_duration_seconds_count{status_code=~"5.."}[5m]) > 0.1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Grafana is experiencing high error rate"
```

## Stale Data Detection

```promql
# Alert if Calico metrics haven't been updated in >10 minutes
# (indicates Prometheus scrape failure)
(time() - max(timestamp(felix_active_local_policies))) > 600
```

## Conclusion

Monitoring your Calico visualization infrastructure ensures dashboards are available when needed. Key signals are Grafana service health, dashboard accessibility (HTTP 200 responses), and metric freshness (timestamp-based staleness detection). Add these checks to your cluster health monitoring so dashboard failures are treated with the same urgency as other operational tool failures.
