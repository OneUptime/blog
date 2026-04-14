# How to Plan a Dapr Migration Strategy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Migration, Strategy, Microservice, Architecture

Description: Plan and execute a Dapr migration strategy for existing microservices, covering phase planning, risk mitigation, and rollback approaches.

---

Migrating existing microservices to Dapr requires careful planning to avoid disruption. A phased, reversible migration strategy minimizes risk while delivering value incrementally.

## Migration Principles

1. **Never big-bang migrate** - migrate one service at a time
2. **Keep rollback available** - maintain the ability to disable Dapr without changing app code
3. **Migrate one building block at a time** - don't add state, pub/sub, and bindings simultaneously
4. **Start with stateless services** - they are easier to migrate and validate

## Phase 0: Infrastructure Preparation

Before migrating any service, set up Dapr on the target cluster:

```bash
# Install Dapr
helm install dapr dapr/dapr \
  -n dapr-system \
  --create-namespace \
  --set global.logAsJson=true \
  --wait

# Verify installation
dapr status -k
```

Create component configurations for your existing infrastructure:

```yaml
# Map existing Redis to Dapr state store
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
    value: existing-redis:6379
```

## Phase 1: Pilot Service

Select a low-risk, stateless service for the pilot:

Criteria for the pilot service:
- Low traffic volume
- Simple infrastructure dependencies
- Team member who is enthusiastic about Dapr
- Easy rollback path

Enable Dapr on the service without changing any code first:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/app-port: "8080"
```

Monitor for 24-48 hours. Check that the sidecar starts correctly:

```bash
kubectl logs <pod-name> -c daprd | grep -i "error\|warn"
```

## Phase 2: Migrate One Building Block

Migrate the service's most painful infrastructure concern to Dapr. Start with state management or pub/sub:

**Before (direct Redis):**
```python
import redis
r = redis.Redis(host=REDIS_HOST)
r.set(f"order:{order_id}", json.dumps(order))
```

**After (Dapr state store):**
```python
from dapr.clients import DaprClient
with DaprClient() as d:
    d.save_state('statestore', f'order-{order_id}', json.dumps(order))
```

Deploy alongside the old code with a feature flag for gradual rollout:

```python
USE_DAPR = os.getenv('USE_DAPR', 'false').lower() == 'true'

if USE_DAPR:
    save_with_dapr(order)
else:
    save_with_redis(order)
```

## Phase 3: Validate and Expand

After successful pilot validation (1-2 weeks), expand to the next service. Use the lessons learned to update your migration runbook.

Track migration progress:

```bash
# Count services with Dapr enabled
kubectl get pods -A -o jsonpath='{.items[*].metadata.annotations.dapr\.io/enabled}' | \
  tr ' ' '\n' | grep "true" | wc -l
```

## Phase 4: Decommission Legacy Integrations

Once all services use Dapr for a building block, remove the legacy client libraries:

```bash
# Python - remove unused redis package
pip uninstall redis
# Update requirements.txt
grep -v "^redis" requirements.txt > requirements.new.txt
```

## Rollback Plan

If a migration causes issues, rolling back is straightforward:

```yaml
# Remove Dapr annotation to disable injection
# annotations:
#   dapr.io/enabled: "true"
```

Or keep Dapr enabled but revert the application code to use the legacy client.

## Summary

A successful Dapr migration follows a phased approach: set up infrastructure first, pilot with one low-risk service, migrate one building block at a time using feature flags, validate before expanding, and decommission legacy clients only after full adoption. Maintain rollback capability throughout by keeping legacy clients available until the migration is proven stable.
