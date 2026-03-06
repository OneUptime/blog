# How to Fix "timeout waiting for ready condition" Error in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Timeout, Health Checks, Troubleshooting, Kubernetes, GitOps, Deployments

Description: A comprehensive guide to diagnosing and resolving timeout errors in Flux CD when resources take too long to become ready, covering timeout configuration, resource constraints, and deployment issues.

---

## Introduction

The "timeout waiting for ready condition" error occurs when Flux CD applies resources to your cluster, but those resources do not reach a healthy state within the configured timeout period. This is a downstream problem -- Flux successfully applies the manifests, but the resulting workloads fail to start or stabilize. This guide covers how to diagnose the root cause and configure appropriate timeouts.

## Identifying the Error

Check the Kustomization or HelmRelease status:

```bash
# Check all Kustomizations
kubectl get kustomizations -A

# Get the detailed error
kubectl describe kustomization <name> -n flux-system
```

The error typically looks like:

```
Status:
  Conditions:
    - Type: Ready
      Status: "False"
      Reason: HealthCheckFailed
      Message: "Health check failed after 5m0s timeout: deployment 'my-app/my-app'
        not ready: 0/3 pods are ready"
```

For HelmReleases:

```bash
kubectl describe helmrelease <name> -n flux-system
```

```
Message: "timeout waiting for ready condition on deployments/my-app"
```

## Cause 1: Default Timeout Too Short

Flux CD Kustomizations have a default timeout of 5 minutes. For large deployments, complex initialization, or clusters with limited resources, this may not be enough.

### Fix: Increase the Kustomization Timeout

```yaml
# kustomization-extended-timeout.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Increase timeout from default 5m to 15m
  timeout: 15m
  # Also set a retry interval for transient failures
  retryInterval: 2m
```

### Fix: Increase the HelmRelease Timeout

```yaml
# helmrelease-extended-timeout.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-charts
  # Increase install timeout
  install:
    timeout: 15m
    remediation:
      retries: 3
  # Increase upgrade timeout
  upgrade:
    timeout: 15m
    remediation:
      retries: 3
```

## Cause 2: Pods Failing to Start

The most common reason for timeouts is that the pods themselves cannot start. This can be due to image pull failures, crash loops, or resource constraints.

### Diagnosing Pod Issues

```bash
# Check pod status in the target namespace
kubectl get pods -n my-app

# Look at events for failing pods
kubectl describe pod <pod-name> -n my-app

# Check for image pull errors
kubectl get events -n my-app --sort-by='.lastTimestamp' | grep -i "pull\|image\|fail"

# Check for crash loops
kubectl logs <pod-name> -n my-app --previous
```

### Fix: Image Pull Issues

If the image cannot be pulled:

```yaml
# deployment-with-pull-secret.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      # Add image pull secrets for private registries
      imagePullSecrets:
        - name: registry-credentials
      containers:
        - name: my-app
          image: registry.example.com/my-app:v1.0.0
          # Use a specific tag, not latest
          imagePullPolicy: IfNotPresent
```

Create the pull secret:

```bash
# Create registry credentials secret
kubectl create secret docker-registry registry-credentials \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  -n my-app
```

### Fix: Resource Constraints

If pods are pending due to insufficient cluster resources:

```bash
# Check node resource utilization
kubectl top nodes

# Check pending pods and their resource requests
kubectl get pods -n my-app -o wide --field-selector=status.phase=Pending

# Check events for scheduling failures
kubectl get events -n my-app | grep -i "insufficient\|unschedulable\|FailedScheduling"
```

Adjust resource requests to fit available capacity:

```yaml
# deployment-adjusted-resources.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:v1.0.0
          resources:
            # Reduce requests if the cluster is resource-constrained
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 256Mi
```

## Cause 3: Slow Readiness Probes

If your application takes a long time to start (JVM warmup, database migrations, cache loading), the readiness probe may fail until the app is ready, causing Flux to time out.

### Fix: Configure Startup Probes

Use startup probes for slow-starting applications instead of extending the readiness probe:

