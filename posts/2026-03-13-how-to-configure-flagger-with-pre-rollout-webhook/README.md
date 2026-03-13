# How to Configure Flagger with pre-rollout Webhook

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Canary, Webhooks, Pre-Rollout, Kubernetes, Progressive Delivery, Testing

Description: Learn how to configure pre-rollout webhooks in Flagger to run smoke tests, database migrations, or readiness checks before canary traffic shifting begins.

---

## Introduction

Flagger's `pre-rollout` webhook type fires after the canary workload is created and ready but before the first traffic shift occurs. Unlike `confirm-rollout` (which is a gate that Flagger polls repeatedly), `pre-rollout` is executed once per analysis cycle. If the pre-rollout webhook returns a non-200 response, the canary analysis fails and the failure counter increments.

This makes pre-rollout webhooks ideal for running smoke tests against the canary before it receives production traffic, executing database migrations, verifying configuration, or checking that dependent services are available. If the pre-rollout step fails enough times to exceed the threshold, Flagger rolls back the canary.

This guide explains how to configure pre-rollout webhooks, common use cases, and how they interact with other webhook types in the Flagger lifecycle.

## Prerequisites

- A running Kubernetes cluster with Flagger installed
- A Canary resource targeting a Deployment
- The Flagger load tester deployed (for running test commands), or a custom webhook service
- kubectl access to your cluster

## How pre-rollout Differs from confirm-rollout

Both webhook types fire before traffic reaches the canary, but they behave differently:

- `confirm-rollout`: A gate. Flagger calls it on every analysis tick and waits for HTTP 200 before starting the rollout. A non-200 response does not count as a failure.
- `pre-rollout`: A check. Flagger calls it once per analysis cycle after the canary pods are ready. A non-200 response counts as a failed analysis check and increments the failure counter.

Use `confirm-rollout` when you need to wait indefinitely for an external approval. Use `pre-rollout` when you need a test that must pass for the rollout to proceed, and repeated failures should trigger a rollback.

## Configuring a pre-rollout Webhook

Add a webhook with `type: pre-rollout` to the analysis section:

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
      - name: smoke-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 60s
        metadata:
          type: bash
          cmd: "curl -sf http://my-app-canary.default:80/healthz"
```

In this example, Flagger calls the load tester service, which executes the bash command to hit the canary's health endpoint. If the health check fails, the webhook returns a non-200 status and the pre-rollout check fails.

## Running Smoke Tests with the Load Tester

The Flagger load tester can execute arbitrary commands as pre-rollout checks. This lets you run integration tests, API validation, or any custom script:

```yaml
    webhooks:
      - name: integration-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 120s
        metadata:
          type: bash
          cmd: |
            curl -sf http://my-app-canary.default:80/api/v1/status | \
            jq -e '.ready == true'
```

The `type: bash` metadata tells the load tester to execute the command as a shell command. The exit code determines the webhook response: exit 0 returns HTTP 200, any other exit code returns a non-200 response.

## Running Multiple Pre-rollout Checks

You can define multiple pre-rollout webhooks. Flagger executes them in order, and all must succeed:

```yaml
    webhooks:
      - name: health-check
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -sf http://my-app-canary.default:80/healthz"
      - name: dependency-check
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -sf http://dependency-service.default:80/healthz"
      - name: config-validation
        type: pre-rollout
        url: http://my-config-validator.default/validate
        timeout: 30s
```

If any webhook in the list fails, the pre-rollout phase fails for that analysis cycle.

## Calling an External Webhook Service

You do not need to use the Flagger load tester. Any HTTP service that accepts a POST request and returns 200 on success works as a pre-rollout webhook:

```yaml
    webhooks:
      - name: migration-check
        type: pre-rollout
        url: http://migration-service.default.svc.cluster.local/check
        timeout: 60s
        metadata:
          canary-name: my-app
          target-version: "v2.1.0"
```

Flagger sends the metadata in the POST body. Your service can use it to determine which migration to check or which version to validate.

The POST body sent by Flagger looks like this:

```json
{
  "name": "my-app",
  "namespace": "default",
  "phase": "Progressing",
  "metadata": {
    "canary-name": "my-app",
    "target-version": "v2.1.0"
  }
}
```

## Pre-rollout with Database Migrations

A common pattern is using pre-rollout to verify that database migrations have been applied before the canary receives traffic:

```yaml
    webhooks:
      - name: db-migration-check
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 120s
        metadata:
          type: bash
          cmd: |
            kubectl run migration-check --rm -i --restart=Never \
              --image=my-app:latest -- \
              /app/check-migrations --target-version=$CANARY_VERSION
```

This creates a temporary pod that runs a migration check script. If the migrations are not applied, the command exits with a non-zero code, failing the pre-rollout check.

## Complete Canary with Pre-rollout Example

Here is a full Canary resource that uses pre-rollout for smoke testing alongside metrics and load testing:

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
```

The smoke test runs before traffic shifting. The load test runs during each analysis step to generate traffic for metric evaluation.

## Conclusion

The `pre-rollout` webhook in Flagger lets you run validation checks after the canary workload is ready but before it receives production traffic. Failed pre-rollout checks increment the failure counter and can trigger rollbacks, making them suitable for smoke tests, dependency checks, and migration validation. Use the Flagger load tester for shell-based checks or point to your own HTTP service for custom validation logic. Combined with metrics and other webhook types, pre-rollout checks add an important safety layer to your progressive delivery pipeline.
