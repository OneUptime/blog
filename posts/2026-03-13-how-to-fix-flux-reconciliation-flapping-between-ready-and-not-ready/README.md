# How to Fix Flux Reconciliation Flapping Between Ready and Not Ready

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Reconciliation, Flapping, Instability

Description: Resolve Flux Kustomizations or HelmReleases that oscillate between Ready and Not Ready states, causing unstable deployments and alert fatigue.

---

Flapping reconciliation is when a Flux resource alternates between `Ready` and `Not Ready` states across consecutive reconciliation cycles. This creates alert fatigue, makes it hard to trust your deployment status, and may indicate deeper infrastructure instability. This post explains how to identify the flapping pattern and stabilize your reconciliation.

## Symptoms

The Kustomization or HelmRelease status changes back and forth:

```bash
kubectl get events --for kustomization/my-app -n flux-system --sort-by=.lastTimestamp
```

You see alternating patterns of success and failure events. The resource is `Ready` at one moment and `Not Ready` the next, on a repeating cycle.

## Diagnostic Commands

### Watch the status in real time

```bash
watch -n 5 'flux get kustomizations my-app'
```

### Check the condition history

```bash
kubectl get kustomization my-app -n flux-system -o jsonpath='{.status.conditions}' | jq .
```

### Look for intermittent errors in controller logs

```bash
kubectl logs -n flux-system deployment/kustomize-controller --since=2h | grep my-app | grep -E "(error|failed|succeed)"
```

### Check the health of dependent services

```bash
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed
```

## Common Root Causes

### 1. Intermittent health check failures

A pod may be oscillating between healthy and unhealthy due to failing readiness probes, memory pressure, or OOMKills.

```bash
kubectl get pods -n my-app-namespace -w
kubectl describe pod <flapping-pod> -n my-app-namespace
```

### 2. Resource conflicts with other controllers

Another controller (such as an operator, HPA, or VPA) may be modifying resources that Flux manages, causing drift that Flux detects and corrects, triggering the other controller to modify them again.

### 3. Non-deterministic kustomize output

If your kustomize build produces different output on each run (for example, due to random ordering or generated values), Flux will detect changes and re-apply every cycle.

### 4. Transient network issues

If the source repository or container registry is intermittently unreachable, reconciliation alternates between success and timeout.

### 5. Race condition with webhook validation

A webhook that intermittently times out or rejects requests can cause apply to succeed sometimes and fail other times.

## Step-by-Step Fixes

### Fix 1: Stabilize flapping pods

Identify the pod that keeps restarting and fix its health checks:

```bash
kubectl get pods -n my-app-namespace --sort-by='.status.containerStatuses[0].restartCount'
```

Common fixes include increasing resource limits, adjusting readiness probe thresholds, or fixing application startup issues:

```yaml
readinessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 5  # Increase tolerance
```

### Fix 2: Prevent conflicts with other controllers

If an HPA or VPA is modifying fields that Flux manages, tell Flux to ignore those fields using field managers:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  force: false
  patches:
    - target:
        kind: Deployment
        name: my-app
      patch: |
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: my-app
          annotations:
            kustomize.toolkit.fluxcd.io/field-manager: flux-ignore
```

Alternatively, remove the conflicting fields from your Git manifests so Flux does not try to manage them.

### Fix 3: Ensure deterministic kustomize builds

Verify that your kustomize build produces identical output on repeated runs:

```bash
diff <(kustomize build ./my-app/) <(kustomize build ./my-app/)
```

If there are differences, check for generators with random suffixes or variable substitution issues.

### Fix 4: Add retry intervals

Configure retry behavior to handle transient failures without immediate flapping:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  retryInterval: 2m
  timeout: 5m
```

### Fix 5: Investigate and fix webhook issues

Check if admission webhooks are intermittently failing:

```bash
kubectl get validatingwebhookconfigurations -o yaml | grep failurePolicy
```

Set the failure policy to `Ignore` for non-critical webhooks during debugging, or fix the webhook service:

```bash
kubectl get pods -n webhook-namespace
kubectl logs -n webhook-namespace deployment/webhook-server
```

## Prevention Strategies

1. **Separate HPA-managed fields** from Flux-managed manifests. Never set `replicas` in Git if an HPA manages it.
2. **Use robust health checks** in your applications with appropriate thresholds and timeouts.
3. **Monitor flapping with alerts** that detect rapid state changes rather than just failure states.
4. **Test kustomize builds for determinism** in your CI pipeline by building twice and diffing the output.
5. **Use Flux notification alerts** filtered on severity to detect flapping early:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: flapping-detector
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
```

Flapping is always a symptom of a deeper issue. Treat it as a signal to investigate rather than something to suppress, and your GitOps pipeline will be much more reliable.
