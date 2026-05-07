# How to Configure Alert Notifications via PagerDuty in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Alerting, PagerDuty, Monitoring

Description: Configure PagerDuty integration with Rancher alerts for incident management and on-call notification routing.

PagerDuty is an incident management platform that helps engineering teams respond to critical infrastructure issues. Integrating Rancher alerts with PagerDuty enables automatic incident creation, on-call scheduling, and escalation policies for your Kubernetes clusters. This guide covers the setup process from PagerDuty service creation to Alertmanager configuration.

## Prerequisites

- Rancher v2.6 or later with the Monitoring chart installed.
- Cluster admin permissions.
- A PagerDuty account with permission to create services and integrations.

## Step 1: Create a PagerDuty Service

1. Log in to your PagerDuty account.
2. Go to **Services > Service Directory**.
3. Click **New Service**.
4. Enter a name like "Kubernetes - Production Cluster".
5. Assign an escalation policy for the service.
6. Under **Integrations**, select **Events API V2**.
7. Click **Create Service**.
8. Copy the **Integration Key** (also called the routing key). You will need this for the Alertmanager configuration.

## Step 2: Create a Secret for the Integration Key

Store the PagerDuty integration key as a Kubernetes secret:

```bash
kubectl create secret generic alertmanager-pagerduty-secret \
  --namespace cattle-monitoring-system \
  --from-literal=integration-key='your-pagerduty-integration-key'
```

## Step 3: Configure Alertmanager for PagerDuty

Update the rancher-monitoring Helm chart values:

```yaml
alertmanager:
  alertmanagerSpec:
    secrets:
      - alertmanager-pagerduty-secret
  config:
    route:
      receiver: "pagerduty-critical"
      group_by:
        - alertname
        - namespace
        - cluster
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
      routes:
        - receiver: "pagerduty-critical"
          matchers:
            - severity = critical
          repeat_interval: 1h
        - receiver: "pagerduty-warning"
          matchers:
            - severity = warning
          repeat_interval: 4h
    receivers:
      - name: "pagerduty-critical"
        pagerduty_configs:
          - routing_key_file: /etc/alertmanager/secrets/alertmanager-pagerduty-secret/integration-key
            severity: critical
            description: '{{ .CommonLabels.alertname }}: {{ .CommonAnnotations.summary }}'
            details:
              firing: '{{ template "pagerduty.default.description" . }}'
              cluster: '{{ .CommonLabels.cluster }}'
              namespace: '{{ .CommonLabels.namespace }}'
      - name: "pagerduty-warning"
        pagerduty_configs:
          - routing_key_file: /etc/alertmanager/secrets/alertmanager-pagerduty-secret/integration-key
            severity: warning
            description: '{{ .CommonLabels.alertname }}: {{ .CommonAnnotations.summary }}'
```

## Step 4: Use Multiple PagerDuty Services

Route alerts to different PagerDuty services based on team or component:

```bash
kubectl create secret generic pagerduty-platform-key \
  --namespace cattle-monitoring-system \
  --from-literal=integration-key='platform-team-integration-key'

kubectl create secret generic pagerduty-app-key \
  --namespace cattle-monitoring-system \
  --from-literal=integration-key='app-team-integration-key'
```

```yaml
alertmanager:
  alertmanagerSpec:
    secrets:
      - pagerduty-platform-key
      - pagerduty-app-key
  config:
    route:
      receiver: "pagerduty-platform"
      routes:
        - receiver: "pagerduty-platform"
          matchers:
            - team = platform
        - receiver: "pagerduty-app"
          matchers:
            - team = application
    receivers:
      - name: "pagerduty-platform"
        pagerduty_configs:
          - routing_key_file: /etc/alertmanager/secrets/pagerduty-platform-key/integration-key
            severity: '{{ .CommonLabels.severity }}'
      - name: "pagerduty-app"
        pagerduty_configs:
          - routing_key_file: /etc/alertmanager/secrets/pagerduty-app-key/integration-key
            severity: '{{ .CommonLabels.severity }}'
```

## Step 5: Configure PagerDuty Event Details

Enrich PagerDuty incidents with additional context by configuring the details field:

```yaml
receivers:
  - name: "pagerduty-detailed"
    pagerduty_configs:
      - routing_key_file: /etc/alertmanager/secrets/alertmanager-pagerduty-secret/integration-key
        severity: '{{ .CommonLabels.severity }}'
        class: '{{ .CommonLabels.alertname }}'
        component: '{{ .CommonLabels.service }}'
        group: '{{ .CommonLabels.namespace }}'
        description: '{{ .CommonAnnotations.summary }}'
        details:
          alert_name: '{{ .CommonLabels.alertname }}'
          cluster: '{{ .CommonLabels.cluster }}'
          namespace: '{{ .CommonLabels.namespace }}'
          severity: '{{ .CommonLabels.severity }}'
          description: '{{ .CommonAnnotations.description }}'
          runbook: '{{ .CommonAnnotations.runbook_url }}'
          num_firing: '{{ .Alerts.Firing | len }}'
          num_resolved: '{{ .Alerts.Resolved | len }}'
        links:
          - href: 'https://rancher.example.com/dashboard'
            text: 'Rancher Dashboard'
          - href: '{{ .CommonAnnotations.runbook_url }}'
            text: 'Runbook'
```

## Step 6: Configure Auto-Resolution

PagerDuty incidents can be automatically resolved when alerts clear. This is enabled by default with `send_resolved: true`:

```yaml
receivers:
  - name: "pagerduty-auto-resolve"
    pagerduty_configs:
      - routing_key_file: /etc/alertmanager/secrets/alertmanager-pagerduty-secret/integration-key
        send_resolved: true
```

When an alert stops firing, Alertmanager sends a resolve event to PagerDuty, which automatically resolves the incident.

## Step 7: Test the PagerDuty Integration

Create a test alert:

```bash
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: test-pagerduty-alert
  namespace: cattle-monitoring-system
  labels:
    app: rancher-monitoring
    release: rancher-monitoring
spec:
  groups:
    - name: test
      rules:
        - alert: TestPagerDutyNotification
          expr: vector(1)
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Test PagerDuty notification"
            description: "This is a test alert to verify PagerDuty integration."
EOF
```

Check PagerDuty for the incident. After verification, clean up:

```bash
kubectl delete prometheusrule test-pagerduty-alert -n cattle-monitoring-system
```

## Step 8: Verify and Troubleshoot

Check Alertmanager logs for PagerDuty delivery errors:

```bash
kubectl logs -n cattle-monitoring-system -l app.kubernetes.io/name=alertmanager \
  -c alertmanager --tail=-1 --prefix | grep -i pagerduty
```

Common issues:

- **PagerDuty API errors**: Verify the integration key, and make sure the receiver is using an **Events API v2** integration key with `routing_key` or `routing_key_file`.
- **Network errors**: Ensure the cluster allows outbound HTTPS connections to the PagerDuty Events API endpoint for your account region: `events.pagerduty.com` or `events.eu.pagerduty.com`.
- **Incidents not auto-resolving**: Verify `send_resolved: true` is set in the PagerDuty config.
- **Duplicate incidents**: Check group_by labels and group_interval settings to ensure related alerts are grouped properly.

## Summary

PagerDuty integration with Rancher alerts provides automated incident management for your Kubernetes clusters. Configure integration keys as secrets, set up Alertmanager receivers with severity mapping, and use routing rules to direct alerts to the appropriate PagerDuty services and on-call teams. Enable auto-resolution to automatically close incidents when issues are resolved.
