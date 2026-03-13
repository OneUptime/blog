# How to Configure Flagger with post-rollout Webhook

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flagger, canary, webhook, post-rollout, kubernetes, progressive delivery, notifications

Description: Learn how to configure post-rollout webhooks in Flagger to trigger notifications, cleanup tasks, or integration actions after a successful canary promotion.

---

## Introduction

Flagger's `post-rollout` webhook fires after a canary has been successfully promoted to production. At this point, the canary analysis has passed, traffic has been fully shifted to the new version, and the primary workload has been updated. The post-rollout webhook is your hook for running post-deployment actions like sending notifications, triggering downstream pipelines, updating external registries, or running cleanup tasks.

Unlike pre-rollout and rollout webhooks, a failed post-rollout webhook does not cause a rollback. The promotion has already happened, so Flagger logs the failure but does not take corrective action. This means post-rollout webhooks are best suited for non-critical actions where failure is acceptable.

This guide explains how to configure post-rollout webhooks, common patterns, and how they fit into the broader Flagger webhook lifecycle.

## Prerequisites

- A running Kubernetes cluster with Flagger installed
- A Canary resource targeting a Deployment
- kubectl access to your cluster
- A webhook receiver service or notification endpoint

## How post-rollout Fits in the Lifecycle

Flagger processes webhooks in a specific order during a canary deployment:

1. `confirm-rollout` - Gate before analysis starts
2. `pre-rollout` - Checks before traffic shifting
3. `rollout` - Called during each analysis step
4. `confirm-promotion` - Gate before promotion
5. `post-rollout` - Called after successful promotion

The post-rollout webhook is the final step. It fires once after promotion completes. If the canary is rolled back instead of promoted, the post-rollout webhook does not fire (use the `rollback` webhook type for rollback notifications).

## Configuring a post-rollout Webhook

Add a webhook with `type: post-rollout` to the analysis section:

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
      - name: notify-promotion
        type: post-rollout
        url: http://my-notifier.default.svc.cluster.local/notify
        timeout: 30s
        metadata:
          message: "Canary promotion completed successfully"
```

After a successful promotion, Flagger sends an HTTP POST to the URL with the canary metadata:

```json
{
  "name": "my-app",
  "namespace": "default",
  "phase": "Succeeded",
  "metadata": {
    "message": "Canary promotion completed successfully"
  }
}
```

## Sending Slack Notifications

A common use case is notifying a Slack channel after a successful deployment. If you have a Slack webhook URL, you can create a simple proxy service, or use the load tester to execute a curl command:

```yaml
    webhooks:
      - name: slack-notification
        type: post-rollout
        url: http://flagger-loadtester.test/
        timeout: 30s
        metadata:
          type: bash
          cmd: |
            curl -sf -X POST \
              -H 'Content-Type: application/json' \
              -d '{"text":"my-app canary promoted successfully in default namespace"}' \
              $SLACK_WEBHOOK_URL
```

For this to work, the `SLACK_WEBHOOK_URL` environment variable must be set in the load tester pod. Alternatively, hardcode the URL in the command (though this is less secure).

## Triggering Downstream Pipelines

Post-rollout webhooks can trigger CI/CD pipelines for downstream services or integration tests:

```yaml
    webhooks:
      - name: trigger-integration-tests
        type: post-rollout
        url: http://ci-trigger.default.svc.cluster.local/trigger
        timeout: 60s
        metadata:
          pipeline: integration-tests
          service: my-app
          environment: production
```

Your CI trigger service receives the metadata and can start the appropriate pipeline.

## Running Cleanup Tasks

After a successful promotion, you might need to clean up temporary resources:

```yaml
    webhooks:
      - name: cleanup
        type: post-rollout
        url: http://flagger-loadtester.test/
        timeout: 60s
        metadata:
          type: bash
          cmd: |
            kubectl delete configmap my-app-canary-config \
              --namespace default --ignore-not-found
```

## Multiple post-rollout Webhooks

You can define multiple post-rollout webhooks. Flagger executes them in order:

```yaml
    webhooks:
      - name: update-registry
        type: post-rollout
        url: http://service-registry.default/update
        timeout: 30s
        metadata:
          service: my-app
          status: promoted
      - name: notify-team
        type: post-rollout
        url: http://my-notifier.default/slack
        timeout: 15s
        metadata:
          channel: "#deployments"
      - name: run-post-deploy-tests
        type: post-rollout
        url: http://flagger-loadtester.test/
        timeout: 120s
        metadata:
          type: bash
          cmd: "curl -sf http://my-app.default:80/api/v1/self-test"
```

If one webhook fails, Flagger still attempts the remaining webhooks. Failures are logged but do not affect the deployment outcome.

## Complete Canary with Post-rollout Example

Here is a full Canary resource that uses post-rollout alongside other webhook types:

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
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
    webhooks:
      - name: smoke-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 60s
        metadata:
          type: bash
          cmd: "curl -sf http://my-app-canary.default:80/healthz"
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default:80/"
      - name: post-deploy-notify
        type: post-rollout
        url: http://my-notifier.default/notify
        timeout: 30s
        metadata:
          message: "Deployment completed"
```

## Conclusion

The `post-rollout` webhook in Flagger runs after a successful canary promotion, making it the right place for notifications, downstream pipeline triggers, and cleanup tasks. Because failures do not cause rollbacks (the promotion has already happened), post-rollout webhooks should be used for non-critical post-deployment actions. For actions that must succeed, consider running them as part of a separate pipeline triggered by the post-rollout webhook rather than relying on the webhook itself.
