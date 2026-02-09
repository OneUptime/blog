# How to Implement ArgoCD Sync Waves for Ordered Multi-Resource Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Sync Waves, GitOps, Kubernetes, Deployment Ordering

Description: Learn how to use ArgoCD sync waves and hooks to control the order of resource deployment during synchronization, ensuring dependencies are met and complex applications deploy correctly across multiple phases.

---

Kubernetes applies resources in parallel by default, which breaks deployments when resources depend on each other. You need databases running before applications can connect. Namespaces must exist before you create resources in them. CRDs must be installed before custom resources can be created.

ArgoCD sync waves solve this problem by letting you define the order resources deploy in. This guide shows you how to implement sync waves for reliable, ordered deployments.

## Understanding Sync Waves

Sync waves are phases of deployment defined by the `argocd.argoproj.io/sync-wave` annotation. ArgoCD sorts resources by wave number and deploys them sequentially. Wave 0 deploys first, then wave 1, then wave 2, and so on.

Within each wave, resources deploy in parallel. ArgoCD waits for all resources in a wave to become healthy before moving to the next wave.

## Implementing Basic Sync Waves

Apply sync waves with annotations:

```yaml
# Wave 0: Create namespace first
apiVersion: v1
kind: Namespace
metadata:
  name: production
  annotations:
    argocd.argoproj.io/sync-wave: "0"
---
# Wave 1: Deploy database
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  serviceName: postgres
  replicas: 1
  template:
    spec:
      containers:
      - name: postgres
        image: postgres:15
---
# Wave 1: Database service (same wave as StatefulSet)
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
---
# Wave 2: Deploy application (after database is ready)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: myapi:v1.0
        env:
        - name: DATABASE_HOST
          value: postgres
```

ArgoCD deploys in this order:

1. Wave 0: Namespace created
2. Wave 1: Database StatefulSet and Service deploy and become healthy
3. Wave 2: Application deployment starts after database is ready

## Using Negative Waves for Prerequisites

Negative waves deploy before wave 0:

```yaml
# Wave -3: CRDs
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: certificates.cert-manager.io
  annotations:
    argocd.argoproj.io/sync-wave: "-3"
spec:
  # CRD spec
---
# Wave -2: Operators
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cert-manager
  namespace: cert-manager
  annotations:
    argocd.argoproj.io/sync-wave: "-2"
spec:
  # Operator deployment
---
# Wave -1: Configuration
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  # Issuer configuration
---
# Wave 0: Application resources using certificates
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-tls
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "0"
```

## Implementing Pre and Post Sync Hooks

Hooks run at specific points in the sync process:

```yaml
# PreSync hook: Run database migrations before deployment
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  namespace: production
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: migrate/migrate
        command:
        - migrate
        - -path=/migrations
        - -database=postgresql://postgres:5432/app
        - up
      restartPolicy: Never
---
# PostSync hook: Run smoke tests after deployment
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-tests
  namespace: production
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
      - name: test
        image: curlimages/curl
        command:
        - sh
        - -c
        - |
          curl -f http://api-gateway/health || exit 1
      restartPolicy: Never
```

Hook types:

- `PreSync` - Runs before sync starts
- `Sync` - Runs during normal sync (same as no hook)
- `PostSync` - Runs after all resources are synced
- `SyncFail` - Runs if sync fails
- `Skip` - Resource is ignored

## Combining Sync Waves with Hooks

Use both for complex deployments:

```yaml
# Wave -1, PreSync hook: Initialize secrets
apiVersion: batch/v1
kind: Job
metadata:
  name: init-secrets
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/sync-wave: "-1"
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
      - name: init
        image: vault:latest
        command:
        - vault
        - kv
        - get
        - secret/app
      restartPolicy: Never
---
# Wave 0: Deploy application
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  # Deployment spec
---
# Wave 1, PostSync hook: Verify deployment
apiVersion: batch/v1
kind: Job
metadata:
  name: verify
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/sync-wave: "1"
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
```

