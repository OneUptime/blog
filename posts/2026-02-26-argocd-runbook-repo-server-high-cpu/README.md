# ArgoCD Runbook: Repo Server High CPU

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Runbook, Troubleshooting

Description: A step-by-step operational runbook for diagnosing and resolving high CPU usage on the ArgoCD repo server, covering Helm chart rendering, large repos, and manifest generation bottlenecks.

---

High CPU on the ArgoCD repo server causes slow manifest generation, delayed syncs, and sometimes complete sync failures with timeout errors. Because the repo server is responsible for generating manifests for every application, high CPU on this component creates a cascading effect across all managed applications. This runbook walks through diagnosis and resolution.

## Symptoms

- Sync operations take much longer than usual
- Applications show "ComparisonError" with "context deadline exceeded" messages
- The repo server pod shows consistently high CPU usage (>80% of limits)
- ArgoCD UI shows applications as "Unknown" or stuck in "Progressing"
- Prometheus metric `argocd_repo_server_request_duration_seconds` is elevated

## Impact Assessment

**Severity:** P2

**Impact:** All applications experience delayed syncs. New deployments take longer to roll out. If CPU is maxed out, some applications may fail to sync entirely.

## Diagnostic Steps

### Step 1: Confirm High CPU

```bash
# Check current CPU usage
kubectl top pods -n argocd -l app.kubernetes.io/name=argocd-repo-server

# Check CPU limits
kubectl get deployment argocd-repo-server -n argocd \
  -o jsonpath='{.spec.template.spec.containers[0].resources}' | jq .

# Check if the pod is being CPU-throttled
# Look for high throttled_periods_total
kubectl exec -n argocd deployment/argocd-repo-server -- cat /sys/fs/cgroup/cpu/cpu.stat 2>/dev/null || \
kubectl exec -n argocd deployment/argocd-repo-server -- cat /sys/fs/cgroup/cpu.stat 2>/dev/null
```

### Step 2: Identify What Is Consuming CPU

```bash
# Check repo server logs for active operations
kubectl logs -n argocd deployment/argocd-repo-server --tail=200

# Look for manifest generation activity
kubectl logs -n argocd deployment/argocd-repo-server --tail=500 | grep -i "generating\|helm\|kustomize\|clone"

# Check how many concurrent requests are being processed
kubectl logs -n argocd deployment/argocd-repo-server --tail=500 | grep -c "generating manifests"
```

### Step 3: Identify Expensive Applications

Some applications are much more expensive to generate manifests for than others. Large Helm charts with many dependencies are the most common culprits.

```bash
# Check Prometheus for the slowest repos
# argocd_repo_server_request_duration_seconds_sum by (repo)
# Sort by highest total duration

# Alternatively, check logs for long-running operations
kubectl logs -n argocd deployment/argocd-repo-server --tail=1000 | grep "duration" | sort -t= -k2 -rn | head -20
```

### Step 4: Check for Cache Misses

High CPU often correlates with high cache miss rates. If the cache is not working, manifests are regenerated repeatedly.

```bash
# Check Redis connectivity
kubectl exec -n argocd deployment/argocd-redis -- redis-cli ping

# Check Redis memory usage (if full, eviction causes cache misses)
kubectl exec -n argocd deployment/argocd-redis -- redis-cli info memory | grep used_memory_human

# Check for evictions
kubectl exec -n argocd deployment/argocd-redis -- redis-cli info stats | grep evicted_keys
```

### Step 5: Check for Concurrent Reconciliation Storm

If many applications refresh at the same time (for example, after a webhook for a shared repository), the repo server gets overwhelmed.

```bash
# Check how many applications use the same repo
argocd app list -o json | jq '[.items[].spec.source.repoURL] | group_by(.) | map({repo: .[0], count: length}) | sort_by(.count) | reverse | .[0:10]'

# A repo used by 100+ applications will cause a CPU spike on every webhook
```

## Root Causes and Resolutions

### Cause 1: Complex Helm Charts

