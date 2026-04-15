# How to Adopt Dapr Incrementally in an Existing System

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Adoption, Incremental, Migration, Architecture

Description: A step-by-step guide to incrementally adopting Dapr in an existing system without disrupting production, using the strangler fig pattern and feature flags.

---

Incremental adoption is the safest way to introduce Dapr into an existing system. Rather than migrating everything at once, you add Dapr alongside existing code, gradually shifting traffic and functionality.

## The Strangler Fig Pattern for Dapr

The strangler fig pattern involves building new functionality around existing systems until the old system can be removed. Apply it to Dapr adoption:

1. Deploy Dapr sidecar alongside existing services (no code changes)
2. Route a small percentage of operations through Dapr
3. Increase the percentage as confidence grows
4. Remove the legacy integration once Dapr handles 100%

## Step 1: Enable Dapr Without Changing Code

Add the Dapr annotation to an existing deployment. The sidecar starts but is not yet called by your application:

```yaml
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "user-service"
        dapr.io/app-port: "3000"
    spec:
      containers:
      - name: user-service
        image: user-service:v1.2.3
```

Deploy and monitor. If the sidecar causes issues, remove the annotation.

## Step 2: Create the Dapr Component

Set up the component that mirrors your existing infrastructure:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: usercache
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: existing-redis-cluster:6379  # Same Redis your app already uses
```

This means both the legacy client and Dapr point to the same backend initially - no data migration needed.

## Step 3: Add Dapr Calls Behind a Feature Flag

Introduce Dapr without removing the existing code:

```python
import json
import os
from dapr.clients import DaprClient

DAPR_ENABLED = os.getenv('ENABLE_DAPR_STATE', 'false') == 'true'

def get_user(user_id: str) -> dict:
    if DAPR_ENABLED:
        with DaprClient() as d:
            result = d.get_state('usercache', f'user-{user_id}')
            if result.data:
                return json.loads(result.data)
    # Legacy path
    return redis_client.get(f'user:{user_id}')

def save_user(user_id: str, user: dict):
    if DAPR_ENABLED:
        with DaprClient() as d:
            d.save_state('usercache', f'user-{user_id}', json.dumps(user))
    else:
        redis_client.set(f'user:{user_id}', json.dumps(user))
```

## Step 4: Canary Rollout

Enable the Dapr path for 10% of requests using a percentage-based flag:

```python
import random

def use_dapr() -> bool:
    rollout_percentage = int(os.getenv('DAPR_ROLLOUT_PERCENT', '0'))
    return random.randint(1, 100) <= rollout_percentage
```

Set the environment variable and watch metrics:

```bash
kubectl set env deployment/user-service DAPR_ROLLOUT_PERCENT=10
```

Monitor error rates and latency. If both are acceptable, increase to 50%, then 100%.

## Step 5: Full Cutover

Once 100% of traffic flows through Dapr with no issues for 2-3 weeks:

```bash
# Set flag to 100%
kubectl set env deployment/user-service DAPR_ROLLOUT_PERCENT=100 ENABLE_DAPR_STATE=true

# Remove feature flag code in the next sprint
# Remove legacy Redis client dependency
```

## Step 6: Clean Up Legacy Code

After a safe period (1-2 sprints), remove the legacy code path and the feature flag:

```python
# Clean version - no feature flags, no legacy code
def get_user(user_id: str) -> dict:
    with DaprClient() as d:
        result = d.get_state('usercache', f'user-{user_id}')
        return json.loads(result.data) if result.data else None
```

And remove the unused dependency:

```bash
pip uninstall redis
```

## Incremental Service-by-Service Plan

Apply the same pattern to all services in sequence. Track in a spreadsheet:

| Service | Dapr Enabled | State Migrated | Pub/Sub Migrated | Legacy Removed |
|---------|-------------|----------------|-----------------|----------------|
| user-service | Yes | Yes | In progress | No |
| order-service | Yes | No | No | No |
| product-service | No | No | No | No |

## Summary

Incremental Dapr adoption using the strangler fig pattern and feature flags lets you introduce Dapr safely without service disruption. Enable the sidecar first with no code changes, then route small percentages of operations through Dapr while monitoring metrics, gradually increasing to 100% before removing legacy code. This approach keeps rollback available at every stage.
