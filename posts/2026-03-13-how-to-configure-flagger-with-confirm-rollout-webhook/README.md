# How to Configure Flagger with confirm-rollout Webhook

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Canary, Webhooks, Confirm-Rollout, Kubernetes, Progressive Delivery, Gates

Description: Learn how to configure a confirm-rollout webhook in Flagger to add manual or automated approval gates before a canary deployment begins.

---

## Introduction

Flagger supports several webhook types that let you integrate external systems into the canary deployment lifecycle. The `confirm-rollout` webhook is called before Flagger begins routing traffic to the canary version. It acts as a gate: Flagger will not start the canary analysis until the webhook returns a successful response.

This is useful for scenarios where you need manual approval before a deployment proceeds, want to check an external system for deployment readiness, or need to coordinate rollouts across multiple services. Flagger calls the confirm-rollout webhook repeatedly at each analysis interval until it receives a 200 response, at which point the canary analysis begins.

This guide covers how to configure confirm-rollout webhooks in your Canary resource, how to build a simple webhook receiver, and practical patterns for using this gate.

## Prerequisites

- A running Kubernetes cluster with Flagger installed
- A Canary resource targeting a Deployment
- kubectl access to your cluster
- A webhook receiver service (or the Flagger load tester, which includes a gate endpoint)

## How confirm-rollout Works

When Flagger detects a new revision of the target Deployment, it creates the canary workload but does not start routing traffic to it. Before entering the analysis loop, Flagger calls all webhooks of type `confirm-rollout`. If any of them returns a non-200 HTTP status code, Flagger logs the response and waits until the next analysis interval to try again. The canary remains at zero traffic weight until all confirm-rollout webhooks return 200.

This means the webhook controls the start of the rollout, not the promotion. Flagger has a separate `confirm-promotion` webhook type for the promotion gate.

## Configuring a confirm-rollout Webhook

Add a webhook entry with `type: confirm-rollout` to the analysis section of your Canary resource:

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
      - name: confirm-rollout-gate
        type: confirm-rollout
        url: http://my-webhook-service.default.svc.cluster.local/gate/approve
```

When Flagger detects a new revision, it sends an HTTP POST request to the specified URL with a JSON payload containing metadata about the canary:

```json
{
  "name": "my-app",
  "namespace": "default",
  "phase": "Progressing",
  "metadata": {}
}
```

If the webhook returns HTTP 200, Flagger proceeds with the canary analysis. Any other status code causes Flagger to wait and retry on the next interval tick.

## Using the Flagger Load Tester Gate Endpoint

The Flagger load tester ships with built-in gate endpoints that you can use for manual approval workflows. You open or close the gate via the load tester API:

```yaml
    webhooks:
      - name: confirm-rollout-gate
        type: confirm-rollout
        url: http://flagger-loadtester.test/gate/approve
```

By default, the gate is closed. To open it and allow the rollout to proceed, send a POST request to the load tester:

```bash
kubectl -n test exec deploy/flagger-loadtester -- \
  curl -s -X POST http://localhost:8080/gate/open
```

To close the gate again (for future rollouts):

```bash
kubectl -n test exec deploy/flagger-loadtester -- \
  curl -s -X POST http://localhost:8080/gate/close
```

This provides a simple manual approval mechanism without building a custom webhook service.

## Passing Metadata to the Webhook

You can pass custom metadata from the Canary resource to the webhook. This is useful for sending identifiers, environment names, or configuration keys:

```yaml
    webhooks:
      - name: confirm-rollout-gate
        type: confirm-rollout
        url: http://my-webhook-service.default.svc.cluster.local/gate/approve
        metadata:
          environment: production
          team: platform
          approval-channel: "#deploys"
```

The metadata is included in the webhook POST request body:

```json
{
  "name": "my-app",
  "namespace": "default",
  "phase": "Progressing",
  "metadata": {
    "environment": "production",
    "team": "platform",
    "approval-channel": "#deploys"
  }
}
```

Your webhook receiver can use this metadata to route the approval request to the correct team or channel.

## Building a Simple Webhook Receiver

A confirm-rollout webhook receiver only needs to handle POST requests and return 200 when the rollout should proceed. Here is a minimal example as a Kubernetes Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rollout-gate
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rollout-gate
  template:
    metadata:
      labels:
        app: rollout-gate
    spec:
      containers:
        - name: gate
          image: nginx:alpine
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: rollout-gate
  namespace: default
spec:
  selector:
    app: rollout-gate
  ports:
    - port: 80
      targetPort: 80
```

In practice, you would replace the nginx container with your own application logic that checks an external approval system, a feature flag service, or a database for deployment readiness.

## Setting a Timeout

You can configure a timeout for the webhook call. If the webhook does not respond within the timeout, Flagger treats it as a failure:

```yaml
    webhooks:
      - name: confirm-rollout-gate
        type: confirm-rollout
        url: http://my-webhook-service.default.svc.cluster.local/gate/approve
        timeout: 30s
```

The default timeout is 60 seconds. Setting a shorter timeout is recommended for webhooks that should respond quickly, to avoid blocking the analysis loop.

## Combining with Other Webhook Types

You can use confirm-rollout alongside other webhook types in the same Canary resource:

```yaml
    webhooks:
      - name: confirm-rollout-gate
        type: confirm-rollout
        url: http://my-webhook-service.default/gate/approve
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default:80/"
      - name: notify-slack
        type: event
        url: http://my-notifier.default/slack
```

Each webhook type fires at a different point in the canary lifecycle. The confirm-rollout gate fires first, the rollout webhook fires during each analysis step, and the event webhook fires on state transitions.

## Conclusion

The `confirm-rollout` webhook in Flagger provides a gate mechanism that prevents canary analysis from starting until an external system approves. This is valuable for manual approval workflows, coordination between services, and integration with external deployment management tools. The webhook is called repeatedly until it returns HTTP 200, making it safe to use with systems that may take time to evaluate readiness. Whether you use the built-in load tester gate endpoints or build a custom webhook service, the configuration is a straightforward addition to your Canary resource.
