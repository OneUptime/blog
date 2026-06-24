# How to Configure Flagger with rollback Webhook

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Canary, Webhook, Rollback, Kubernetes, Progressive Delivery, Notification

Description: Learn how to configure rollback webhooks in Flagger to receive notifications and trigger automated actions when a canary deployment is rolled back.

---

## Introduction

When a canary deployment is in progress, you may need a way for an external system or an operator to stop it and roll traffic back to the primary version. The `rollback` webhook is Flagger's hook for that case. Flagger calls rollback webhooks while the canary is in `Progressing` or `Waiting` status, and a successful HTTP response tells Flagger to stop the analysis, shift traffic back to the primary instance, and mark the canary release as failed.

This is different from a post-rollback notification. If you want a best-effort notification after Flagger has promoted or rolled back a canary, use `post-rollout`, `event` webhooks, or Flagger alerts. The `rollback` webhook is best used as a rollback decision point rather than as a notification hook.

This guide covers how to configure rollback webhooks, practical rollback trigger patterns, and how to use them with external incident response systems.

## Prerequisites

- A running Kubernetes cluster with Flagger installed
- A Canary resource targeting a Deployment
- kubectl access to your cluster
- A webhook receiver endpoint that returns HTTP 2xx when rollback should be triggered

## When the rollback Webhook Fires

Flagger tracks consecutive metric check failures during canary analysis. When the failure count reaches the configured `threshold`, Flagger automatically rolls back the canary.

The `rollback` webhook is checked during analysis or while waiting on manual confirmation. When a rollback webhook returns a successful HTTP status code, Flagger:

1. Stops the analysis
2. Shifts traffic back to the primary instance
3. Scales down the canary workload
4. Sets the canary status to `Failed`

The rollback webhook does not fire after an automatic metric-threshold rollback as a notification callback. For that use case, configure `post-rollout`, `event` webhooks, or alert providers.

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
        url: http://my-rollback-gate.default.svc.cluster.local/rollback/check
        timeout: 30s
```

The POST body sent by Flagger includes the canary metadata with the current phase and a checksum:

```json
{
  "name": "my-app",
  "namespace": "default",
  "phase": "Progressing",
  "checksum": "85d557f47b",
  "metadata": {}
}
```

## Triggering Rollback from Slack

A common pattern is to route the rollback check through a small service that an on-call engineer can control from Slack or another chat tool. The receiver should return HTTP 2xx only when rollback has been approved:

```yaml
    webhooks:
      - name: rollback-slack-gate
        type: rollback
        url: http://rollback-gate.default.svc.cluster.local/slack/check
        timeout: 30s
        metadata:
          channel: "#incidents"
          service: my-app
```

## Triggering Incident Management

You can use the rollback webhook with systems like PagerDuty or Opsgenie by having a receiver check whether an active incident requires the rollout to be stopped:

```yaml
    webhooks:
      - name: incident-rollback-check
        type: rollback
        url: http://incident-manager.default.svc.cluster.local/rollback/check
        timeout: 30s
        metadata:
          service: my-app
          severity: high
          description: "Rollback canary deployment if a high-severity incident is active"
```

Your incident manager service receives the metadata and can return HTTP 2xx when the canary should be rolled back, or a non-2xx response when the rollout should continue.

## Collecting Diagnostic Data on Rollback

If you want to capture diagnostics when an external system requests rollback, point the rollback hook at a receiver that collects the data and returns HTTP 2xx when it is ready to roll back:

```yaml
    webhooks:
      - name: collect-diagnostics
        type: rollback
        url: http://flagger-loadtester.test/
        timeout: 120s
        metadata:
          type: bash
          cmd: |
            curl -sf http://incident-manager.default.svc.cluster.local/rollback/requested?service=my-app && \
            kubectl logs deploy/my-app-canary -n default --tail=100 > /tmp/canary-logs.txt && \
            kubectl describe deploy/my-app-canary -n default > /tmp/canary-describe.txt && \
            curl -sf -X POST -F 'file=@/tmp/canary-logs.txt' \
              http://log-collector.default:8080/upload
```

This checks whether rollback has been requested, captures the last 100 lines of canary logs and the deployment description, then uploads them to a log collector service before Flagger rolls the canary back. If the rollback request check returns a non-2xx response, the command exits before collecting logs and Flagger continues the analysis. The load tester service account needs RBAC permissions to run `kubectl` commands.

## Multiple rollback Webhooks

You can define multiple rollback webhooks. Flagger checks them during the canary analysis or waiting phase:

```yaml
    webhooks:
      - name: incident-check
        type: rollback
        url: http://pagerduty-proxy.default/rollback/check
        timeout: 15s
        metadata:
          service: my-app
          severity: critical
      - name: slack-approval-check
        type: rollback
        url: http://slack-proxy.default/rollback/check
        timeout: 15s
        metadata:
          channel: "#incidents"
          message: "Approve rollback for my-app canary"
      - name: collect-logs
        type: rollback
        url: http://flagger-loadtester.test/
        timeout: 60s
        metadata:
          type: bash
          cmd: "curl -sf http://incident-manager.default.svc.cluster.local/rollback/requested?service=my-app && kubectl logs deploy/my-app-canary -n default --tail=200"
```

If any rollback webhook returns a successful HTTP status code, Flagger stops the analysis and fails the canary release.

## Combining rollback with post-rollout

Use `rollback` and `post-rollout` together when you need an external rollback trigger and a completion notification:

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
      - name: manual-rollback
        type: rollback
        url: http://my-rollback-gate.default/rollback/check
        timeout: 15s
        metadata:
          message: "Rollback requested"
      - name: on-completion
        type: post-rollout
        url: http://my-notifier.default/failure
        timeout: 15s
        metadata:
          message: "Canary completed with success or failure"
```

This lets an external gate request rollback while `post-rollout` handles completion notifications after either promotion or rollback.

## Using Metadata for Context

Pass detailed metadata so your notification system has enough context to act on:

```yaml
    webhooks:
      - name: rollback-notification
        type: rollback
        url: http://deploy-tracker.default/rollback/check
        timeout: 30s
        metadata:
          service: my-app
          environment: production
          team: backend
          runbook: "https://wiki.internal/runbooks/my-app-rollback"
          escalation: oncall-backend
```

Your deploy tracker can use this metadata to decide whether rollback is needed and to route any follow-up notifications to the right team.

## Conclusion

The `rollback` webhook in Flagger is a rollback trigger that is checked while a canary deployment is progressing or waiting for confirmation. It is not the complement to `post-rollout` and does not act as an after-the-fact failure notification. Use rollback webhooks when an external gate, incident system, or diagnostic service should be able to request rollback by returning HTTP 2xx. For best-effort notifications after a canary succeeds or fails, use `post-rollout`, `event` webhooks, or Flagger alerts.
