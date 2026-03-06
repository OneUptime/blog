# How to Fix 'health check failed' Error in Flux CD Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Health Check, Kustomization, Troubleshooting, Kubernetes, GitOps, Readiness

Description: A detailed guide to diagnosing and resolving 'health check failed' errors in Flux CD Kustomization resources caused by pod crashes, readiness probes, and timeouts.

---

## Introduction

Flux CD performs health checks on the resources it deploys to ensure they reach a ready state. When a deployed resource fails to become healthy within the configured timeout, Flux reports a "health check failed" error on the Kustomization. This guide walks you through diagnosing the underlying issue and configuring Flux to handle various scenarios.

## Understanding the Error

The health check failure appears in the Kustomization status:

```bash
# Check Kustomization status
flux get kustomizations -A

# Get detailed error information
kubectl describe kustomization <name> -n flux-system
```

Typical error messages include:

```text
Health check failed after 5m0s: Deployment/my-namespace/my-app: unhealthy
```

```text
Health check failed after 5m0s: timeout waiting for: [Deployment/my-namespace/my-app status: 'InProgress']
```

## Cause 1: Pod CrashLoopBackOff

The most common cause is the deployed pods crashing or failing to start.

### Diagnosing

```bash
# Check the status of pods in the target namespace
kubectl get pods -n <namespace> -l app=<app-name>

# Look for CrashLoopBackOff or Error status
kubectl describe pod <pod-name> -n <namespace>

# Check the pod logs for errors
kubectl logs <pod-name> -n <namespace> --previous
kubectl logs <pod-name> -n <namespace>
```

### Common Causes and Fixes

#### Missing Environment Variables or ConfigMaps

```yaml
# Ensure all required ConfigMaps and Secrets exist before deployment
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
  namespace: my-namespace
data:
  DATABASE_HOST: "db.example.com"
  DATABASE_PORT: "5432"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-namespace
spec:
  replicas: 1
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
          image: my-app:latest
          envFrom:
            - configMapRef:
                name: my-app-config  # Must exist before pod starts
```

#### Image Pull Errors

```bash
# Check for ImagePullBackOff
kubectl get pods -n <namespace> | grep -i "imagepull\|errimagepull"

# Verify the image exists and is accessible
kubectl describe pod <pod-name> -n <namespace> | grep -A5 "Events"
```

Fix by ensuring the image exists and pull secrets are configured:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-namespace
spec:
  template:
    spec:
      # Add image pull secrets if using a private registry
      imagePullSecrets:
        - name: registry-credentials
      containers:
        - name: my-app
          image: my-registry.example.com/my-app:v1.2.3  # Use specific tags
```

## Cause 2: Failing Readiness Probes

Readiness probes that are too strict or misconfigured will prevent the deployment from becoming ready.

### Diagnosing

```bash
# Check the readiness probe configuration
kubectl get deployment <name> -n <namespace> -o jsonpath='{.spec.template.spec.containers[0].readinessProbe}' | jq .

# Check events for probe failures
kubectl describe pod <pod-name> -n <namespace> | grep -i "readiness\|unhealthy"
```

### Fix: Adjust Readiness Probe Settings

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-namespace
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: my-app:v1.2.3
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            # Give the app more time to start
            initialDelaySeconds: 30  # Wait before first check
            periodSeconds: 10        # Check every 10 seconds
            timeoutSeconds: 5        # Timeout for each check
            failureThreshold: 6      # Allow 6 failures before marking unhealthy
            successThreshold: 1      # One success marks as ready
```

### Fix: Adjust Liveness Probe to Prevent Premature Restarts

```yaml
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: my-app:v1.2.3
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            # Liveness should be less aggressive than readiness
            initialDelaySeconds: 60   # Allow startup time
            periodSeconds: 15
            timeoutSeconds: 5
            failureThreshold: 5       # More lenient
          startupProbe:
            httpGet:
              path: /healthz
              port: 8080
            # Startup probe runs first and gives maximum startup time
            periodSeconds: 10
            failureThreshold: 30      # 30 x 10 = 300s max startup
```

## Cause 3: Flux Health Check Timeout Too Short

The default health check timeout in Flux may not be enough for applications that take a long time to start.

### Diagnosing

