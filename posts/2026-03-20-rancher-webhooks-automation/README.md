# How to Use Rancher Webhooks for Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Webhook, Automation, Alerting, Integration

Description: A guide to using Rancher alerting webhooks and custom webhook integrations to automate responses to cluster events and alerts.

## Overview

Rancher Monitoring can deliver notifications via webhooks, enabling integration with chat systems (Slack, Teams), ticketing systems (Jira, ServiceNow), and custom automation workflows. Webhooks allow you to build automated responses to cluster events - from spinning up replacement nodes to creating incident tickets automatically. This guide covers webhook configuration and integration patterns.

## Configuring Rancher Alert Receivers (Alertmanager)

Rancher Monitoring uses Prometheus Alertmanager for routing and delivering alerts. Because Prometheus Operator applies namespace scoping to `AlertmanagerConfig` objects by default, configure `rancher-monitoring` so the `AlertmanagerConfig` in `cattle-monitoring-system` can process cluster-wide alerts:

```yaml
# rancher-monitoring values
alertmanager:
  alertmanagerSpec:
    alertmanagerConfigMatcherStrategy:
      type: OnNamespaceExceptForAlertmanagerNamespace
```

Then create the webhook receivers:

### Alertmanager Configuration

```yaml
# AlertmanagerConfig for webhook routing

apiVersion: monitoring.coreos.com/v1beta1
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
      # Crash-looping pods go to the webhook handler for log capture
      - receiver: default-webhook
        matchers:
          - name: alertname
            value: KubePodCrashLooping
      # High memory alerts go to the webhook handler for scaling
      - receiver: default-webhook
        matchers:
          - name: alertname
            value: HighMemoryUsage
      # Warning alerts go to Slack
      - receiver: slack-warnings
        matchers:
          - name: severity
            value: warning
      # Node alerts go to the webhook handler for incident creation
      - receiver: default-webhook
        matchers:
          - name: alertname
            value: KubeNodeNotReady
        continue: true
      # Critical alerts go to PagerDuty
      - receiver: pagerduty-critical
        matchers:
          - name: severity
            value: critical

  receivers:
    - name: default-webhook
      webhookConfigs:
        - url: "http://webhook-handler.automation:8080/rancher/alerts"
          sendResolved: true

    - name: pagerduty-critical
      pagerdutyConfigs:
        - routingKey:
            name: pagerduty-routing-key
            key: key
          sendResolved: true
          severity: critical
          description: "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}"

    - name: slack-warnings
      slackConfigs:
        - apiURL:
            name: slack-webhook-secret
            key: url
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
import os
import subprocess
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/rancher/alerts', methods=['POST'])
def handle_alert():
    """Process incoming Alertmanager webhook notifications"""
    payload = request.get_json(silent=True)

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
        if alert_name == 'KubeNodeNotReady':
            handle_node_not_ready(alert)
        elif alert_name == 'KubePodCrashLooping':
            handle_crash_looping_pod(alert)
        elif alert_name == 'HighMemoryUsage':
            handle_high_memory(alert)

    return jsonify({'status': 'processed', 'count': len(alerts)}), 200


@app.route('/github/repository-dispatch', methods=['POST'])
def trigger_github_actions():
    """Forward Alertmanager webhooks to GitHub repository_dispatch"""
    payload = request.get_json(silent=True)

    if not payload:
        return jsonify({'error': 'Invalid payload'}), 400

    alerts = payload.get('alerts', [])
    first_alert = alerts[0] if alerts else {}

    import requests

    try:
        response = requests.post(
            'https://api.github.com/repos/myorg/ops-runbooks/dispatches',
            headers={
                'Accept': 'application/vnd.github+json',
                'Authorization': f"Bearer {os.environ['GITHUB_TOKEN']}",
                'X-GitHub-Api-Version': '2026-03-10'
            },
            json={
                'event_type': 'rancher-alert',
                'client_payload': {
                    'status': payload.get('status'),
                    'receiver': payload.get('receiver'),
                    'alertname': first_alert.get('labels', {}).get('alertname'),
                    'labels': first_alert.get('labels', {}),
                    'annotations': first_alert.get('annotations', {})
                }
            },
            timeout=10
        )
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"GitHub dispatch failed: {e}")
        return jsonify({'error': 'GitHub dispatch failed'}), 502

    return jsonify({'status': 'dispatched'}), 202


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
    container = alert.get('labels', {}).get('container', '')

    if alert.get('status') == 'firing':
        # Capture logs for triage
        logger.info(f"Capturing logs for crash-looping pod: {namespace}/{pod}")

        # Post to Slack with logs
        post_slack_message({
            'text': f':warning: Pod {namespace}/{pod} is crash-looping',
            'attachments': [{
                'title': 'Recent logs',
                'text': get_pod_logs(namespace, pod, container)
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


def get_pod_logs(namespace: str, pod: str, container: str = '') -> str:
    """Capture pod logs for debugging"""
    try:
        command = ['kubectl', 'logs', pod, '-n', namespace, '--tail=50']
        if container:
            command.extend(['-c', container])

        result = subprocess.run(
            command,
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
        headers={'Authorization': f"Bearer {os.environ['SERVICENOW_TOKEN']}"},
        timeout=10
    )


def post_slack_message(data: dict):
    """Post message to Slack"""
    import requests
    requests.post(os.environ['SLACK_WEBHOOK'], json=data, timeout=10)


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
      serviceAccountName: webhook-handler
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
            - name: GITHUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: github-token-secret
                  key: token
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: webhook-handler
  namespace: automation
spec:
  selector:
    app: webhook-handler
  ports:
    - port: 8080
      targetPort: 8080
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: webhook-handler
  namespace: automation
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: webhook-handler
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list"]
  - apiGroups: ["apps"]
    resources: ["deployments", "deployments/scale"]
    verbs: ["get", "patch", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: webhook-handler
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: webhook-handler
subjects:
  - kind: ServiceAccount
    name: webhook-handler
    namespace: automation
```

## GitHub Actions Integration via Webhook

```yaml
# Send alerts to the webhook handler, which triggers GitHub repository_dispatch
apiVersion: monitoring.coreos.com/v1beta1
kind: AlertmanagerConfig
metadata:
  name: github-actions-trigger
  namespace: cattle-monitoring-system
spec:
  route:
    receiver: github-trigger
    matchers:
      - name: severity
        value: critical
  receivers:
    - name: github-trigger
      webhookConfigs:
        - url: "http://webhook-handler.automation:8080/github/repository-dispatch"
          sendResolved: false
          maxAlerts: 1
```

## Conclusion

Rancher Monitoring webhooks bridge the gap between cluster events and automated remediation workflows. By combining Alertmanager webhook receivers with a custom webhook handler, you can build sophisticated auto-remediation pipelines: capturing crash-looping pod logs for triage, scaling services under load, creating incident tickets, and notifying on-call engineers. Keep webhook handlers simple, idempotent, and well-tested. Always implement circuit breakers to prevent automated responses from making situations worse during cascading failures.
