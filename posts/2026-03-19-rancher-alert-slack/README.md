# How to Configure Alert Notifications via Slack in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Alerting, Slack, Monitoring

Description: Learn how to send Rancher cluster alerts to Slack channels using Alertmanager webhook integration.

Slack is one of the most popular notification channels for DevOps teams. Integrating Rancher alerts with Slack ensures that your team gets real-time notifications about cluster issues directly in their communication platform. This guide covers setting up Slack webhooks, configuring Alertmanager, and routing alerts to different channels.

## Prerequisites

- Rancher v2.6 or later with the Monitoring chart installed.
- Cluster admin permissions.
- A Slack workspace with permission to create incoming webhooks.

## Step 1: Create a Slack Incoming Webhook

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) and click **Create New App**.
2. Select **From scratch** and give your app a name like "Rancher Alerts".
3. Select your workspace and click **Create App**.
4. In the app settings, go to **Incoming Webhooks** and toggle it on.
5. Click **Add New Webhook to Workspace**.
6. Select the channel where you want alerts to be posted.
7. Copy the webhook URL. It will look like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`.

## Step 2: Create a Secret for the Webhook URL

Store the webhook URL as a Kubernetes secret:

```bash
kubectl create secret generic alertmanager-slack-secret \
  --namespace cattle-monitoring-system \
  --from-literal=webhook-url='https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
```

## Step 3: Configure Alertmanager for Slack

Update the rancher-monitoring Helm chart values to include Slack receiver configuration:

```yaml
alertmanager:
  alertmanagerSpec:
    secrets:
      - alertmanager-slack-secret
  config:
    global:
      slack_api_url_file: /etc/alertmanager/secrets/alertmanager-slack-secret/webhook-url
    route:
      receiver: "slack-notifications"
      group_by:
        - alertname
        - namespace
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
    receivers:
      - name: "slack-notifications"
        slack_configs:
          - channel: "#kubernetes-alerts"
            send_resolved: true
            title: '{{ if eq .Status "firing" }}:red_circle:{{ else }}:white_check_mark:{{ end }} [{{ .Status | toUpper }}] {{ .CommonLabels.alertname }}'
            text: >-
              {{ range .Alerts }}
              *Alert:* {{ .Labels.alertname }}
              *Severity:* {{ .Labels.severity }}
              *Namespace:* {{ .Labels.namespace }}
              *Summary:* {{ .Annotations.summary }}
              *Description:* {{ .Annotations.description }}
              {{ end }}
```

## Step 4: Route Alerts to Different Channels

Because each Slack incoming webhook is tied to a single channel, use a separate webhook URL for each destination channel. Assuming you created `slack-critical-webhook` and `slack-warnings-webhook` secrets, route critical alerts to a dedicated channel and warnings to a general channel:

```yaml
alertmanager:
  alertmanagerSpec:
    secrets:
      - slack-critical-webhook
      - slack-warnings-webhook
  config:
    route:
      receiver: "slack-warnings"
      group_by:
        - alertname
        - namespace
      routes:
        - receiver: "slack-critical"
          matchers:
            - severity = "critical"
          repeat_interval: 1h
          continue: false
        - receiver: "slack-warnings"
          matchers:
            - severity = "warning"
          repeat_interval: 4h
    receivers:
      - name: "slack-critical"
        slack_configs:
          - api_url_file: /etc/alertmanager/secrets/slack-critical-webhook/webhook-url
            channel: "#critical-alerts"
            send_resolved: true
            color: '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'
            title: ':rotating_light: [CRITICAL] {{ .CommonLabels.alertname }}'
            text: >-
              {{ range .Alerts }}
              *Cluster:* {{ .Labels.cluster }}
              *Namespace:* {{ .Labels.namespace }}
              *Summary:* {{ .Annotations.summary }}
              *Description:* {{ .Annotations.description }}
              {{ end }}
      - name: "slack-warnings"
        slack_configs:
          - api_url_file: /etc/alertmanager/secrets/slack-warnings-webhook/webhook-url
            channel: "#kubernetes-alerts"
            send_resolved: true
            color: '{{ if eq .Status "firing" }}warning{{ else }}good{{ end }}'
            title: ':warning: [WARNING] {{ .CommonLabels.alertname }}'
            text: >-
              {{ range .Alerts }}
              *Namespace:* {{ .Labels.namespace }}
              *Summary:* {{ .Annotations.summary }}
              {{ end }}