```bash
# Check the current timeout setting
kubectl get kustomization <name> -n flux-system -o jsonpath='{.spec.timeout}'
```

### Fix: Increase the Timeout

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./deploy/my-app
  sourceRef:
    kind: GitRepository
    name: my-app
  prune: true
  # Increase the timeout for slow-starting applications
  timeout: 10m  # Default is typically 5m
```

For applications with heavy initialization (database migrations, cache warming):

```yaml
spec:
  # Very generous timeout for complex applications
  timeout: 15m
  # Also configure the wait behavior
  wait: true  # Wait for all resources to become ready
```

## Cause 4: Insufficient Resources

Pods may fail to schedule due to insufficient CPU or memory.

### Diagnosing

```bash
# Check for pending pods
kubectl get pods -n <namespace> | grep Pending

# Look for scheduling failures
kubectl describe pod <pod-name> -n <namespace> | grep -A5 "Events"
# Look for: "Insufficient cpu" or "Insufficient memory"

# Check node resource availability
kubectl describe nodes | grep -A5 "Allocated resources"
```

### Fix: Adjust Resource Requests

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-namespace
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: my-app:v1.2.3
          resources:
            requests:
              # Lower requests if the cluster is constrained
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

## Cause 5: Dependent Services Not Available

The application may depend on databases, caches, or other services that are not yet running.

### Diagnosing

```bash
# Check the application logs for connection errors
kubectl logs <pod-name> -n <namespace> | grep -i "connect\|refused\|timeout\|unavailable"
```

### Fix: Use Init Containers to Wait for Dependencies

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-namespace
spec:
  template:
    spec:
      initContainers:
        # Wait for the database to be available
        - name: wait-for-db
          image: busybox:1.36
          command:
            - sh
            - -c
            - |
              until nc -z db-service.my-namespace.svc.cluster.local 5432; do
                echo "Waiting for database..."
                sleep 2
              done
              echo "Database is available"
      containers:
        - name: my-app
          image: my-app:v1.2.3
```

### Fix: Use Flux Dependencies to Order Deployments

```yaml
# Deploy database first
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database
  namespace: flux-system
spec:
  interval: 10m
  path: ./deploy/database
  sourceRef:
    kind: GitRepository
    name: my-app
  prune: true
  timeout: 10m
---
# Deploy application after database is ready
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./deploy/my-app
  sourceRef:
    kind: GitRepository
    name: my-app
  prune: true
  timeout: 10m
  # Wait for the database Kustomization to be ready first
  dependsOn:
    - name: database
```

## Cause 6: Horizontal Pod Autoscaler Conflicts

If an HPA manages the replica count, Flux may fight with it and see mismatched states.

### Diagnosing

```bash
# Check if an HPA is targeting the deployment
kubectl get hpa -n <namespace>
kubectl describe hpa <hpa-name> -n <namespace>
```

### Fix

Remove `replicas` from the Deployment spec when using HPA, and use a kustomize patch:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - hpa.yaml

# Remove replicas field to avoid conflict with HPA
patches:
  - target:
      kind: Deployment
      name: my-app
    patch: |
      - op: remove
        path: /spec/replicas
```

## Disabling Health Checks (Last Resort)

If the health checks are not appropriate for your use case, you can disable them:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./deploy/my-app
  sourceRef:
    kind: GitRepository
    name: my-app
  prune: true
  # Disable waiting for resources to be ready
  wait: false
  # Or selectively disable health checks for specific resources
  healthChecks: []
```

This is not recommended for production workloads since you lose the safety net of knowing your deployment actually succeeded.

## Monitoring Health Check Progress

```bash
# Watch the Kustomization status in real time
flux get kustomization <name> -w

# Watch the deployment rollout
kubectl rollout status deployment/<name> -n <namespace> --timeout=300s

# Check events across the namespace
kubectl events -n <namespace> --types=Warning
```

## Summary

The "health check failed" error means Flux successfully applied your manifests, but the deployed resources did not become healthy in time. The fix almost always involves addressing the underlying Kubernetes issue (crashing pods, failing probes, insufficient resources) rather than changing Flux configuration. Start by checking pod status and logs, then work outward to probe configuration, resource limits, and finally Flux timeout settings.