Large Helm charts with many dependencies and templates are CPU-intensive to render.

```bash
# Check Helm chart complexity
# How many templates does the chart have?
argocd app manifests my-app --source live | wc -l

# Immediate mitigation: increase CPU limits
kubectl patch deployment argocd-repo-server -n argocd --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/cpu", "value": "4"}]'
```

Long-term fix: pre-build Helm dependencies in CI.

```bash
# In your CI pipeline
cd charts/my-app
helm dependency build
git add Chart.lock charts/
git commit -m "Pre-build Helm dependencies"
git push
```

### Cause 2: Too Many Concurrent Requests

The repo server processes all incoming requests simultaneously by default.

```bash
# Set a parallelism limit to prevent overload
kubectl patch deployment argocd-repo-server -n argocd --type='json' \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--parallelism-limit=10"}]'
```

This queues excess requests instead of processing them all at once, preventing CPU saturation.

### Cause 3: Not Enough Replicas

A single repo server handling 200+ applications will always be under pressure.

```bash
# Scale up repo server replicas
kubectl scale deployment argocd-repo-server -n argocd --replicas=3

# Verify pods are running
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-repo-server
```

### Cause 4: Cache Not Working

If Redis is down or full, every request triggers a full manifest generation.

```bash
# Check Redis health
kubectl exec -n argocd deployment/argocd-redis -- redis-cli ping

# If Redis is full, increase memory
kubectl exec -n argocd deployment/argocd-redis -- redis-cli config set maxmemory 2gb

# Restart Redis to clear corrupted state
kubectl rollout restart deployment/argocd-redis -n argocd
```

### Cause 5: Large Repository Clones

Cloning large repositories is CPU-intensive due to decompression.

```bash
# Check if cloning is the bottleneck
kubectl logs -n argocd deployment/argocd-repo-server --tail=200 | grep "clone\|fetch"

# Immediate fix: use RAM-backed tmpfs
kubectl patch deployment argocd-repo-server -n argocd --type='json' \
  -p='[{
    "op": "replace",
    "path": "/spec/template/spec/volumes",
    "value": [{"name": "tmp", "emptyDir": {"medium": "Memory", "sizeLimit": "10Gi"}}]
  }]'
```

### Cause 6: Webhook Storm

A push to a repository used by many applications triggers manifest generation for all of them simultaneously.

```bash
# Check recent webhook activity
kubectl logs -n argocd deployment/argocd-server --tail=200 | grep "webhook"

# Temporary mitigation: increase reconciliation interval to spread load
kubectl patch configmap argocd-cm -n argocd --type merge \
  -p='{"data":{"timeout.reconciliation":"300"}}'
```

Long-term fix: split the monorepo or stagger application refresh schedules.

## Verification

After applying fixes, verify CPU has stabilized.

```bash
# Monitor CPU over a few minutes
watch kubectl top pods -n argocd -l app.kubernetes.io/name=argocd-repo-server

# Verify manifests are being generated successfully
argocd app get <test-app-name> --hard-refresh

# Check that sync times have improved
argocd app sync <test-app-name>

# Verify no timeout errors
kubectl logs -n argocd deployment/argocd-repo-server --tail=100 | grep -c "deadline exceeded"
# Should be 0
```

## Prevention

1. Set CPU requests and limits appropriately for your workload
2. Run at least 2 repo server replicas in production
3. Set `--parallelism-limit` to prevent CPU saturation
4. Pre-build Helm dependencies in CI pipelines
5. Monitor `argocd_repo_server_request_duration_seconds` and alert when it exceeds thresholds
6. For repos used by many applications, consider pre-rendering manifests

## Escalation

If CPU remains high after scaling up and setting parallelism limits:

- Collect a CPU profile: `kubectl exec -n argocd deployment/argocd-repo-server -- curl localhost:8084/debug/pprof/profile?seconds=30 > cpu-profile.pprof`
- Check ArgoCD GitHub issues for known performance regressions
- Consider upgrading ArgoCD if running an older version with known performance bugs
