# How to Use Rancher Webhooks for Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Webhook, Automation, Alerting, Integration

Description: A guide to using Rancher alerting webhooks and custom webhook integrations to automate responses to cluster events and alerts.

## Overview

Rancher's alerting system can deliver notifications via webhooks, enabling integration with chat systems (Slack, Teams), ticketing systems (Jira, ServiceNow), and custom automation workflows. Webhooks allow you to build automated responses to cluster events - from spinning up replacement nodes to creating incident tickets automatically. This guide covers webhook configuration and integration patterns.

## Configuring Rancher Alert Receivers (Alertmanager)

Rancher Monitoring uses Prometheus Alertmanager for routing and delivering alerts. Configure webhook receivers in Alertmanager:

### Alertmanager Configuration

```yaml
# AlertmanagerConfig for webhook routing

apiVersion: monitoring.coreos.com/v1alpha1
kind: AlertmanagerConfig
metadata:
  name: webhook-config
  namespace: cattle-monitoring-system
spec:
  route:
    receiver: default-webhook
    groupWait: 30s
    groupInterval: 5m
    repeatInterval: 12h
    routes:
      # Critical alerts go to PagerDuty
      - receiver: pagerduty-critical
        matchers:
          - name: severity
            value: critical
      # Warning alerts go to Slack
      - receiver: slack-warnings
        matchers:
          - name: severity
            value: warning
      # Specific alert types go to custom automation webhook
      - receiver: automation-webhook
        matchers:
          - name: alertname
            value: NodeNotReady

  receivers:
    - name: default-webhook
      webhookConfigs:
        - url: "http://webhook-handler.automation:8080/rancher/alerts"
          sendResolved: true

    - name: automation-webhook
      webhookConfigs:
        - url: "http://automation-service.automation:8080/auto-remediate"
          sendResolved: true
          httpConfig:
            bearerTokenSecret:
              name: automation-webhook-token
              key: token

    - name: slack-warnings
      slackConfigs:
        - apiURL:
            name: slack-webhook-secret
            key: url
          channel: "#k8s-alerts"
          title: "Rancher Alert: {{ .GroupLabels.alertname }}"
          text: "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}"
```

## Building a Webhook Handler

Create a simple webhook handler that receives Rancher alerts and performs automated actions:

### Python Webhook Handler

