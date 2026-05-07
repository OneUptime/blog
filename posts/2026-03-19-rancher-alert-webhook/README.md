# How to Configure Alert Notifications via Webhook in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Alerting, Webhook, Monitoring

Description: Learn how to configure generic webhook notifications for Rancher alerts to integrate with any external system.

Webhooks provide a flexible way to integrate Rancher alerts with any external system that accepts HTTP requests. Whether you want to trigger CI/CD pipelines, update incident management tools, or send alerts to custom dashboards, webhook notifications give you full control over the integration. This guide covers configuring Alertmanager webhook receivers in Rancher.

## Prerequisites

- Rancher v2.11 or later with the Monitoring chart installed.
- Cluster admin permissions.
- A webhook endpoint that accepts HTTP POST requests.

## Step 1: Set Up a Webhook Endpoint

Your webhook endpoint must accept HTTP POST requests with JSON payload. Here is the format Alertmanager sends:

```json
{
  "version": "4",
  "groupKey": "{}:{alertname=\"HighCPU\"}",
  "truncatedAlerts": 0,
  "status": "firing",
  "receiver": "webhook-receiver",
  "groupLabels": {
    "alertname": "HighCPU"
  },
  "commonLabels": {
    "alertname": "HighCPU",
    "severity": "warning"
  },
  "commonAnnotations": {
    "summary": "High CPU usage detected"
  },
  "externalURL": "http://alertmanager:9093",
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "alertname": "HighCPU",
        "instance": "node-1",
        "severity": "warning"
      },
      "annotations": {
        "summary": "High CPU usage detected",
        "description": "CPU usage is above 85%"
      },
      "startsAt": "2026-03-19T10:00:00.000Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "generatorURL": "http://prometheus:9090/graph?...",
      "fingerprint": "c6eadffa33fcdf37"
    }
  ]
}
```

## Step 2: Configure Basic Webhook Receiver

Update the rancher-monitoring Helm chart values to add a webhook receiver:

```yaml
alertmanager:
  config:
    route:
      receiver: "webhook-default"
      group_by:
        - alertname
        - namespace
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
    receivers:
      - name: "webhook-default"
        webhook_configs:
          - url: "https://webhook.example.com/api/alerts"
            send_resolved: true
```

## Step 3: Configure Authentication

### Basic Auth

```yaml
receivers:
  - name: "webhook-basic-auth"
    webhook_configs:
      - url: "https://webhook.example.com/api/alerts"
        send_resolved: true
        http_config:
          basic_auth:
            username: "alertmanager"
            password_file: /etc/alertmanager/secrets/webhook-secret/password
```

Create the secret:

```bash
kubectl create secret generic webhook-secret \
  --namespace cattle-monitoring-system \
  --from-literal=password='your-webhook-password'
```

Mount the secret:

```yaml
alertmanager:
  alertmanagerSpec:
    secrets:
      - webhook-secret
```

### Bearer Token

```yaml
receivers:
  - name: "webhook-bearer"
    webhook_configs:
      - url: "https://webhook.example.com/api/alerts"
        send_resolved: true
        http_config:
          authorization:
            type: Bearer
            credentials_file: /etc/alertmanager/secrets/webhook-token/token
```

Create the token secret and mount it:

```bash
kubectl create secret generic webhook-token \
  --namespace cattle-monitoring-system \
  --from-literal=token='your-bearer-token'
```

```yaml
alertmanager:
  alertmanagerSpec:
    secrets:
      - webhook-token
```

### Custom Headers

To add custom headers, use the `http_config` section:

```yaml
receivers:
  - name: "webhook-custom-headers"
    webhook_configs:
      - url: "https://webhook.example.com/api/alerts"
        send_resolved: true
        http_config:
          http_headers:
            X-Alertmanager-Source:
              values:
                - "rancher-monitoring"
            X-Webhook-Token:
              files:
                - /etc/alertmanager/secrets/webhook-token/token
```

## Step 4: Configure Multiple Webhook Endpoints

Send alerts to multiple systems simultaneously:

```yaml
receivers:
  - name: "multi-webhook"
    webhook_configs:
      - url: "https://incident-management.example.com/api/alerts"
        send_resolved: true
      - url: "https://custom-dashboard.example.com/api/alerts"
        send_resolved: true
      - url: "https://automation.example.com/api/triggers"
        send_resolved: false
```

