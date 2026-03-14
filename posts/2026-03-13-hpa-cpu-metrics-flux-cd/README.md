# How to Configure HPA Based on CPU with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, HPA, CPU, Autoscaling, Kubernetes, GitOps, Horizontal Pod Autoscaler

Description: Learn how to manage Kubernetes Horizontal Pod Autoscaler with CPU utilization targets using Flux CD GitOps for automated pod scaling.

---

## Introduction

The Horizontal Pod Autoscaler (HPA) automatically scales the number of pod replicas based on observed metrics. CPU utilization is the most common HPA trigger: when average CPU usage across pods exceeds the target percentage, the HPA adds replicas to distribute the load. Managing HPA resources through Flux CD ensures scaling policies are version-controlled and consistently applied.

## Prerequisites

- Kubernetes cluster with metrics-server installed
- Flux CD bootstrapped
- A Deployment to scale

## Step 1: Ensure metrics-server is Running

```bash
kubectl get deployment metrics-server -n kube-system
# If not running, install via Flux:
```

```yaml
# infrastructure/metrics-server/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: metrics-server
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: metrics-server
      version: "3.12.x"
      sourceRef:
        kind: HelmRepository
        name: metrics-server
  values:
    args:
      - --kubelet-insecure-tls  # For development; use proper certs in production
```

## Step 2: Define the Application Deployment

```yaml
# apps/myapp/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
spec:
  replicas: 2  # Initial replicas; HPA will override this
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: your-org/myapp:1.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 200m  # Required for HPA CPU metrics to work
              memory: 256Mi
            limits:
              cpu: "1"
              memory: 512Mi
```

## Step 3: Create the HPA Resource

```yaml
# apps/myapp/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2   # Never scale below this
  maxReplicas: 20  # Never scale above this
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70  # Target 70% CPU utilization
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60  # Wait 60s before scaling up again
      policies:
        - type: Pods
          value: 4     # Add at most 4 pods per minute
          periodSeconds: 60
        - type: Percent
          value: 100   # Or double the pods, whichever is smaller
          periodSeconds: 60
      selectPolicy: Min
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 minutes before scaling down
      policies:
        - type: Pods
          value: 2     # Remove at most 2 pods per minute
          periodSeconds: 60
```

## Step 4: Deploy via Flux Kustomization

```yaml
# clusters/production/apps/myapp.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: myapp
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp
      namespace: myapp
```

## Step 5: Handle the HPA-Flux Replica Conflict

When Flux manages a Deployment that is also managed by HPA, Flux may reset replicas to the value in the Git manifest. Add a patch to ignore the `spec.replicas` field:

```yaml
# clusters/production/apps/myapp-ignore-replicas.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  patches:
    - patch: |
        - op: add
          path: /metadata/annotations
          value:
            kustomize.toolkit.fluxcd.io/ssa-ignore: spec.replicas
      target:
        kind: Deployment
        name: myapp
```

Or in Kustomize's strategic merge, set a high replica count as a placeholder that HPA will always override:

```yaml
# In the Deployment, set replicas to match maxReplicas as a safe default
spec:
  replicas: 2  # HPA min replicas - Flux will set this, HPA will change it
```

## Step 6: Verify HPA Operation

```bash
# Check HPA status
kubectl get hpa myapp -n myapp

# Watch HPA scale in real time
kubectl get hpa myapp -n myapp --watch

# Generate CPU load to trigger scaling
kubectl run load-gen --image=busybox:1.36 --rm -it --restart=Never -- \
  sh -c "while true; do wget -q -O- http://myapp.myapp.svc:8080/; done"

# View HPA events
kubectl describe hpa myapp -n myapp

# Check current replica count
kubectl get deployment myapp -n myapp
```

## Best Practices

- Always set CPU resource `requests` on containers; HPA CPU metrics are calculated as a percentage of the request.
- Set `minReplicas >= 2` for production workloads to ensure availability during scaling events.
- Use scale-down `stabilizationWindowSeconds: 300` to prevent rapid scale-down after traffic spikes.
- Set a conservative `maxReplicas` to prevent runaway scaling from consuming all cluster capacity.
- Monitor HPA decisions using `kubectl describe hpa` to understand why scaling was or was not triggered.
- Use PodDisruptionBudgets alongside HPA to ensure availability during scale-down events.

## Conclusion

CPU-based HPA managed through Flux CD provides automatic scaling that responds to real workload demand while maintaining all scaling policy changes in Git. The combination of Flux for desired state management and HPA for dynamic replica adjustment creates a self-regulating deployment that handles both configuration management and operational scaling.
