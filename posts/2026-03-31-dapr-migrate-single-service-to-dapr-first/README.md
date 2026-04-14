# How to Migrate a Single Service to Dapr First

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Migration, Microservice, Strategy, Adoption

Description: Learn how to migrate one service to Dapr without disrupting other services, using incremental steps that let you validate each change before moving forward.

---

The safest way to introduce Dapr into a production system is to migrate one service at a time. This approach lets you validate the Dapr integration in production without putting the entire system at risk.

## Selecting the First Service

Choose a service that:

- Has clear boundaries and few direct dependencies
- Currently uses at least one thing Dapr replaces (HTTP calls, a state store, a message queue)
- Has good test coverage so you can verify behavior after migration
- Can tolerate a brief maintenance window if rollback is needed

A good first candidate is a background worker that processes messages from a queue.

## Preparation

Before touching the service code, prepare the Dapr components:

```yaml
# statestore.yaml - mirrors the existing Redis config
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis.production.svc.cluster.local:6379"
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
```

Point the Dapr component at the same Redis instance your service already uses. This avoids data migration.

## Step 1: Add Sidecar Without Code Changes

Deploy the service with Dapr annotations but keep all existing code unchanged:

```yaml
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-processor"
        dapr.io/app-port: "8080"
        dapr.io/log-level: "info"
```

Verify the sidecar starts cleanly:

```bash
kubectl get pods -n production -l app=order-processor
# Should show 2/2 Ready (app container + daprd sidecar)

kubectl logs -n production deploy/order-processor -c daprd
# Should show no errors
```

## Step 2: Replace One Integration at a Time

Start with the simplest integration. Replace direct Redis state access with Dapr state API:

```python
# Before: direct Redis SDK
import redis
r = redis.Redis(host='redis', port=6379)
r.set('order:123', json.dumps(order))

# After: Dapr state API
import requests
requests.post(
    'http://localhost:3500/v1.0/state/statestore',
    json=[{"key": "order:123", "value": order}]
)
```

Or use the Python SDK:

```python
from dapr.clients import DaprClient

with DaprClient() as d:
    d.save_state("statestore", "order:123", json.dumps(order))
```

## Step 3: Validate in Staging

Deploy to staging and run your full integration test suite:

```bash
# Run integration tests against the Dapr-enabled service
pytest tests/integration/ -v --env=staging

# Load test to verify latency impact
locust -f locustfile.py --host=https://staging.api.example.com
```

## Step 4: Incremental Production Rollout

Use a rolling deployment to validate in production gradually:

```bash
# Update the deployment image (performs a rolling update)
kubectl set image deployment/order-processor \
  app=order-processor:dapr-enabled-v1.2.3

# Monitor resource usage during rollout
kubectl top pods -n production
```

## Rollback Plan

Keep the previous deployment manifest ready:

```bash
# Rollback if issues arise
kubectl rollout undo deployment/order-processor -n production
```

## Summary

Migrating one service to Dapr first means preparing components that point to existing infrastructure, adding sidecar annotations without code changes first, then replacing one integration at a time. Use staging validation and canary deployments to confirm correctness and performance before full production rollout.