## Step 5: Route Alerts to Different Webhooks

Use routing rules to send different alert types to different webhook endpoints:

```yaml
alertmanager:
  config:
    route:
      receiver: "default-webhook"
      routes:
        - receiver: "infrastructure-webhook"
          matchers:
            - 'alertname=~"Node.*|etcd.*|APIServer.*"'
        - receiver: "application-webhook"
          matchers:
            - 'alertname=~"Pod.*|Deployment.*|Service.*"'
        - receiver: "security-webhook"
          matchers:
            - 'category="security"'
    receivers:
      - name: "default-webhook"
        webhook_configs:
          - url: "https://ops.example.com/api/alerts"
      - name: "infrastructure-webhook"
        webhook_configs:
          - url: "https://infra.example.com/api/alerts"
      - name: "application-webhook"
        webhook_configs:
          - url: "https://app.example.com/api/alerts"
      - name: "security-webhook"
        webhook_configs:
          - url: "https://security.example.com/api/alerts"
```

## Step 6: Build a Simple Webhook Receiver

If you need a custom webhook receiver, here is a minimal example in Python:

```python
from flask import Flask, request, jsonify
import json
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

@app.route('/api/alerts', methods=['POST'])
def receive_alert():
    data = request.json
    status = data.get('status', 'unknown')
    alerts = data.get('alerts', [])

    for alert in alerts:
        alert_name = alert['labels'].get('alertname', 'Unknown')
        severity = alert['labels'].get('severity', 'unknown')
        summary = alert['annotations'].get('summary', 'No summary')

        logging.info(
            f"Alert: {alert_name} | Status: {status} | "
            f"Severity: {severity} | Summary: {summary}"
        )

        # Add your custom logic here:
        # - Create tickets in issue trackers
        # - Trigger automation workflows
        # - Update status pages
        # - Send to custom notification systems

    return jsonify({"status": "received"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

Deploy this as a Kubernetes service and point your webhook URL to it.

## Step 7: Configure TLS for Internal Webhooks

For webhook endpoints running inside the cluster with self-signed certificates:

```yaml
receivers:
  - name: "internal-webhook"
    webhook_configs:
      - url: "https://my-receiver.default.svc.cluster.local:8443/api/alerts"
        http_config:
          tls_config:
            ca_file: /etc/alertmanager/secrets/webhook-ca/ca.crt
            insecure_skip_verify: false
```

Mount the `webhook-ca` secret with `alertmanager.alertmanagerSpec.secrets` so Alertmanager can read `ca.crt`.

## Step 8: Test the Webhook Integration

Create a test alert:

```bash
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: test-webhook-alert
  namespace: cattle-monitoring-system
  labels:
    app: rancher-monitoring
    release: rancher-monitoring
spec:
  groups:
    - name: test
      rules:
        - alert: TestWebhookNotification
          expr: vector(1)
          for: 1m
          labels:
            severity: info
          annotations:
            summary: "Test webhook notification"
            description: "This is a test alert to verify webhook integration."
EOF
```

You can also test directly with curl against Alertmanager:

```bash
kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-alertmanager 9093:9093

curl -X POST http://localhost:9093/api/v2/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {"alertname": "TestWebhook", "severity": "info"},
    "annotations": {"summary": "Test webhook"},
    "startsAt": "2026-03-19T00:00:00Z"
  }]'
```

Clean up after testing:

```bash
kubectl delete prometheusrule test-webhook-alert -n cattle-monitoring-system
```

## Troubleshooting

Check Alertmanager logs for webhook delivery errors:

```bash
kubectl logs -n cattle-monitoring-system -l app.kubernetes.io/name=alertmanager --all-containers=true --tail=200 | grep -i webhook
```

Common issues:

- **Connection refused**: Verify the webhook URL is reachable from within the cluster.
- **Certificate errors**: Check TLS configuration and CA certificates.
- **Timeout errors**: Increase the webhook timeout or check the receiver's performance.
- **Authentication failures**: Verify credentials in the mounted secrets.

## Summary

Webhook notifications in Rancher provide the most flexible alert integration option. Configure webhook receivers in Alertmanager with appropriate authentication, routing rules, and TLS settings. Webhooks can integrate with any system that accepts HTTP POST requests, making them ideal for custom incident management workflows, automation triggers, and third-party integrations.
