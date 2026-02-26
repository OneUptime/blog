# ArgoCD Runbook: Redis Memory Full

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Redis, Runbook

Description: A step-by-step operational runbook for diagnosing and resolving ArgoCD Redis memory full conditions, covering symptoms, data cleanup, memory tuning, and eviction policy configuration.

---

When ArgoCD's Redis instance runs out of memory, the effects cascade across the entire system. The repo server cannot cache manifests, the controller loses its state cache, and API server sessions may be lost. Users see slow syncs, stale data, and intermittent errors. This runbook provides step-by-step instructions to diagnose and resolve Redis memory issues.

## Symptoms

- ArgoCD components log errors containing "OOM command not allowed" or "MISCONF Redis is configured to save RDB snapshots"
- Manifest generation is slow because cached results are being evicted
- The ArgoCD UI loads slowly or shows stale data
- Redis pod shows high memory usage close to its limit
- Redis pod restarts with OOMKilled status

## Impact Assessment

**Severity:** P2

**Impact:** All ArgoCD operations are degraded. Syncs take longer because cached data is lost. The UI may show incorrect or stale information. If Redis is completely down, ArgoCD components may crash or hang.

## Diagnostic Steps

### Step 1: Check Redis Memory Usage

```bash
# Check Redis pod status
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-redis

# Check current memory usage
kubectl exec -n argocd deployment/argocd-redis -- redis-cli info memory

# Key metrics to note:
# used_memory_human: Current memory usage
# used_memory_peak_human: Peak memory usage
# maxmemory_human: Configured maximum
# maxmemory_policy: Current eviction policy
# mem_fragmentation_ratio: Should be close to 1.0
```

### Step 2: Check Eviction Policy

```bash
# Check current eviction policy
kubectl exec -n argocd deployment/argocd-redis -- redis-cli config get maxmemory-policy

# If the output is "noeviction", Redis will reject writes when full
# This is the root cause of "OOM command not allowed" errors
```

### Step 3: Check Key Distribution

```bash
# Count keys by type
kubectl exec -n argocd deployment/argocd-redis -- redis-cli dbsize

# Get memory usage of the largest keys
kubectl exec -n argocd deployment/argocd-redis -- redis-cli --bigkeys

# Sample key patterns to understand what's consuming memory
kubectl exec -n argocd deployment/argocd-redis -- redis-cli --scan --pattern '*' | head -50
```

### Step 4: Check for Memory Fragmentation

```bash
# Get fragmentation ratio
kubectl exec -n argocd deployment/argocd-redis -- redis-cli info memory | grep mem_fragmentation_ratio

# A ratio > 1.5 indicates significant fragmentation
# Fragmentation means Redis uses more OS memory than the data requires
```

### Step 5: Check Pod Resource Limits

```bash
# Check Kubernetes resource limits
kubectl get deployment argocd-redis -n argocd \
  -o jsonpath='{.spec.template.spec.containers[0].resources}' | jq .

# Check if the pod was OOMKilled
kubectl get events -n argocd --field-selector reason=OOMKilling,involvedObject.name~=argocd-redis
```

## Root Causes and Resolutions

### Cause 1: No Eviction Policy Set

The default Redis configuration in some ArgoCD installations uses `noeviction`, meaning Redis refuses new writes instead of evicting old data.

```bash
# Fix: Set allkeys-lru eviction policy
kubectl exec -n argocd deployment/argocd-redis -- redis-cli config set maxmemory-policy allkeys-lru

# This takes effect immediately but is not persistent across restarts
# For a persistent fix, update the deployment:
kubectl edit deployment argocd-redis -n argocd
# Add to container args:
# - --maxmemory-policy=allkeys-lru
```

### Cause 2: Max Memory Too Low

The configured maximum memory is too small for the number of applications.

```bash
# Check current max memory
kubectl exec -n argocd deployment/argocd-redis -- redis-cli config get maxmemory

# Increase max memory
kubectl exec -n argocd deployment/argocd-redis -- redis-cli config set maxmemory 2gb

# For a persistent fix, update the deployment args:
# --maxmemory=2gb
# Also increase the Kubernetes resource limits to match
kubectl patch deployment argocd-redis -n argocd --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "3Gi"}]'
```