```yaml
# deployment-with-startup-probe.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:v1.0.0
          ports:
            - containerPort: 8080
          # Startup probe allows up to 5 minutes for the app to start
          # (30 * 10 seconds = 300 seconds)
          startupProbe:
            httpGet:
              path: /healthz
              port: 8080
            failureThreshold: 30
            periodSeconds: 10
          # Readiness probe runs after startup probe succeeds
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 3
          # Liveness probe detects stuck processes
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 15
            failureThreshold: 3
```

## Cause 4: PersistentVolumeClaim Pending

StatefulSets and Deployments with PVCs will not become ready if the PVC cannot be bound to a PersistentVolume.

### Diagnosing PVC Issues

```bash
# Check PVC status
kubectl get pvc -n my-app

# Get PVC events
kubectl describe pvc <pvc-name> -n my-app

# Check available storage classes
kubectl get storageclass

# Check PV availability
kubectl get pv
```

### Fix: Ensure Storage Class Exists

```yaml
# pvc-with-storageclass.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-app-data
  namespace: my-app
spec:
  accessModes:
    - ReadWriteOnce
  # Use a storage class that exists in your cluster
  storageClassName: standard
  resources:
    requests:
      # Ensure the size is available
      storage: 10Gi
```

## Cause 5: Dependencies Not Ready

If your application depends on external services (databases, message queues) that are not yet available, it may fail health checks and cause timeouts.

### Fix: Use Init Containers to Wait for Dependencies

```yaml
# deployment-with-init-container.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      initContainers:
        # Wait for the database to be available
        - name: wait-for-db
          image: busybox:1.36
          command:
            - sh
            - -c
            - |
              echo "Waiting for database..."
              until nc -z postgres-service.database.svc.cluster.local 5432; do
                echo "Database not ready, retrying in 5 seconds..."
                sleep 5
              done
              echo "Database is ready"
      containers:
        - name: my-app
          image: my-app:v1.0.0
```

### Fix: Use Flux Dependencies for Service Ordering

```yaml
# clusters/my-cluster/database.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/database
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: postgres
      namespace: database
  timeout: 10m
```

```yaml
# clusters/my-cluster/my-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Wait for database to be healthy
  dependsOn:
    - name: database
  timeout: 10m
```

## Cause 6: Deployment Strategy Blocking Rollout

A RollingUpdate strategy with maxUnavailable=0 requires new pods to be ready before old ones are terminated. If new pods cannot start (resource contention with old pods), the rollout stalls.

### Fix: Adjust Deployment Strategy

```yaml
# deployment-adjusted-strategy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      # Allow 1 pod to be unavailable during update
      maxUnavailable: 1
      # Create at most 1 extra pod during update
      maxSurge: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:v1.0.0
```

## Quick Troubleshooting Commands

```bash
# 1. Check what is not ready
kubectl get kustomization <name> -n flux-system -o jsonpath='{.status.conditions[0].message}'

# 2. Check pod status in the target namespace
kubectl get pods -n <namespace> -o wide

# 3. Check events for the namespace
kubectl get events -n <namespace> --sort-by='.lastTimestamp' | tail -20

# 4. Check deployment rollout status
kubectl rollout status deployment/<name> -n <namespace>

# 5. Describe the stuck deployment
kubectl describe deployment <name> -n <namespace>

# 6. Check node resources
kubectl top nodes

# 7. Check PVC status
kubectl get pvc -n <namespace>

# 8. Force reconciliation with extended timeout
flux reconcile kustomization <name> --with-source --timeout=15m
```

## Summary

The "timeout waiting for ready condition" error in Flux CD means that applied resources did not reach a healthy state in time. The fix depends on the underlying cause: increase Flux timeout values for legitimately slow deployments, fix image pull issues, adjust resource requests for constrained clusters, configure startup probes for slow-starting applications, ensure PVCs can bind to storage, and set up proper dependency ordering for services that depend on each other. Always investigate the pod-level events and logs first, as the timeout is a symptom rather than the root cause.
