# How to Set Up Flagger Alerting for Failed Canaries via Slack

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Slack, Alerting, Kubernetes, Canary Deployments

Description: Learn how to configure Flagger to send Slack notifications when canary deployments fail, succeed, or require attention.

---

## Introduction

Getting timely notifications about canary deployment status is critical for maintaining awareness of your release pipeline. Flagger supports native alerting through various providers, including Slack. When a canary fails, succeeds, or encounters issues, Flagger can send detailed notifications to a Slack channel, enabling your team to respond quickly.

This guide walks you through setting up Flagger alerting with Slack, from creating a Slack webhook to configuring Flagger's AlertProvider resource and customizing notification behavior.

## Prerequisites

Before you begin, ensure you have:

- Flagger installed in your Kubernetes cluster.
- A Slack workspace with permissions to create incoming webhooks.
- `kubectl` installed and configured.
- Helm 3 installed (if upgrading Flagger).

## Creating a Slack Incoming Webhook

First, create an incoming webhook in your Slack workspace. Navigate to your Slack App settings, create a new app (or use an existing one), and enable Incoming Webhooks. Create a new webhook URL for the channel where you want to receive alerts.

The webhook URL will look similar to `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`.

## Storing the Webhook URL as a Kubernetes Secret

Store the Slack webhook URL in a Kubernetes Secret to keep it secure.

```yaml
# slack-webhook-secret.yaml
# Kubernetes Secret containing the Slack webhook URL
apiVersion: v1
kind: Secret
metadata:
  name: slack-webhook-url
  namespace: flagger-system
type: Opaque
stringData:
  address: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

Apply the Secret.

```bash
kubectl apply -f slack-webhook-secret.yaml
```

## Creating the AlertProvider Resource

Flagger uses the AlertProvider custom resource to define alert destinations. Create an AlertProvider that references your Slack webhook Secret.

```yaml
# alert-provider.yaml
# Flagger AlertProvider for Slack notifications
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: slack
  namespace: flagger-system
spec:
  type: slack
  channel: deployments
  username: flagger
  secretRef:
    name: slack-webhook-url
```

Apply the AlertProvider.

```bash
kubectl apply -f alert-provider.yaml
```

## Configuring Canary Resources to Use the AlertProvider

Add an alert reference to your Canary resources to enable Slack notifications for that specific canary.

```yaml
# canary.yaml
# Canary resource with Slack alerting configured
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: test
spec:
  provider: istio
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  progressDeadlineSeconds: 60
  analysis:
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    alerts:
      - name: slack-alert
        severity: info
        providerRef:
          name: slack
          namespace: flagger-system
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
  service:
    port: 80
    targetPort: 9898
```

## Configuring Alert Severity Levels

Flagger supports three severity levels for alerts: info, warn, and error. You can create multiple AlertProviders for different severity levels and route them to different Slack channels.

```yaml
# alert-provider-critical.yaml
# AlertProvider for critical alerts in a separate channel
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: slack-critical
  namespace: flagger-system
spec:
  type: slack
  channel: critical-alerts
  username: flagger
  secretRef:
    name: slack-webhook-url
---
# alert-provider-info.yaml
# AlertProvider for informational alerts
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: slack-info
  namespace: flagger-system
spec:
  type: slack
  channel: deployments
  username: flagger
  secretRef:
    name: slack-webhook-url
```

Reference multiple alert providers in your Canary resource.

```yaml
  analysis:
    alerts:
      - name: critical-alerts
        severity: error
        providerRef:
          name: slack-critical
          namespace: flagger-system
      - name: info-alerts
        severity: info
        providerRef:
          name: slack-info
          namespace: flagger-system
```

## Setting Up Global Alerts with Flagger Helm Values

Instead of configuring alerts per Canary resource, you can set up global alerting at the Flagger level using Helm values.

```yaml
# flagger-values.yaml
# Flagger Helm values with global Slack alerting
meshProvider: istio
metricsServer: http://prometheus.monitoring:9090
slack:
  url: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
  channel: deployments
  user: flagger
```

Install or upgrade Flagger with these values.

```bash
helm upgrade -i flagger flagger/flagger \
  --namespace flagger-system \
  --values flagger-values.yaml
```

Global alerting sends notifications for all canary events without requiring individual Canary resource configuration.

## Testing the Slack Integration

Trigger a canary deployment to verify that Slack notifications are working.

```bash
# Trigger a canary deployment
kubectl set image deployment/podinfo \
  podinfo=stefanprodan/podinfo:6.2.0 -n test

# Watch the canary to confirm it progresses
kubectl get canary podinfo -n test -w
```

You should see messages in your Slack channel for canary initialization, weight advancement, and eventual promotion or rollback.

## Customizing Notification Messages

Flagger sends structured Slack messages that include the canary name, namespace, status, and a description of the event. The messages include color coding: green for successful events, yellow for warnings, and red for failures.

If you need more customized notifications, you can use Flagger webhooks to send data to a custom notification service that formats messages according to your needs.

```yaml
  analysis:
    webhooks:
      - name: custom-notification
        type: event
        url: http://notification-service.default/flagger
```

## Conclusion

Setting up Flagger alerting via Slack ensures your team stays informed about canary deployment status in real time. Whether you configure alerts per Canary resource or globally through Flagger's Helm values, Slack notifications provide visibility into the progressive delivery process. Combined with severity-based routing to different channels, you can build an alerting strategy that matches your team's workflow and escalation procedures.
