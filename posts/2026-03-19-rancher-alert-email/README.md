# How to Configure Alert Notifications via Email in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Alerting, Email, Monitoring

Description: Step-by-step instructions for configuring email notifications for Rancher alerts using Alertmanager SMTP settings.

When critical events occur in your Kubernetes cluster, email notifications ensure your team is informed promptly. Rancher uses Alertmanager to route alerts to various notification channels, including email via SMTP. This guide covers the complete setup process for email alert notifications.

## Prerequisites

- Rancher v2.6 or later with the Monitoring chart installed.
- Cluster admin permissions.
- Access to an SMTP server (Gmail, SendGrid, Amazon SES, or your organization's mail server).
- SMTP credentials (username, password, host, port).

## Step 1: Create SMTP Credentials Secret

First, create a Kubernetes secret containing your SMTP password:

```bash
kubectl create secret generic alertmanager-smtp-secret \
  --namespace cattle-monitoring-system \
  --from-literal=password='your-smtp-password'
```

## Step 2: Configure Alertmanager via the Rancher UI

1. Navigate to your cluster in the Rancher UI.
2. If you're on Rancher v2.6.5 or later, go to **Monitoring > Alerting > AlertManagerConfigs**. On earlier v2.6 releases, go to **Monitoring > Receiver**.
3. Create a new email receiver configuration or edit an existing one.

Alternatively, if you want to manage the full Alertmanager YAML or use `smtp_auth_password_file`, configure it through the monitoring chart values in the next step.

## Step 3: Configure SMTP Settings in the Monitoring Chart

Upgrade the rancher-monitoring Helm release with SMTP configuration:

```yaml
alertmanager:
  alertmanagerSpec:
    alertmanagerConfiguration: {}
  config:
    global:
      smtp_from: "alerts@example.com"
      smtp_smarthost: "smtp.example.com:587"
      smtp_auth_username: "alerts@example.com"
      smtp_auth_password_file: /etc/alertmanager/secrets/alertmanager-smtp-secret/password
      smtp_require_tls: true
    route:
      receiver: "email-notifications"
      group_by:
        - alertname
        - namespace
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
      routes:
        - receiver: "email-critical"
          matchers:
            - severity = critical
          repeat_interval: 1h
        - receiver: "email-notifications"
          matchers:
            - severity =~ "warning|info"
    receivers:
      - name: "email-notifications"
        email_configs:
          - to: "team@example.com"
            send_resolved: true
            headers:
              Subject: '[{{ .Status | toUpper }}] Rancher Alert: {{ .CommonLabels.alertname }}'
      - name: "email-critical"
        email_configs:
          - to: "oncall@example.com, team-leads@example.com"
            send_resolved: true
            headers:
              Subject: '[CRITICAL] Rancher Alert: {{ .CommonLabels.alertname }}'
```

Mount the secret in the Alertmanager pod:

```yaml
alertmanager:
  alertmanagerSpec:
    secrets:
      - alertmanager-smtp-secret
```

## Step 4: Configure for Common SMTP Providers

### Gmail SMTP

```yaml
global:
  smtp_from: "your-email@gmail.com"
  smtp_smarthost: "smtp.gmail.com:587"
  smtp_auth_username: "your-email@gmail.com"
  smtp_auth_password_file: /etc/alertmanager/secrets/alertmanager-smtp-secret/password
  smtp_require_tls: true
```

Note: For Gmail, you need to use an App Password if 2FA is enabled. Go to Google Account > Security > 2-Step Verification > App Passwords to generate one.

### Amazon SES

```yaml
global:
  smtp_from: "alerts@your-verified-domain.com"
  smtp_smarthost: "email-smtp.us-east-1.amazonaws.com:587"
  smtp_auth_username: "YOUR_SES_SMTP_USERNAME"
  smtp_auth_password_file: /etc/alertmanager/secrets/alertmanager-smtp-secret/password
  smtp_require_tls: true
```

### SendGrid

```yaml
global:
  smtp_from: "alerts@example.com"
  smtp_smarthost: "smtp.sendgrid.net:587"
  smtp_auth_username: "apikey"
  smtp_auth_password_file: /etc/alertmanager/secrets/alertmanager-smtp-secret/password
  smtp_require_tls: true
```

For SendGrid, use the literal string `apikey` as the username and your SendGrid API key as the password.

## Step 5: Customize Email Templates

Create custom email templates for more informative notifications:

```yaml
alertmanager:
  templateFiles:
    email.tmpl: |-
      {{ define "custom_email_subject" }}
      [{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}
      {{ end }}

      {{ define "custom_email_body" }}
      {{ range .Alerts }}
      Alert: {{ .Labels.alertname }}
      Severity: {{ .Labels.severity }}
      Namespace: {{ .Labels.namespace }}
      Summary: {{ .Annotations.summary }}
      Description: {{ .Annotations.description }}
      Started: {{ .StartsAt.Format "2006-01-02 15:04:05 MST" }}
      {{ if eq .Status "resolved" }}Resolved: {{ .EndsAt.Format "2006-01-02 15:04:05 MST" }}{{ end }}
      ---
      {{ end }}
      {{ end }}
```

Reference the templates in your receiver configuration:

```yaml
receivers:
  - name: "email-notifications"
    email_configs:
      - to: "team@example.com"
        send_resolved: true
        text: '{{ template "custom_email_body" . }}'
        headers:
          Subject: '{{ template "custom_email_subject" . }}'
```

## Step 6: Configure Routing Rules

Route alerts to different email recipients based on labels:

```yaml
route:
  receiver: "default-email"
  group_by:
    - alertname
    - namespace
  routes:
    - receiver: "platform-team"
      matchers:
        - team = platform
    - receiver: "app-team"
      matchers:
        - team = application
    - receiver: "database-team"
      matchers:
        - alertname =~ ".*Database.*|.*MySQL.*|.*Postgres.*"

receivers:
  - name: "default-email"
    email_configs:
      - to: "ops@example.com"
  - name: "platform-team"
    email_configs:
      - to: "platform@example.com"
  - name: "app-team"
    email_configs:
      - to: "appdev@example.com"
  - name: "database-team"
    email_configs:
      - to: "dba@example.com"
```

## Step 7: Test Email Notifications

After applying the configuration, trigger a test alert to verify email delivery:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: test-email-alert
  namespace: cattle-monitoring-system
  labels:
    app: rancher-monitoring
    release: rancher-monitoring
spec:
  groups:
    - name: test
      rules:
        - alert: TestEmailAlert
          expr: vector(1)
          for: 1m
          labels:
            severity: warning
          annotations:
            summary: "Test email alert"
            description: "This is a test alert to verify email notifications."
```

Apply the rule and wait a few minutes for the alert to fire and the email to be sent. Then delete the test rule:

```bash
kubectl apply -f test-email-alert.yaml
# Wait for email

kubectl delete -f test-email-alert.yaml
```

## Step 8: Verify Configuration

Check the Alertmanager configuration was loaded correctly:

```bash
kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-alertmanager 9093:9093
```

Navigate to `http://localhost:9093/#/status` to see the active configuration.

Check Alertmanager logs for SMTP errors:

```bash
kubectl logs -n cattle-monitoring-system -l app.kubernetes.io/name=alertmanager -c alertmanager
```

## Troubleshooting

Common issues and solutions:

- **Connection refused**: Verify the SMTP host and port. Check if the cluster network allows outbound SMTP connections.
- **Authentication failed**: Double-check the username and password. For Gmail, ensure you are using an App Password.
- **TLS handshake error**: Make sure the SMTP port matches the TLS mode. Port 587 typically uses STARTTLS, while port 465 uses implicit TLS. In current Alertmanager versions, port 465 is auto-detected for implicit TLS; if needed, set `smtp_force_implicit_tls: true` instead of disabling TLS.
- **Emails not received**: Check spam folders and verify the sender address is not blocked.

## Summary

Configuring email notifications in Rancher involves setting up SMTP credentials, configuring Alertmanager's global SMTP settings, defining receivers with target email addresses, and creating routing rules to direct alerts to the appropriate team members. Test your configuration with a dummy alert before relying on it for production monitoring.