```

## Step 5: Use Rich Message Formatting

Slack supports rich message formatting with attachments. With incoming webhooks, the detailed formatting below works, but the default channel, username, and icon come from the Slack app configuration. Configure a more detailed message format:

```yaml
receivers:
  - name: "slack-rich"
    slack_configs:
      - channel: "#kubernetes-alerts"
        send_resolved: true
        title: '{{ .CommonLabels.alertname }}'
        title_link: "https://rancher.example.com"
        text: >-
          {{ range .Alerts -}}
          *Alert:* {{ .Annotations.summary }}{{ if .Labels.severity }} - `{{ .Labels.severity }}`{{ end }}
          *Description:* {{ .Annotations.description }}
          *Details:*
            {{ range .Labels.SortedPairs }} - *{{ .Name }}:* `{{ .Value }}`
            {{ end }}
          {{ end }}
        fallback: '{{ .CommonLabels.alertname }}: {{ .CommonAnnotations.summary }}'
        actions:
          - type: button
            text: "View in Rancher"
            url: "https://rancher.example.com/dashboard/c/local/monitoring/alertmanager"
          - type: button
            text: "Runbook"
            url: "https://wiki.example.com/runbooks/{{ .CommonLabels.alertname }}"
```

## Step 6: Configure Multiple Slack Workspaces

If you need to send alerts to different Slack workspaces, create separate secrets and reference them in each receiver:

```bash
kubectl create secret generic slack-workspace-a \
  --namespace cattle-monitoring-system \
  --from-literal=webhook-url='https://hooks.slack.com/services/WORKSPACE_A_URL'

kubectl create secret generic slack-workspace-b \
  --namespace cattle-monitoring-system \
  --from-literal=webhook-url='https://hooks.slack.com/services/WORKSPACE_B_URL'
```

```yaml
alertmanager:
  alertmanagerSpec:
    secrets:
      - slack-workspace-a
      - slack-workspace-b
  config:
    receivers:
      - name: "team-a-slack"
        slack_configs:
          - api_url_file: /etc/alertmanager/secrets/slack-workspace-a/webhook-url
            channel: "#alerts"
      - name: "team-b-slack"
        slack_configs:
          - api_url_file: /etc/alertmanager/secrets/slack-workspace-b/webhook-url
            channel: "#alerts"
```

## Step 7: Test the Slack Integration

Create a test alert to verify the integration:

```bash
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: test-slack-alert
  namespace: cattle-monitoring-system
  labels:
    app: rancher-monitoring
    release: rancher-monitoring
spec:
  groups:
    - name: test
      rules:
        - alert: TestSlackNotification
          expr: vector(1)
          for: 1m
          labels:
            severity: warning
          annotations:
            summary: "Test Slack notification"
            description: "This is a test alert to verify Slack integration."
EOF
```

Wait a few minutes for the alert to fire and check your Slack channel. After verification, clean up:

```bash
kubectl delete prometheusrule test-slack-alert -n cattle-monitoring-system
```

## Step 8: Verify and Troubleshoot

Check Alertmanager logs for Slack delivery errors:

```bash
kubectl logs -n cattle-monitoring-system -l app.kubernetes.io/name=alertmanager | grep -i slack
```

Common issues:

- **404 errors**: The webhook URL is invalid or has been revoked. Create a new webhook.
- **Channel not found**: The channel name in the configuration does not match an existing Slack channel.
- **Network errors**: The cluster may not allow outbound HTTPS connections. Check network policies and firewall rules.

## Summary

Integrating Rancher alerts with Slack involves creating a Slack incoming webhook, storing the URL as a Kubernetes secret, and configuring Alertmanager receivers and routes in the monitoring chart. Use severity-based routing to send critical alerts to dedicated channels, and leverage Slack's rich formatting to make alert messages informative and actionable.
