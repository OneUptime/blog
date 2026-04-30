# How to Configure Grafana Alerts for IPv4 Endpoint Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, IPv4, Alert, Availability, Monitoring, Prometheus

Description: Create Grafana Unified Alerting rules to monitor IPv4 endpoint availability using Blackbox Exporter probe metrics, configure notification channels, and route alerts.

## Introduction

Grafana Unified Alerting (introduced in Grafana 8) evaluates alert rules against data sources and sends notifications through contact points. Using Blackbox Exporter probe metrics, you can alert when IPv4 endpoints become unreachable or return errors.

## Prerequisites

```bash
# Ensure Blackbox Exporter is running and scraping targets
# Ensure the HTTP probe module for these targets is IPv4-only:
#   preferred_ip_protocol: ip4
#   ip_protocol_fallback: false

# (See Prometheus Blackbox Exporter configuration)

# Verify probe metrics are available
curl -s "http://10.0.0.5:9090/api/v1/query?query=probe_success" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); [print(r['metric']['instance'], r['value'][1]) for r in d['data']['result']]"
```

## Grafana Unified Alert Rules

```yaml
# /etc/grafana/provisioning/alerting/availability_alerts.yml

apiVersion: 1

groups:
  - orgId: 1
    name: IPv4 Availability
    folder: Infrastructure
    interval: 1m
    rules:
      - uid: endpoint-down-01
        title: IPv4 Endpoint Down
        condition: C
        data:
          - refId: A
            queryType: ''
            relativeTimeRange:
              from: 300
              to: 0
            datasourceUid: prometheus-uid
            model:
              expr: probe_success{job="blackbox_http"}
              instant: true
              intervalMs: 1000
              maxDataPoints: 43200
              range: false
              refId: A

          - refId: C
            queryType: ''
            relativeTimeRange:
              from: 0
              to: 0
            datasourceUid: __expr__
            model:
              conditions:
                - evaluator:
                    params: [1]
                    type: lt
                  operator:
                    type: and
                  query:
                    params: [A]
                  reducer:
                    params: []
                    type: last
                  type: query
              datasource:
                type: __expr__
                uid: __expr__
              intervalMs: 1000
              maxDataPoints: 43200
              refId: C
              type: classic_conditions

        noDataState: Alerting
        execErrState: Error
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "One or more IPv4 endpoints are not reachable"
          description: |
            {{ range $k, $v := $values -}}
            {{ if (match "C[0-9]+" $k) -}}
            {{ $v.Labels }} probe_success={{ $v.Value }}
            {{ end }}
            {{ end }}
```

## Contact Points (Notification Channels)

```yaml
# /etc/grafana/provisioning/alerting/contact_points.yml

apiVersion: 1

contactPoints:
  - orgId: 1
    name: Email Notifications
    receivers:
      - uid: email-01
        type: email
        settings:
          addresses: ops@example.com;alerts@example.com
          singleEmail: false
        disableResolveMessage: false

  - orgId: 1
    name: Slack Ops
    receivers:
      - uid: slack-01
        type: slack
        settings:
          recipient: '#ops-alerts'
          text: |
            *Alert:* {{ .GroupLabels.alertname }}
            *Severity:* {{ .GroupLabels.severity }}
            {{ range .Alerts }}
            - Instance: {{ .Labels.instance }}
            {{ end }}
        secure_settings:
          url: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

## Notification Policies

```yaml
# /etc/grafana/provisioning/alerting/policies.yml

apiVersion: 1

policies:
  - orgId: 1
    receiver: Email Notifications
    group_by: ['alertname', 'severity']
    group_wait: 30s
    group_interval: 5m
    repeat_interval: 4h
    routes:
      - receiver: Slack Ops
        object_matchers:
          - ['severity', '=', 'critical']
        group_wait: 10s
        repeat_interval: 1h
```

## Dashboard Alert Panel

```promql
# Panel alert query for "Availability Status" gauge:
# Panel type: Stat
# Query: probe_success{instance=~"$instance"}
# Thresholds:
#   0 = Red (down)
#   1 = Green (up)

# HTTP response time alert:
# Query: probe_duration_seconds{job="blackbox_http"}
# Alert if > 2 seconds for 5 minutes
```

## Conclusion

Grafana Unified Alerting evaluates PromQL against Prometheus data. Use `probe_success == 0` from a Blackbox Exporter module configured with `preferred_ip_protocol: ip4` and `ip_protocol_fallback: false` to detect IPv4 endpoint failures. Configure contact points for notification channels (email, Slack, PagerDuty) and notification policies for routing by severity. Provision alerting rules, contact points, and policies through YAML files in `/etc/grafana/provisioning/alerting/` for version-controlled alert management.
