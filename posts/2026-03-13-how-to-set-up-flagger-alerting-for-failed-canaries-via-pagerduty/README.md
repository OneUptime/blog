# How to Set Up Flagger Alerting for Failed Canaries via PagerDuty

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, PagerDuty, Alerting, Kubernetes, Incident Management

Description: Learn how to configure Flagger to trigger PagerDuty incidents when canary deployments fail for immediate incident response.

---

## Introduction

When a canary deployment fails in production, your on-call team needs to know immediately. PagerDuty is a widely used incident management platform that ensures the right people are notified through the right channels at the right time. Flagger does not send PagerDuty notifications directly as a native AlertProvider, but it exposes canary status metrics that Prometheus Alertmanager can route to PagerDuty.

This guide covers setting up Flagger failed canary alerting with PagerDuty, from creating a PagerDuty integration key to configuring Alertmanager and routing alerts based on severity levels.

## Prerequisites

Before you begin, ensure you have:

- Flagger installed in your Kubernetes cluster.
- Prometheus scraping Flagger metrics.
- Alertmanager installed and configured to receive Prometheus alerts.
- A PagerDuty account with permissions to create services and integrations.
- `kubectl` installed and configured.

## Creating a PagerDuty Integration

In PagerDuty, create a new service or use an existing one for canary deployment alerts. Add an Events API v2 integration to the service. This will generate an Integration Key (also called a Routing Key) that Alertmanager uses to send alerts.

Navigate to Services in PagerDuty, select or create a service, go to the Integrations tab, and add an Events API v2 integration. Copy the Integration Key for use in the next step.

## Storing the PagerDuty Integration Key

Store the PagerDuty integration key in your Alertmanager configuration. The exact Kubernetes Secret name and reload process depends on how you installed Alertmanager, but the receiver configuration should use `routing_key` for an Events API v2 integration.

```yaml
# alertmanager.yaml
route:
  receiver: default
  routes:
    - matchers:
        - alertname="FlaggerCanaryFailed"
      receiver: pagerduty-canary

receivers:
  - name: default
  - name: pagerduty-canary
    pagerduty_configs:
      - routing_key: YOUR_PAGERDUTY_INTEGRATION_KEY
        severity: critical
        description: '{{ .CommonAnnotations.summary }}'
```

Apply the updated Alertmanager configuration using the method required by your Prometheus or Alertmanager installation.

## Creating the Alert Rule

Create a Prometheus alert rule for failed Flagger canaries. If you use Prometheus Operator, create a `PrometheusRule` resource.

```yaml
# flagger-canary-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flagger-canary-alerts
  namespace: monitoring
spec:
  groups:
    - name: flagger.canary
      rules:
        - alert: FlaggerCanaryFailed
          expr: flagger_canary_status > 1
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Canary failed"
            description: "Workload {{ $labels.name }} in namespace {{ $labels.namespace }} failed canary analysis."
```

Apply the alert rule.

```bash
kubectl apply -f flagger-canary-alerts.yaml
```

## Configuring Canary Resources for PagerDuty Alerts

Configure your Canary resources with the metrics that determine whether a rollout should continue or fail. PagerDuty alerting is handled by Prometheus and Alertmanager when Flagger marks the canary as failed.

```yaml
# canary.yaml
# Canary resource with metrics that can trigger a failed canary alert
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
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
  service:
    port: 80
    targetPort: 9898
```

Apply the Canary resource.

```bash
kubectl apply -f canary.yaml
```

## Combining PagerDuty with Slack Alerts

A common pattern is to use PagerDuty for critical failure alerts and Slack for informational notifications. This ensures your on-call team is paged for failures while routine deployment updates go to a Slack channel.

```yaml
# slack-alert-provider.yaml
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
---
# multi-provider-canary.yaml
# Canary with Slack notifications; PagerDuty is handled by Alertmanager
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
      - name: slack-on-progress
        severity: info
        providerRef:
          name: slack
          namespace: flagger-system
      - name: slack-on-warning
        severity: warn
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

This configuration sends informational and warning events to Slack while Alertmanager triggers a PagerDuty incident when a canary failure alert fires.

## Setting Up Multiple PagerDuty Services

For organizations with different PagerDuty services for different applications or environments, create multiple Alertmanager receivers with different integration keys and route alerts by labels such as namespace, application, or environment.

```yaml
# alertmanager.yaml
route:
  receiver: default
  routes:
    - matchers:
        - alertname="FlaggerCanaryFailed"
        - namespace="production"
      receiver: pagerduty-production
    - matchers:
        - alertname="FlaggerCanaryFailed"
        - namespace="staging"
      receiver: pagerduty-staging

receivers:
  - name: default
  - name: pagerduty-production
    pagerduty_configs:
      - routing_key: PAGERDUTY_PRODUCTION_INTEGRATION_KEY
        severity: critical
  - name: pagerduty-staging
    pagerduty_configs:
      - routing_key: PAGERDUTY_STAGING_INTEGRATION_KEY
        severity: warning
```

Reference the appropriate labels in each alert route based on the environment.

## Testing PagerDuty Integration

To test the integration, deliberately trigger a canary failure by generating HTTP 500 responses during a rollout.

```bash
# Trigger a new rollout
kubectl set image deployment/podinfo \
  podinfod=stefanprodan/podinfo:6.2.0 -n test

# Generate HTTP 500 errors from inside the cluster
kubectl -n test exec deploy/flagger-loadtester -- \
  sh -c 'watch curl -s http://podinfo-canary.test:9898/status/500'

# Watch the canary status
kubectl get canary podinfo -n test -w
```

When the canary fails, Flagger updates the canary status metric, Prometheus fires the `FlaggerCanaryFailed` alert, and Alertmanager creates a PagerDuty incident with details from the alert labels and annotations.

## Managing PagerDuty Incident Resolution

Alertmanager sends resolved notifications to PagerDuty by default for PagerDuty receivers. If you do not want PagerDuty incidents to resolve automatically when the Prometheus alert clears, set `send_resolved: false` on the `pagerduty_configs` entry.

```yaml
# PagerDuty receiver with automatic resolved notifications disabled
receivers:
  - name: pagerduty-canary
    pagerduty_configs:
      - routing_key: YOUR_PAGERDUTY_INTEGRATION_KEY
        send_resolved: false
```

## Conclusion

Setting up Flagger alerting via PagerDuty ensures that your on-call team is immediately notified when canary deployments fail. By configuring Prometheus and Alertmanager routing, you can send critical failures to PagerDuty while keeping informational notifications in Slack. This tiered alerting approach prevents alert fatigue while ensuring that genuine failures trigger the appropriate incident response workflow. The integration is straightforward to set up and provides the reliability your team needs for production canary deployments.
