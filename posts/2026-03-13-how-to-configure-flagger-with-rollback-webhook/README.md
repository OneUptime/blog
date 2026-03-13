# How to Configure Flagger with rollback Webhook

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flagger, canary, webhook, rollback, kubernetes, progressive delivery, notifications

Description: Learn how to configure rollback webhooks in Flagger to receive notifications and trigger automated actions when a canary deployment is rolled back.

---

## Introduction

When Flagger determines that a canary deployment is unhealthy and rolls it back, you need to know about it. The `rollback` webhook fires when Flagger reverts a canary to the previous version after the failure threshold has been exceeded. This webhook gives you a hook to send alerts, update incident management systems, trigger diagnostic data collection, or run cleanup procedures.

The rollback webhook fires once when the rollback decision is made. Like the post-rollout webhook, a failure in the rollback webhook does not change the rollback behavior. The rollback proceeds regardless of the webhook response. This means the webhook is best used for observability and notification rather than for actions that must succeed.

This guide covers how to configure rollback webhooks, practical notification patterns, and how to use them for automated incident response.

## Prerequisites

- A running Kubernetes cluster with Flagger installed
- A Canary resource targeting a Deployment
- kubectl access to your cluster
- A notification service or webhook receiver endpoint

## When the rollback Webhook Fires

Flagger tracks consecutive metric check failures during canary analysis. When the failure count exceeds the configured `threshold`, Flagger:

1. Stops sending traffic to the canary
2. Scales down the canary workload
3. Fires all `rollback` webhooks
4. Sets the canary status to `Failed`

The rollback webhook fires after the traffic has been reverted but as part of the rollback process. It does not fire during normal operation or during successful deployments.

## Configuring a rollback Webhook

Add a webhook with `type: rollback` to the analysis section:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    webhooks:
      - name: on-rollback
        type: rollback
        url: http://my-notifier.default.svc.cluster.local/rollback
        timeout: 30s
```

The POST body sent by Flagger includes the canary metadata with the phase set to `Failed`:

```json
{
  "name": "my-app",
  "namespace": "default",
  "phase": "Failed",
  "metadata": {}
}
```

## Sending Rollback Alerts to Slack

Alerting your team immediately when a rollback happens is one of the most common uses:

```yaml
    webhooks:
      - name: rollback-slack-alert
        type: rollback
        url: http://flagger-loadtester.test/
        timeout: 30s
        metadata:
          type: bash
          cmd: |
            curl -sf -X POST \
              -H 'Content-Type: application/json' \
              -d '{"text":":warning: Canary rollback: my-app in default namespace has been rolled back due to metric failures"}' \
              $SLACK_WEBHOOK_URL
```

## Triggering Incident Management

You can use the rollback webhook to create incidents in systems like PagerDuty or Opsgenie:

```yaml
    webhooks:
      - name: create-incident
        type: rollback
        url: http://incident-manager.default.svc.cluster.local/incident
        timeout: 30s
        metadata:
          service: my-app
          severity: high
          description: "Canary deployment rolled back due to metric threshold breach"
```

Your incident manager service receives the metadata and can create an incident with the appropriate severity and routing.

## Collecting Diagnostic Data on Rollback

When a rollback occurs, you often want to capture diagnostic information about the failed canary:

```yaml
    webhooks:
      - name: collect-diagnostics
        type: rollback
        url: http://flagger-loadtester.test/
        timeout: 120s
        metadata:
          type: bash
          cmd: |
            kubectl logs deploy/my-app-canary -n default --tail=100 > /tmp/canary-logs.txt && \
            kubectl describe deploy/my-app-canary -n default > /tmp/canary-describe.txt && \
            curl -sf -X POST -F 'file=@/tmp/canary-logs.txt' \
              http://log-collector.default:8080/upload
```

This captures the last 100 lines of canary logs and the deployment description, then uploads them to a log collector service for later analysis.

## Multiple rollback Webhooks

You can define multiple rollback webhooks that fire in sequence:

```yaml
    webhooks:
      - name: alert-oncall
        type: rollback
        url: http://pagerduty-proxy.default/alert
        timeout: 15s
        metadata:
          service: my-app
          severity: critical
      - name: notify-slack
        type: rollback
        url: http://slack-proxy.default/post
        timeout: 15s
        metadata:
          channel: "#incidents"
          message: "my-app canary rolled back"
      - name: collect-logs
        type: rollback
        url: http://flagger-loadtester.test/
        timeout: 60s
        metadata:
          type: bash
          cmd: "kubectl logs deploy/my-app-canary -n default --tail=200"
```

Each webhook is attempted regardless of whether previous ones succeeded.

## Combining rollback with post-rollout

Use both webhook types to get notified for both outcomes of a canary deployment:

```yaml
    webhooks:
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default:80/"
      - name: on-success
        type: post-rollout
        url: http://my-notifier.default/success
        timeout: 15s
        metadata:
          message: "Canary promoted successfully"
      - name: on-failure
        type: rollback
        url: http://my-notifier.default/failure
        timeout: 15s
        metadata:
          message: "Canary rolled back"
```

This provides complete deployment lifecycle notifications: you know whether the deployment succeeded or failed.

## Using Metadata for Context

Pass detailed metadata so your notification system has enough context to act on:

```yaml
    webhooks:
      - name: rollback-notification
        type: rollback
        url: http://deploy-tracker.default/rollback
        timeout: 30s
        metadata:
          service: my-app
          environment: production
          team: backend
          runbook: "https://wiki.internal/runbooks/my-app-rollback"
          escalation: oncall-backend
```

Your deploy tracker can use this metadata to route notifications to the right team, link to the relevant runbook, and set up the correct escalation path.

## Conclusion

The `rollback` webhook in Flagger fires when a canary deployment fails and is reverted. It is the complement to `post-rollout`, covering the failure case. Use rollback webhooks for alerting on-call teams, creating incidents, collecting diagnostic data, and updating deployment tracking systems. Since the webhook fires after the rollback decision is made, its success or failure does not affect the rollback itself, making it safe to use for best-effort notifications and data collection.
