# How to Configure Flagger with confirm-promotion Webhook

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Canary, Webhook, Confirm-Promotion, Kubernetes, Progressive Delivery, Gates, Approval

Description: Learn how to configure a confirm-promotion webhook in Flagger to add a manual or automated approval gate before a canary is promoted to production.

---

## Introduction

Flagger's `confirm-promotion` webhook type acts as a gate before the final promotion of a canary to production. After all analysis steps have passed and the canary has reached maximum traffic weight, Flagger calls the confirm-promotion webhook. If the webhook returns a non-200 response, Flagger holds the canary at its current state and retries on the next analysis interval. Promotion does not happen until the webhook returns HTTP 200.

This gate is useful when you want human approval before a canary becomes the new production version, or when you need an external system to validate that promotion is safe. Unlike `confirm-rollout` (which gates the start of analysis), `confirm-promotion` gates the final step after all metrics have been validated.

This guide covers how to configure confirm-promotion webhooks, how to use the built-in load tester gate, and patterns for integrating with approval workflows.

## Prerequisites

- A running Kubernetes cluster with Flagger installed
- A Canary resource targeting a Deployment
- kubectl access to your cluster
- The Flagger load tester (for built-in gate functionality) or a custom webhook service

## How confirm-promotion Works

The confirm-promotion webhook fires at a specific point in the canary lifecycle:

1. Flagger detects a new revision and creates the canary workload
2. Canary analysis runs through all steps, shifting traffic incrementally
3. Once the canary reaches `maxWeight` and all metrics pass, Flagger is ready to promote
4. Before promoting, Flagger calls all `confirm-promotion` webhooks
5. If all return HTTP 200, Flagger promotes the canary (copies the canary spec to the primary)
6. If any return non-200, Flagger waits and retries on the next interval

During the wait, the canary continues receiving traffic at its current weight. Metric checks continue running. If metrics start failing while waiting for promotion approval, the canary can still be rolled back.

## Configuring a confirm-promotion Webhook

Add a webhook with `type: confirm-promotion` to the analysis section:

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
      - name: promotion-gate
        type: confirm-promotion
        url: http://my-approval-service.default.svc.cluster.local/approve
```

Flagger sends an HTTP POST with canary metadata when promotion is pending:

```json
{
  "name": "my-app",
  "namespace": "default",
  "phase": "Promoting",
  "metadata": {}
}
```

## Using the Load Tester Gate for Manual Approval

The Flagger load tester includes built-in gate endpoints that work well for manual promotion approval:

```yaml
    webhooks:
      - name: promotion-gate
        type: confirm-promotion
        url: http://flagger-loadtester.test/gate/approve
```

The gate starts closed. When Flagger reaches the promotion phase, the webhook returns non-200 and Flagger waits. To approve the promotion, open the gate:

```bash
kubectl -n test exec deploy/flagger-loadtester -- \
  curl -s -X POST http://localhost:8080/gate/open
```

Flagger calls the gate again on the next interval, receives HTTP 200, and promotes the canary. The gate automatically closes after the promotion completes, ready for the next deployment.

To deny promotion and keep waiting:

```bash
kubectl -n test exec deploy/flagger-loadtester -- \
  curl -s -X POST http://localhost:8080/gate/close
```

## Passing Metadata for Approval Context

Include metadata that helps the approver make a decision:

```yaml
    webhooks:
      - name: promotion-gate
        type: confirm-promotion
        url: http://my-approval-service.default/approve
        metadata:
          service: my-app
          environment: production
          change-ticket: "CHG-12345"
          approver-group: sre-team
```

Your approval service can use this metadata to display the relevant change ticket, notify the correct approver group, and track the approval decision.

## Integrating with ChatOps

A popular pattern is connecting the confirm-promotion gate to a ChatOps system. When Flagger is ready to promote, the webhook sends a message to Slack or Teams asking for approval. A team member responds, which triggers the approval service to return 200 on the next poll:

```yaml
    webhooks:
      - name: chatops-promotion
        type: confirm-promotion
        url: http://chatops-bot.default.svc.cluster.local/promotion-request
        timeout: 30s
        metadata:
          slack-channel: "#deploy-approvals"
          message: "my-app canary has passed analysis. Approve promotion?"
```

The chatops bot posts the approval request to the specified Slack channel and waits for a reaction or command before returning 200 to Flagger.

## Setting a Timeout for the Approval

If you want to auto-approve after a certain amount of time, your webhook service can implement a timeout. Flagger itself will keep polling indefinitely, but your webhook service can start returning 200 after a configurable wait period.

The webhook call itself has a timeout for each individual request:

```yaml
    webhooks:
      - name: promotion-gate
        type: confirm-promotion
        url: http://my-approval-service.default/approve
        timeout: 10s
```

This timeout controls how long Flagger waits for a response from the webhook on each call. It does not control how long Flagger waits for approval overall. Flagger will keep calling the webhook at each analysis interval until it gets a 200.

## Complete Example with Promotion Gate

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
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default:80/"
      - name: promotion-gate
        type: confirm-promotion
        url: http://flagger-loadtester.test/gate/approve
      - name: post-promotion
        type: post-rollout
        url: http://my-notifier.default/promoted
        timeout: 15s
```

In this flow, the canary goes through metric analysis with load testing, waits for manual approval at the promotion gate, and sends a notification after promotion completes.

## Conclusion

The `confirm-promotion` webhook in Flagger provides a final approval gate before a canary is promoted to production. Flagger polls the webhook at each analysis interval until it receives HTTP 200, keeping the canary at its current traffic weight in the meantime. This is ideal for manual approval workflows, ChatOps integration, and external validation systems. The built-in load tester gate endpoint offers a simple way to implement manual approval without building a custom service, while custom webhook services can integrate with existing approval and change management tools.