Memory sizing guide: plan for approximately 3-5MB per application and 10-50MB per unique repository.

### Cause 3: Memory Fragmentation

High fragmentation means Redis is using more memory than the data requires.

```bash
# Enable active defragmentation
kubectl exec -n argocd deployment/argocd-redis -- redis-cli config set activedefrag yes

# If fragmentation is severe, restart Redis to defragment
kubectl rollout restart deployment/argocd-redis -n argocd

# Then restart dependent components
kubectl rollout restart deployment/argocd-repo-server -n argocd
kubectl rollout restart deployment/argocd-application-controller -n argocd
```

### Cause 4: Stale Data Accumulation

Old cached data from deleted applications or removed repositories may linger.

```bash
# Flush the Redis cache (ArgoCD will rebuild it)
kubectl exec -n argocd deployment/argocd-redis -- redis-cli flushall

# Restart ArgoCD components to rebuild cache
kubectl rollout restart deployment/argocd-repo-server -n argocd
kubectl rollout restart deployment/argocd-application-controller -n argocd

# Note: This causes a temporary performance dip as caches are rebuilt
```

Flushing Redis is safe because all data in Redis is a cache that ArgoCD can regenerate. The tradeoff is a temporary increase in sync times as manifests are regenerated.

### Cause 5: RDB Snapshot Memory Spike

If Redis is configured with RDB persistence, the fork operation during a snapshot temporarily doubles memory usage.

```bash
# Disable RDB snapshots (recommended for ArgoCD cache-only usage)
kubectl exec -n argocd deployment/argocd-redis -- redis-cli config set save ""

# Disable AOF if enabled
kubectl exec -n argocd deployment/argocd-redis -- redis-cli config set appendonly no
```

ArgoCD's Redis does not need persistence. All data is a regenerable cache.

## Emergency Recovery

If Redis is completely unresponsive or in a crash loop.

```bash
# Step 1: Delete the Redis pod to force a fresh start
kubectl delete pod -n argocd -l app.kubernetes.io/name=argocd-redis

# Step 2: Wait for it to come back
kubectl wait --for=condition=ready pod -n argocd -l app.kubernetes.io/name=argocd-redis --timeout=60s

# Step 3: Configure eviction policy immediately
kubectl exec -n argocd deployment/argocd-redis -- redis-cli config set maxmemory-policy allkeys-lru
kubectl exec -n argocd deployment/argocd-redis -- redis-cli config set maxmemory 2gb

# Step 4: Restart ArgoCD components
kubectl rollout restart deployment/argocd-repo-server -n argocd
kubectl rollout restart deployment/argocd-application-controller -n argocd
kubectl rollout restart deployment/argocd-server -n argocd
```

## Verification

```bash
# Verify Redis is healthy
kubectl exec -n argocd deployment/argocd-redis -- redis-cli ping
# Should return: PONG

# Check memory is within limits
kubectl exec -n argocd deployment/argocd-redis -- redis-cli info memory | grep used_memory_human

# Verify eviction policy is correct
kubectl exec -n argocd deployment/argocd-redis -- redis-cli config get maxmemory-policy
# Should return: allkeys-lru

# Verify ArgoCD is functioning
argocd app list | head -5
argocd app get <test-app> --hard-refresh
```

## Prevention

1. Always set `maxmemory-policy` to `allkeys-lru` for ArgoCD Redis
2. Set `maxmemory` based on your application count (base 256MB + 5MB per app)
3. Set Kubernetes memory limits 50% higher than `maxmemory` to account for overhead and fragmentation
4. Disable RDB persistence since ArgoCD Redis is a pure cache
5. Monitor Redis memory usage and set alerts at 80% of maxmemory
6. Enable active defragmentation to prevent fragmentation buildup

## Escalation

If Redis cannot maintain stable memory usage after tuning:

- Consider migrating to an external managed Redis (ElastiCache, Memorystore)
- Check if a specific application is generating unusually large manifests
- Review whether the number of applications has grown beyond the Redis capacity planning