## Orchestrating Multi-Tier Applications

Deploy a complete stack with ordering:

```yaml
# Wave -2: Infrastructure
---
apiVersion: v1
kind: Namespace
metadata:
  name: app-stack
  annotations:
    argocd.argoproj.io/sync-wave: "-2"
---
# Wave -1: Storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-pvc
  namespace: app-stack
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 10Gi
---
# Wave 0: Data layer
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: app-stack
  annotations:
    argocd.argoproj.io/sync-wave: "0"
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: app-stack
  annotations:
    argocd.argoproj.io/sync-wave: "0"
---
# Wave 1: Application tier
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: app-stack
  annotations:
    argocd.argoproj.io/sync-wave: "1"
---
# Wave 2: Frontend
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: app-stack
  annotations:
    argocd.argoproj.io/sync-wave: "2"
---
# Wave 3: Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: app-stack
  annotations:
    argocd.argoproj.io/sync-wave: "3"
```

## Handling Hook Failures

Configure hook failure behavior:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: critical-migration
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/sync-wave: "0"
    # Fail sync if hook fails
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  backoffLimit: 3  # Retry 3 times
  template:
    spec:
      containers:
      - name: migrate
        image: migration-tool
      restartPolicy: Never
```

For non-critical hooks:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: optional-task
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/sync-wave: "10"
    # Delete hook regardless of success
    argocd.argoproj.io/hook-delete-policy: HookSucceeded,HookFailed
    # Don't fail sync if this hook fails
    argocd.argoproj.io/sync-options: HookFailed=Ignore
```

## Implementing Blue-Green Deployments with Sync Waves

Use waves to coordinate blue-green cutover:

```yaml
# Wave 0: Deploy green version
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-green
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  selector:
    matchLabels:
      version: green
---
# Wave 1: Test green version
apiVersion: batch/v1
kind: Job
metadata:
  name: test-green
  annotations:
    argocd.argoproj.io/hook: Sync
    argocd.argoproj.io/sync-wave: "1"
---
# Wave 2: Switch traffic to green
apiVersion: v1
kind: Service
metadata:
  name: app-service
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  selector:
    version: green  # Updated selector
---
# Wave 3: Remove blue version
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-blue
  annotations:
    argocd.argoproj.io/sync-wave: "3"
spec:
  replicas: 0  # Scale down
```

## Monitoring Sync Progress

Track sync wave execution:

```bash
# Watch application sync
argocd app get myapp --watch

# View sync status
argocd app sync myapp --dry-run

# Check hook execution
kubectl get jobs -n production -l app.kubernetes.io/instance=myapp
```

View detailed sync information:

```bash
argocd app get myapp -o json | jq '.status.operationState.syncResult'
```

## Debugging Sync Wave Issues

If sync stalls:

```bash
# Check which wave is stuck
argocd app get myapp -o json | jq '.status.operationState.phase'

# View resource health
argocd app get myapp --show-operation

# Check hook logs
kubectl logs -n production job/db-migration
```

Common issues:

- Resource never becomes healthy - Check health status with `kubectl describe`
- Hook job fails - Check job logs and events
- Wrong sync order - Verify wave annotations are correct

## Best Practices

Use consistent wave numbering across applications. Reserve -10 to -1 for infrastructure, 0-9 for data layer, 10-19 for applications, 20+ for post-deployment tasks.

Always set hook-delete-policy to clean up Job resources. BeforeHookCreation deletes previous runs, HookSucceeded cleans up after success.

Test sync waves in development first. Use `argocd app sync --dry-run` to preview execution order.

Keep waves sparse. Use wave 0, 10, 20 instead of 0, 1, 2 to leave room for future additions.

Don't overuse waves. If resources don't depend on each other, let them deploy in parallel for faster syncs.

ArgoCD sync waves provide precise control over deployment ordering, ensuring complex applications with dependencies deploy reliably and consistently every time.
