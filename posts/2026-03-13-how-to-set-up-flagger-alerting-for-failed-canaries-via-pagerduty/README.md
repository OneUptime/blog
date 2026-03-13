# How to Set Up Flagger Alerting for Failed Canaries via PagerDuty

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, PagerDuty, Alerting, Kubernetes, Incident Management

Description: Learn how to configure Flagger to trigger PagerDuty incidents when canary deployments fail for immediate incident response.

---

## Introduction

When a canary deployment fails in production, your on-call team needs to know immediately. PagerDuty is a widely used incident management platform that ensures the right people are notified through the right channels at the right time. Flagger supports PagerDuty as an alert provider, enabling automatic incident creation when canary deployments fail or encounter critical issues.

This guide covers setting up Flagger alerting with PagerDuty, from creating a PagerDuty integration key to configuring Flagger's AlertProvider and routing alerts based on severity levels.

## Prerequisites

Before you begin, ensure you have:

- Flagger installed in your Kubernetes cluster.
- A PagerDuty account with permissions to create services and integrations.
- `kubectl` installed and configured.

## Creating a PagerDuty Integration

In PagerDuty, create a new service or use an existing one for canary deployment alerts. Add an Events API v2 integration to the service. This will generate an Integration Key (also called a Routing Key) that Flagger uses to send alerts.

Navigate to Services in PagerDuty, select or create a service, go to the Integrations tab, and add an Events API v2 integration. Copy the Integration Key for use in the next step.

## Storing the PagerDuty Integration Key

Store the PagerDuty integration key as a Kubernetes Secret.

```yaml
# pagerduty-secret.yaml
# Kubernetes Secret containing the PagerDuty integration key
apiVersion: v1
kind: Secret
metadata:
  name: pagerduty-integration-key
  namespace: flagger-system
type: Opaque
stringData:
  address: YOUR_PAGERDUTY_INTEGRATION_KEY
```

Apply the Secret.

```bash
kubectl apply -f pagerduty-secret.yaml
```

## Creating the AlertProvider Resource

Create a Flagger AlertProvider resource configured for PagerDuty.

```yaml
# alert-provider-pagerduty.yaml
# Flagger AlertProvider for PagerDuty
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: pagerduty
  namespace: flagger-system
spec:
  type: pagerduty
  secretRef:
    name: pagerduty-integration-key
```

Apply the AlertProvider.

```bash
kubectl apply -f alert-provider-pagerduty.yaml
```

## Configuring Canary Resources for PagerDuty Alerts

Add the PagerDuty alert provider to your Canary resources. You typically want PagerDuty alerts only for critical failures, not for informational events.

```yaml
# canary.yaml
# Canary resource with PagerDuty alerting for failures
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
      - name: pagerduty-critical
        severity: error
        providerRef:
          name: pagerduty
          namespace: flagger-system
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
# multi-provider-canary.yaml
# Canary with both PagerDuty and Slack alerting
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
      - name: pagerduty-on-failure
        severity: error
        providerRef:
          name: pagerduty
          namespace: flagger-system
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

This configuration sends informational and warning events to Slack while triggering a PagerDuty incident only when a canary fails.

## Setting Up Multiple PagerDuty Services

For organizations with different PagerDuty services for different applications or environments, create multiple AlertProviders with different integration keys.

```yaml
# pagerduty-production.yaml
# AlertProvider for production services
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: pagerduty-production
  namespace: flagger-system
spec:
  type: pagerduty
  secretRef:
    name: pagerduty-production-key
---
# pagerduty-staging.yaml
# AlertProvider for staging services
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: pagerduty-staging
  namespace: flagger-system
spec:
  type: pagerduty
  secretRef:
    name: pagerduty-staging-key
```

Reference the appropriate provider in each Canary resource based on the environment.

## Testing PagerDuty Integration

To test the integration, you can deliberately trigger a canary failure by deploying a version that produces errors.

```bash
# Deploy a version that will generate errors
kubectl set image deployment/podinfo \
  podinfo=stefanprodan/podinfo:6.2.0 -n test

# Watch the canary status
kubectl get canary podinfo -n test -w

# Check Flagger logs for alert delivery
kubectl logs -l app.kubernetes.io/name=flagger \
  -n flagger-system --tail=50 | grep -i alert
```

When the canary fails, Flagger will create a PagerDuty incident with details about the failure, including the canary name, namespace, and the reason for the rollback.

## Managing PagerDuty Incident Resolution

Flagger does not automatically resolve PagerDuty incidents when a subsequent deployment succeeds. You may want to configure PagerDuty auto-resolution settings on the service, or set up a webhook that resolves incidents on successful deployments.

```yaml
# webhook for custom incident resolution
  analysis:
    webhooks:
      - name: resolve-incident
        type: promote
        url: http://incident-resolver.default/resolve
```

## Conclusion

Setting up Flagger alerting via PagerDuty ensures that your on-call team is immediately notified when canary deployments fail. By configuring severity-based routing, you can send critical failures to PagerDuty while keeping informational notifications in Slack. This tiered alerting approach prevents alert fatigue while ensuring that genuine failures trigger the appropriate incident response workflow. The integration is straightforward to set up and provides the reliability your team needs for production canary deployments.
