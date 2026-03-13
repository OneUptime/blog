# How to Fix Flux Reconciliation Taking Too Long

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Reconciliation, Performance, Optimization

Description: Identify and resolve performance bottlenecks that cause Flux reconciliation to take significantly longer than expected, with tuning strategies for large-scale deployments.

---

Flux reconciliation should typically complete within seconds to a few minutes. When it starts taking ten minutes, thirty minutes, or even longer, something is wrong. Slow reconciliation delays deployments, increases the feedback loop, and can cascade into missed changes. This post walks through how to identify the bottleneck and speed things up.

## Symptoms

Reconciliation completes successfully but takes far longer than expected:

```bash
flux get kustomizations
```

```text
NAME        REVISION              SUSPENDED   READY   MESSAGE
my-app      main@sha1:abc123      False       True    Applied revision: main@sha1:abc123
```

But checking the events reveals each cycle takes 15 or more minutes:

```bash
kubectl events --for kustomization/my-app -n flux-system --sort-by=.lastTimestamp
```

## Diagnostic Commands

### Measure reconciliation duration

```bash
kubectl get kustomization my-app -n flux-system -o jsonpath='{.status.conditions[?(@.type=="Ready")].lastTransitionTime}'
```

### Check Flux controller resource usage

```bash
kubectl top pods -n flux-system
```

### Check source fetch times

```bash
kubectl get gitrepository my-repo -n flux-system -o jsonpath='{.status.artifact.lastUpdateTime}'
```

### Review controller metrics

```bash
kubectl port-forward -n flux-system deployment/kustomize-controller 8080:8080
curl -s localhost:8080/metrics | grep reconcile_duration
```

## Common Root Causes

### 1. Large Git repository

If your Git repository contains thousands of files, large binary assets, or extensive history, every fetch takes a long time.

### 2. Too many resources in a single Kustomization

A Kustomization that manages hundreds of resources takes longer to build, apply, and health-check.

### 3. Server-side apply with many conflicts

When Flux uses server-side apply and there are field manager conflicts, each apply operation requires additional processing.

### 4. Health checks on slow-starting resources

Waiting for pods with long initialization times (database migrations, large downloads) extends the reconciliation window.

### 5. Controller resource constraints

The Flux controllers themselves may be CPU or memory starved, throttling their processing speed.

## Step-by-Step Fixes

### Fix 1: Optimize Git repository size

Use shallow clones by configuring the GitRepository ignore rules:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  url: https://github.com/org/repo
  ref:
    branch: main
  ignore: |
    # Exclude non-essential files
    /*
    !/kubernetes/
    !/base/
```

### Fix 2: Split large Kustomizations

Break a monolithic Kustomization into smaller, focused ones:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra-controllers
  namespace: flux-system
spec:
  path: ./infrastructure/controllers
  interval: 10m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra-configs
  namespace: flux-system
spec:
  path: ./infrastructure/configs
  interval: 10m
  dependsOn:
    - name: infra-controllers
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  path: ./apps
  interval: 5m
  dependsOn:
    - name: infra-configs
```

### Fix 3: Increase controller resources

Give the Flux controllers more CPU and memory:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 2Gi
```

Or patch via Flux's own kustomization:

```bash
flux install --components-extra=image-reflector-controller,image-automation-controller \
  --patch='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "2Gi"}]' \
  --export > gotk-components.yaml
```

### Fix 4: Tune reconciliation intervals

Not every Kustomization needs to reconcile every minute. Set longer intervals for stable infrastructure:

```yaml
spec:
  interval: 30m  # For stable infrastructure
  retryInterval: 5m  # Retry faster on failures
```

### Fix 5: Optimize health checks

Use targeted health checks with appropriate timeouts instead of waiting for everything:

```yaml
spec:
  wait: false
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: critical-app
      namespace: production
```

### Fix 6: Enable concurrent reconciliation

Increase the number of concurrent reconciliations the controller can handle:

```bash
flux install --components-extra=image-reflector-controller,image-automation-controller \
  --set="kustomize-controller.concurrent=10" \
  --set="source-controller.concurrent=10"
```

Or edit the controller deployment directly:

```bash
kubectl edit deployment kustomize-controller -n flux-system
```

Add the `--concurrent` flag:

```yaml
containers:
  - args:
      - --concurrent=10
```

## Prevention Strategies

1. **Monitor reconciliation metrics** using the Prometheus metrics exposed by Flux controllers. Set up alerts for reconciliation duration.
2. **Keep Git repositories lean** by separating application code from deployment manifests.
3. **Right-size your Kustomizations** with a target of fewer than 50 resources per Kustomization.
4. **Profile periodically** by checking controller resource usage and reconciliation times as your cluster grows.
5. **Use separate GitRepositories** for different teams or environments to parallelize fetching.

Keeping reconciliation fast is essential for a responsive GitOps workflow. Regular profiling and splitting as you grow will prevent slowdowns from becoming bottlenecks.
