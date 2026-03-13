# How to Configure Flagger with confirm-traffic-increase Webhook

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Canary, Webhooks, Confirm-Traffic-Increase, Kubernetes, Progressive Delivery, Traffic Management

Description: Learn how to configure a confirm-traffic-increase webhook in Flagger to gate each traffic weight increase during canary analysis.

---

## Introduction

Flagger's `confirm-traffic-increase` webhook type provides fine-grained control over traffic shifting during canary analysis. While `confirm-rollout` gates the start of analysis and `confirm-promotion` gates the final promotion, `confirm-traffic-increase` is called before each individual traffic weight increase. This gives you the ability to approve or hold each step of the progressive traffic shift.

This webhook type is useful when you want to manually approve each traffic increase, when an external system needs to validate readiness at each step, or when you want to implement a controlled rollout that pauses at specific traffic percentages.

This guide explains how to configure the confirm-traffic-increase webhook, how it interacts with canary stepping, and practical patterns for using it.

## Prerequisites

- A running Kubernetes cluster with Flagger installed
- A Canary resource targeting a Deployment with stepWeight or stepWeights configured
- kubectl access to your cluster
- A webhook receiver service or the Flagger load tester

## How confirm-traffic-increase Works

During canary analysis, Flagger increases traffic to the canary by the configured `stepWeight` after each successful analysis interval. Before each traffic increase, Flagger calls all `confirm-traffic-increase` webhooks. If any webhook returns a non-200 response, Flagger holds the traffic at the current weight and retries on the next interval.

The sequence for each step is:

1. Flagger evaluates all metrics for the current traffic weight
2. If metrics pass, Flagger prepares to increase traffic
3. Flagger calls all `confirm-traffic-increase` webhooks
4. If all return HTTP 200, traffic weight increases
5. If any return non-200, traffic weight stays the same and Flagger retries next interval

This differs from `confirm-rollout` (which only fires before the first traffic shift) and `confirm-promotion` (which only fires before the final promotion).

## Configuring the Webhook

Add a webhook with `type: confirm-traffic-increase` to the analysis section:

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
      - name: traffic-gate
        type: confirm-traffic-increase
        url: http://my-gate-service.default.svc.cluster.local/approve-traffic
```

Flagger sends a POST request before each traffic increase. The request body includes the canary metadata:

```json
{
  "name": "my-app",
  "namespace": "default",
  "phase": "Progressing",
  "metadata": {}
}
```

## Using the Load Tester Gate

The Flagger load tester provides gate endpoints that work with confirm-traffic-increase:

```yaml
    webhooks:
      - name: traffic-gate
        type: confirm-traffic-increase
        url: http://flagger-loadtester.test/gate/approve
```

Open the gate to allow traffic increases:

```bash
kubectl -n test exec deploy/flagger-loadtester -- \
  curl -s -X POST http://localhost:8080/gate/open
```

Close the gate to pause traffic shifting:

```bash
kubectl -n test exec deploy/flagger-loadtester -- \
  curl -s -X POST http://localhost:8080/gate/close
```

When the gate is closed, Flagger holds the current traffic weight and keeps running metric checks. No traffic increase happens until the gate opens. This effectively gives you a pause button for the canary rollout.

## Passing Metadata

Include metadata to provide context to your webhook service:

```yaml
    webhooks:
      - name: traffic-gate
        type: confirm-traffic-increase
        url: http://my-gate-service.default/approve-traffic
        metadata:
          service: my-app
          environment: production
          max-rps-per-step: "100"
```

Your gate service can use this metadata to make decisions about whether to approve the traffic increase based on current system conditions.

## Building a Custom Gate Service

A custom gate service for confirm-traffic-increase might check external conditions before approving each traffic step. For example, it might verify that error rates across the entire platform are within acceptable bounds before allowing more traffic to the canary:

```yaml
    webhooks:
      - name: platform-health-gate
        type: confirm-traffic-increase
        url: http://platform-health-checker.default/check
        timeout: 15s
        metadata:
          max-error-rate: "0.5"
          check-services: "api-gateway,auth-service,database"
```

The health checker service queries platform-wide metrics and only returns 200 if all specified services are healthy. This prevents traffic increases during broader platform incidents.

## Combining with stepWeights

When using custom step weights instead of a uniform stepWeight, the confirm-traffic-increase webhook fires before each defined step:

```yaml
  analysis:
    interval: 1m
    threshold: 5
    stepWeights: [1, 5, 10, 25, 50]
    webhooks:
      - name: traffic-gate
        type: confirm-traffic-increase
        url: http://flagger-loadtester.test/gate/approve
```

The webhook fires before increasing from 0 to 1%, then before 1 to 5%, then before 5 to 10%, and so on. This lets you gate each custom step individually.

## Complete Example

Here is a full Canary resource using confirm-traffic-increase alongside other webhook types:

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
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
    webhooks:
      - name: confirm-start
        type: confirm-rollout
        url: http://flagger-loadtester.test/gate/approve
      - name: smoke-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 60s
        metadata:
          type: bash
          cmd: "curl -sf http://my-app-canary.default:80/healthz"
      - name: traffic-gate
        type: confirm-traffic-increase
        url: http://my-gate-service.default/approve
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default:80/"
      - name: confirm-promote
        type: confirm-promotion
        url: http://flagger-loadtester.test/gate/approve
```

This configuration provides gates at three levels: before analysis starts, before each traffic increase, and before final promotion. The smoke test validates the canary before traffic starts, and load testing generates traffic for metric evaluation.

## Conclusion

The `confirm-traffic-increase` webhook gives you step-by-step control over traffic shifting during Flagger canary analysis. Each traffic weight increase requires webhook approval, letting you implement manual approval at every step, integrate with external health-checking systems, or simply add a pause mechanism to your progressive delivery pipeline. Combined with Flagger's other gate webhooks, it provides comprehensive control over the entire canary lifecycle from initial rollout to final promotion.
