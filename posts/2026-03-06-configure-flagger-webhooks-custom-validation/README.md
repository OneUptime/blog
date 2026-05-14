# How to Configure Flagger Webhooks for Custom Validation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Flagger, Webhook, Validation, Canary, Kubernetes, GitOps, Testing

Description: A comprehensive guide to setting up Flagger webhooks for custom validation logic during canary deployments in Flux-managed clusters.

---

## Introduction

Flagger supports webhooks that allow you to extend the canary analysis process with custom validation logic. Webhooks are HTTP callbacks that Flagger invokes at various stages of the canary deployment lifecycle. You can use them to run integration tests, check external service health, validate business rules, or gate deployments on manual approval.

This guide covers how to configure and implement Flagger webhooks for custom validation in a Flux-managed Kubernetes environment.

## Prerequisites

- A Kubernetes cluster with Flux and Flagger installed
- A running application with a Flagger Canary resource
- kubectl and flux CLI tools
- Basic understanding of HTTP services and webhooks

## Understanding Webhook Types

Flagger supports several webhook types that are invoked at different stages of the canary lifecycle:

- **confirm-rollout**: Called before the canary analysis begins; blocks rollout until it returns HTTP 200
- **pre-rollout**: Called before traffic is shifted to the canary
- **rollout**: Called during each analysis iteration
- **confirm-traffic-increase**: Called before each canary traffic weight increase; blocks advancement until it returns HTTP 200
- **confirm-promotion**: Called before the canary is promoted; blocks promotion until it returns HTTP 200
- **post-rollout**: Called after the canary has been promoted or rolled back
- **rollback**: Called during analysis or confirmation states; if it returns a successful HTTP status code, Flagger rolls back the canary
- **event**: Called for every Flagger event

## Step 1: Create a Webhook Validation Service

First, deploy a simple webhook service that performs custom validation. Here is a Go-based example containerized for Kubernetes.

```yaml
# webhook-service-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: flagger-webhook-validator
  namespace: flagger-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: flagger-webhook-validator
  template:
    metadata:
      labels:
        app: flagger-webhook-validator
    spec:
      containers:
        - name: validator
          image: your-registry/flagger-webhook-validator:1.0.0
          ports:
            - containerPort: 8080
          # Health check endpoints
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            initialDelaySeconds: 5
          env:
            # Configuration for the validator
            - name: VALIDATION_TIMEOUT
              value: "30s"
            - name: LOG_LEVEL
              value: "info"
---
apiVersion: v1
kind: Service
metadata:
  name: flagger-webhook-validator
  namespace: flagger-system
spec:
  selector:
    app: flagger-webhook-validator
  ports:
    - port: 80
      targetPort: 8080
```

## Step 2: Understand the Webhook Payload

Flagger sends a JSON payload to the webhook endpoint. Your service must accept this format.

```json
{
  "name": "my-app",
  "namespace": "default",
  "phase": "Progressing",
  "checksum": "85d557f47b",
  "metadata": {
    "custom-key": "custom-value"
  }
}
```

Your webhook service must respond with:

- **HTTP 2xx**: Validation passed for rollout validation hooks
- **HTTP 200**: Required for confirmation gates such as `confirm-rollout`, `confirm-traffic-increase`, and `confirm-promotion`
- **Timeout or non-2xx**: Validation failed (Flagger halts advancement and increments the failure counter)

## Step 3: Configure Pre-Rollout Webhook

A pre-rollout webhook runs checks before traffic shifting begins. This is useful for running database migration checks or verifying dependencies.

```yaml
# canary-with-pre-rollout-webhook.yaml
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
    # Webhook definitions
    webhooks:
      # Pre-rollout webhook for dependency checks
      - name: dependency-check
        type: pre-rollout
        # URL of the webhook service
        url: http://flagger-webhook-validator.flagger-system.svc.cluster.local/check-dependencies
        # Timeout for the webhook call
        timeout: 30s
        # Custom metadata passed in the payload
        metadata:
          # List of services this app depends on
          dependencies: "database,cache,message-queue"
          # Type of check to perform
          check_type: "health"
```

## Step 4: Configure Confirm-Rollout Webhook for Manual Gating

Use a confirm-rollout webhook to implement manual approval gates. The canary will not proceed until the webhook returns HTTP 200.

```yaml
# canary-with-confirm-rollout.yaml
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
      # Manual gate that blocks rollout until approved
      - name: manual-approval-gate
        type: confirm-rollout
        url: http://flagger-webhook-validator.flagger-system.svc.cluster.local/approve
        timeout: 60s
        metadata:
          # Slack channel for approval notifications
          approval_channel: "#deployments"
          # Required approvers
          approvers: "team-lead,sre-oncall"
```

## Step 5: Configure Rollout Webhooks for Continuous Validation

Rollout webhooks are called during each analysis iteration. Use them for ongoing validation checks.

```yaml
# canary-with-rollout-webhooks.yaml
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
      # Integration test webhook called every iteration
      - name: integration-tests
        type: rollout
        url: http://flagger-webhook-validator.flagger-system.svc.cluster.local/run-tests
        timeout: 120s
        metadata:
          # Test suite to run
          test_suite: "smoke-tests"
          # Target URL for testing
          target_url: "http://my-app-canary.default.svc.cluster.local"
      # API contract validation
      - name: api-contract-check
        type: rollout
        url: http://flagger-webhook-validator.flagger-system.svc.cluster.local/check-api-contract
        timeout: 60s
        metadata:
          # OpenAPI spec to validate against
          spec_url: "http://my-app-canary.default.svc.cluster.local/openapi.json"
          # Strict mode fails on any deviation
          strict: "true"
```