```python
#!/usr/bin/env python3
# webhook-handler.py
from flask import Flask, request, jsonify
import subprocess
import json
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/rancher/alerts', methods=['POST'])
def handle_alert():
    """Process incoming Alertmanager webhook notifications"""
    payload = request.get_json()

    if not payload:
        return jsonify({'error': 'Invalid payload'}), 400

    alerts = payload.get('alerts', [])

    for alert in alerts:
        alert_name = alert.get('labels', {}).get('alertname', 'unknown')
        status = alert.get('status', 'unknown')
        namespace = alert.get('labels', {}).get('namespace', 'unknown')
        pod = alert.get('labels', {}).get('pod', 'unknown')

        logger.info(f"Received alert: {alert_name} ({status}) - {namespace}/{pod}")

        # Route to specific handlers based on alert type
        if alert_name == 'NodeNotReady':
            handle_node_not_ready(alert)
        elif alert_name == 'PodCrashLooping':
            handle_crash_looping_pod(alert)
        elif alert_name == 'HighMemoryUsage':
            handle_high_memory(alert)

    return jsonify({'status': 'processed', 'count': len(alerts)}), 200


def handle_node_not_ready(alert: dict):
    """Auto-remediation for NotReady nodes"""
    node = alert.get('labels', {}).get('node', '')
    logger.info(f"Node not ready: {node}")

    if alert.get('status') == 'firing':
        # Create an incident in your ITSM system
        create_incident({
            'title': f'Kubernetes Node Not Ready: {node}',
            'severity': 'HIGH',
            'description': alert.get('annotations', {}).get('description', '')
        })


def handle_crash_looping_pod(alert: dict):
    """Handle crash-looping pods"""
    namespace = alert.get('labels', {}).get('namespace', '')
    pod = alert.get('labels', {}).get('pod', '')

    if alert.get('status') == 'firing':
        # Capture logs before auto-restart
        logger.info(f"Capturing logs for crash-looping pod: {namespace}/{pod}")

        # Post to Slack with logs
        post_slack_message({
            'text': f':warning: Pod {namespace}/{pod} is crash-looping',
            'attachments': [{
                'title': 'Recent logs',
                'text': get_pod_logs(namespace, pod)
            }]
        })


def handle_high_memory(alert: dict):
    """Handle high memory usage - scale up if below max"""
    deployment = alert.get('labels', {}).get('deployment', '')
    namespace = alert.get('labels', {}).get('namespace', '')

    if alert.get('status') == 'firing':
        logger.info(f"Triggering scale-up for {namespace}/{deployment}")
        # Trigger scale-up via kubectl or Rancher API
        scale_deployment(namespace, deployment)


def get_pod_logs(namespace: str, pod: str) -> str:
    """Capture pod logs for debugging"""
    try:
        result = subprocess.run(
            ['kubectl', 'logs', pod, '-n', namespace, '--tail=50'],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout
    except Exception as e:
        return f"Could not capture logs: {e}"


def scale_deployment(namespace: str, deployment: str):
    """Scale a deployment up by 1 replica"""
    try:
        # Get current replica count
        result = subprocess.run(
            ['kubectl', 'get', 'deployment', deployment,
             '-n', namespace, '-o', 'jsonpath={.spec.replicas}'],
            capture_output=True, text=True, check=True, timeout=10
        )
        current = int(result.stdout.strip())
        new_count = current + 1

        subprocess.run(
            ['kubectl', 'scale', 'deployment', deployment,
             '-n', namespace, f'--replicas={new_count}'],
            check=True, timeout=30
        )
    except subprocess.CalledProcessError as e:
        logger.error(f"Scale failed: {e}")


def create_incident(data: dict):
    """Create incident in ITSM (example: ServiceNow)"""
    import requests
    requests.post(
        'https://your-instance.service-now.com/api/now/table/incident',
        json={
            'short_description': data['title'],
            'description': data['description'],
            'urgency': '1' if data['severity'] == 'HIGH' else '2',
            'category': 'Kubernetes'
        },
        headers={'Authorization': 'Bearer ${SERVICENOW_TOKEN}'}
    )


def post_slack_message(data: dict):
    """Post message to Slack"""
    import requests
    import os
    requests.post(os.environ['SLACK_WEBHOOK'], json=data)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

### Deploy the Webhook Handler

```yaml
# Deployment for the webhook handler
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webhook-handler
  namespace: automation
spec:
  replicas: 2
  selector:
    matchLabels:
      app: webhook-handler
  template:
    metadata:
      labels:
        app: webhook-handler
    spec:
      containers:
        - name: handler
          image: registry.example.com/webhook-handler:latest
          ports:
            - containerPort: 8080
          env:
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: notifications
                  key: slack-webhook
            - name: SERVICENOW_TOKEN
              valueFrom:
                secretKeyRef:
                  name: itsm-credentials
                  key: token
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
```

## GitHub Actions Integration via Webhook

```yaml
# Trigger GitHub Actions workflow on cluster events
apiVersion: monitoring.coreos.com/v1alpha1
kind: AlertmanagerConfig
metadata:
  name: github-actions-trigger
spec:
  receivers:
    - name: github-trigger
      webhookConfigs:
        - url: "https://api.github.com/repos/myorg/ops-runbooks/dispatches"
          httpConfig:
            bearerTokenSecret:
              name: github-token-secret
              key: token
          sendResolved: false
```

## Conclusion

Rancher webhooks bridge the gap between cluster events and automated remediation workflows. By combining Alertmanager webhook receivers with a custom webhook handler, you can build sophisticated auto-remediation pipelines: automatically restarting crash-looping pods, scaling services under load, creating incident tickets, and notifying on-call engineers. Keep webhook handlers simple, idempotent, and well-tested. Always implement circuit breakers to prevent automated responses from making situations worse during cascading failures.
