# How to Use Rancher Webhooks for Automation - For

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Webhook, Automation, Integration, Kubernetes, Event

Description: Use Rancher webhooks and Kubernetes admission webhooks to automate responses to cluster events, enforce policies, trigger external systems, and build event-driven automation workflows.

## Introduction

In Rancher-managed environments, you'll commonly use Kubernetes admission webhooks and webhook integrations around tools such as Fleet and Alertmanager. Admission webhooks intercept API requests for validation or mutation, while Git/provider and alerting webhooks trigger external systems in response to repository or cluster events. Both patterns enable automation that responds to cluster state changes without polling.

## Part 1: Kubernetes Admission Webhooks

### Validating Webhook: Enforce Naming Conventions

```yaml
# Deployment and Service for a webhook that validates deployment names

apiVersion: apps/v1
kind: Deployment
metadata:
  name: naming-validator
  namespace: webhook-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: naming-validator
  template:
    metadata:
      labels:
        app: naming-validator
    spec:
      containers:
        - name: validator
          image: myregistry/webhook-validator:1.0.0
          ports:
            - containerPort: 8443
          volumeMounts:
            - name: tls-certs
              mountPath: /tls
      volumes:
        - name: tls-certs
          secret:
            secretName: webhook-tls
---
apiVersion: v1
kind: Service
metadata:
  name: naming-validator
  namespace: webhook-system
spec:
  selector:
    app: naming-validator
  ports:
    - port: 443
      targetPort: 8443
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: naming-convention-validator
  annotations:
    cert-manager.io/inject-ca-from: webhook-system/webhook-cert
webhooks:
  - name: validate.naming.company.com
    admissionReviewVersions: ["v1"]
    sideEffects: None
    matchPolicy: Equivalent
    rules:
      - apiGroups: ["apps"]
        apiVersions: ["v1"]
        resources: ["deployments"]
        operations: ["CREATE", "UPDATE"]
        scope: "Namespaced"
    clientConfig:
      service:
        name: naming-validator
        namespace: webhook-system
        path: /validate
        port: 443
    failurePolicy: Fail
    namespaceSelector:
      matchLabels:
        enforce-naming: "true"
```

Webhook handler (Python):
```python
from flask import Flask, request, jsonify
import re

app = Flask(__name__)

@app.route('/validate', methods=['POST'])
def validate():
    review = request.json
    deployment = review['request']['object']
    uid = review['request']['uid']
    name = deployment['metadata']['name']

    # Enforce pattern: {team}-{app}-{env}
    if not re.match(r'^[a-z]+-[a-z]+-(?:prod|staging|dev)$', name):
        return jsonify({
            'apiVersion': 'admission.k8s.io/v1',
            'kind': 'AdmissionReview',
            'response': {
                'uid': uid,
                'allowed': False,
                'status': {
                    'code': 403,
                    'message': f'Deployment name "{name}" must match pattern: team-app-env'
                }
            }
        })

    return jsonify({
        'apiVersion': 'admission.k8s.io/v1',
        'kind': 'AdmissionReview',
        'response': {
            'uid': uid,
            'allowed': True
        }
    })
```

### Mutating Webhook: Auto-Inject Labels

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: label-injector
webhooks:
  - name: inject.labels.company.com
    admissionReviewVersions: ["v1"]
    sideEffects: None
    matchPolicy: Equivalent
    rules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["pods"]
        operations: ["CREATE"]
        scope: "Namespaced"
    clientConfig:
      service:
        name: label-injector
        namespace: webhook-system
        path: /mutate
        port: 443
    failurePolicy: Ignore    # Don't block pods if webhook fails
```

## Part 2: Event-Driven External Webhooks

### Step 2: Alertmanager Webhook Receiver

```yaml
# alertmanager.yaml - Send alerts to custom webhook
receivers:
  - name: rancher-ops-webhook
    webhook_configs:
      - url: "https://ops-automation.company.com/rancher-alert"
        send_resolved: true
        http_config:
          authorization:
            type: Bearer
            credentials_file: /etc/alertmanager/webhook-token
```

### Step 3: Build an Event Router

```yaml
# Replace the default kubernetes-event-exporter ConfigMap with a webhook receiver
apiVersion: v1
kind: ConfigMap
metadata:
  name: event-exporter-cfg
  namespace: monitoring
data:
  config.yaml: |
    logLevel: warn
    logFormat: json
    route:
      routes:
        - match:
            - receiver: "ops-webhook"
    receivers:
      - name: "ops-webhook"
        webhook:
          endpoint: "https://ops-automation.company.com/k8s-events"
          headers:
            Authorization: "Bearer ${WEBHOOK_TOKEN}"
          layout:
            type: "{{ .Type }}"
            reason: "{{ .Reason }}"
            message: "{{ .Message }}"
            involvedObject:
              namespace: "{{ .Namespace }}"
              kind: "{{ .InvolvedObject.Kind }}"
              name: "{{ .InvolvedObject.Name }}"
```

### Step 4: Fleet GitRepo Webhook Trigger

```bash
# Expose Fleet's gitjob service so your Git provider can notify Fleet on push
kubectl create ingress fleet-gitjob-webhook \
  -n cattle-fleet-system \
  --class=nginx \
  --rule="fleet-webhook.company.com/*=gitjob:80"

# Optional: validate GitHub webhook signatures
kubectl create secret generic gitjob-webhook \
  -n cattle-fleet-system \
  --from-literal=github=<webhook-secret>

# In GitHub repository settings:
# Payload URL: https://fleet-webhook.company.com/
# Content type: application/json
# Secret: <webhook-secret>
# Events: Push
```

### Step 5: Custom Event Handler Service

```python
# webhook_handler.py - Process Rancher/K8s events for automation

import os
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)
SLACK_WEBHOOK_URL = os.environ["SLACK_WEBHOOK_URL"]

@app.route('/k8s-events', methods=['POST'])
def handle_event():
    event = request.json
    event_type = event.get('type')
    reason = event.get('reason')
    namespace = event.get('involvedObject', {}).get('namespace')
    message = event.get('message', '')

    # Auto-scale response to resource pressure
    if reason == 'FailedScheduling' and 'Insufficient' in message:
        notify_ops_channel(
            f":warning: Pod scheduling failed in {namespace}: {message}\n"
            f"Consider scaling cluster or reducing resource requests."
        )

    # Alert on image pull failures
    if reason in ['Failed', 'BackOff'] and event_type == 'Warning':
        if 'pull image' in message.lower() or 'ImagePullBackOff' in message:
            notify_ops_channel(
                f":x: Image pull failure in {namespace}: {message}"
            )

    return jsonify({'status': 'processed'})

def notify_ops_channel(message: str):
    response = requests.post(SLACK_WEBHOOK_URL, json={'text': message}, timeout=10)
    response.raise_for_status()
```

## Conclusion

Rancher-managed environments support both policy enforcement and event-driven automation. Validating admission webhooks block non-compliant deployments at the API level, while mutating webhooks auto-inject labels, sidecars, and annotations. For external integration, route Kubernetes events through an event exporter to trigger Slack notifications, PagerDuty incidents, or custom automation scripts. Combine that with Alertmanager webhook receivers and Fleet Git webhooks for complete observability-driven automation.