## Step 6: Configure Confirm-Traffic-Increase and Confirm-Promotion Webhooks

A confirm-traffic-increase webhook gates each traffic weight increase. A confirm-promotion webhook provides a final gate before the canary is promoted to production.

```yaml
# canary-with-confirm-gates.yaml
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
      # Gate before each traffic increase
      - name: traffic-increase-gate
        type: confirm-traffic-increase
        url: http://flagger-webhook-validator.flagger-system.svc.cluster.local/confirm-traffic-increase
        timeout: 60s
        metadata:
          # Check for active incidents before increasing traffic
          incident_check: "true"
      # Final promotion gate
      - name: promotion-gate
        type: confirm-promotion
        url: http://flagger-webhook-validator.flagger-system.svc.cluster.local/confirm-promotion
        timeout: 60s
        metadata:
          # Require a minimum number of successful iterations
          min_iterations: "5"
          # Require a final approval before promotion
          final_approval: "true"
```

## Step 7: Configure Post-Rollout and Rollback Webhooks

Post-rollout webhooks run after a promotion or rollback. Rollback webhooks run during analysis or confirmation states and trigger a rollback when they return a successful HTTP status code.

```yaml
# canary-with-post-hooks.yaml
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
      # Runs after promotion or rollback
      - name: post-rollout-cleanup
        type: post-rollout
        url: http://flagger-webhook-validator.flagger-system.svc.cluster.local/post-rollout
        timeout: 60s
        metadata:
          # Actions to take after the rollout finishes
          actions: "update-changelog,notify-stakeholders,clear-cache"
      # Triggers rollback when the webhook returns HTTP 2xx
      - name: rollback-gate
        type: rollback
        url: http://flagger-webhook-validator.flagger-system.svc.cluster.local/rollback-check
        timeout: 30s
        metadata:
          # External condition to evaluate before forcing rollback
          rollback_on_incident: "true"
```

## Step 8: Complete Canary Configuration with All Webhook Types

Here is a complete Canary resource with all webhook types configured together.

```yaml
# canary-complete.yaml
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
      - name: confirm-deploy
        type: confirm-rollout
        url: http://flagger-webhook-validator.flagger-system.svc.cluster.local/approve
        timeout: 60s
      - name: pre-checks
        type: pre-rollout
        url: http://flagger-webhook-validator.flagger-system.svc.cluster.local/pre-check
        timeout: 30s
      - name: smoke-tests
        type: rollout
        url: http://flagger-webhook-validator.flagger-system.svc.cluster.local/test
        timeout: 120s
      - name: traffic-increase-gate
        type: confirm-traffic-increase
        url: http://flagger-webhook-validator.flagger-system.svc.cluster.local/confirm-traffic-increase
        timeout: 60s
      - name: final-gate
        type: confirm-promotion
        url: http://flagger-webhook-validator.flagger-system.svc.cluster.local/confirm
        timeout: 60s
      - name: cleanup
        type: post-rollout
        url: http://flagger-webhook-validator.flagger-system.svc.cluster.local/cleanup
        timeout: 30s
      - name: rollback-alert
        type: rollback
        url: http://flagger-webhook-validator.flagger-system.svc.cluster.local/rollback
        timeout: 30s
      - name: send-events
        type: event
        url: http://flagger-webhook-validator.flagger-system.svc.cluster.local/events
        timeout: 30s
```

## Step 9: Verify Webhook Configuration

Test and verify webhook integration:

```bash
# Check the canary resource
kubectl get canary my-app -n default

# View webhook call logs
kubectl logs -n flagger-system deployment/flagger -f | grep webhook

# Test the webhook endpoint directly
kubectl run -n flagger-system test-webhook --rm -it --image=curlimages/curl -- \
  curl -s -X POST http://flagger-webhook-validator.flagger-system.svc.cluster.local/test \
  -H "Content-Type: application/json" \
  -d '{"name":"my-app","namespace":"default","phase":"Progressing","checksum":"85d557f47b","metadata":{}}'
```

## Troubleshooting

Common webhook issues:

- **Webhook timeout**: Increase the `timeout` value or optimize the webhook service
- **Connection refused**: Verify the webhook service is running and the URL is correct
- **HTTP 500 from webhook**: Check the webhook service logs for errors
- **Canary stuck in Waiting or WaitingPromotion**: A confirm-rollout, confirm-traffic-increase, or confirm-promotion webhook may be blocking; check its status

```bash
# Check webhook service logs
kubectl logs -n flagger-system deployment/flagger-webhook-validator --tail=50

# Check Flagger events
kubectl get events -n default --field-selector involvedObject.name=my-app --sort-by='.lastTimestamp'
```

## Conclusion

Flagger webhooks provide a powerful extension mechanism for custom validation during canary deployments. By combining pre-rollout checks, continuous validation, manual gates, and post-deployment actions, you can build a comprehensive progressive delivery pipeline that fits your specific requirements. When managed through Flux GitOps, these webhook configurations are version-controlled and auditable.
