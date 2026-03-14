# How to Configure HPA Based on Memory with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, HPA, Memory, Autoscaling, Kubernetes, GitOps, Horizontal Pod Autoscaler

Description: Learn how to manage Kubernetes Horizontal Pod Autoscaler with memory utilization targets using Flux CD GitOps for memory-based pod autoscaling.

---

## Introduction

While CPU-based HPA is common, some workloads—like JVM applications, in-memory databases, or batch processors—are memory-bound rather than CPU-bound. Memory-based HPA scales pod replicas when average memory utilization exceeds a target percentage. Managing memory-based HPA through Flux CD ensures scaling policies are consistent and auditable.

## Prerequisites

- Kubernetes cluster with metrics-server installed
- Flux CD bootstrapped
- A memory-intensive application Deployment with resource requests defined

## Step 1: Define the Deployment with Memory Requests

Memory requests are mandatory for memory-based HPA:

```yaml
# apps/myapp/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-worker
  namespace: myapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp-worker
  template:
    metadata:
      labels:
        app: myapp-worker
    spec:
      containers:
        - name: worker
          image: your-org/myapp-worker:1.0.0
          resources:
            requests:
              cpu: 100m
              memory: 512Mi  # Memory request required for HPA to calculate utilization
            limits:
              cpu: "1"
              memory: 1Gi
```

## Step 2: Create Memory-Based HPA

```yaml
# apps/myapp/hpa-memory.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-worker-memory
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp-worker
  minReplicas: 2
  maxReplicas: 15
  metrics:
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80  # Scale when avg memory > 80% of request (512Mi)
          # 80% of 512Mi = ~409Mi triggers scaling
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 120  # Memory spikes can be transient; wait 2 min
      policies:
        - type: Pods
          value: 2
          periodSeconds: 120
    scaleDown:
      stabilizationWindowSeconds: 600  # Wait 10 min before scale-down
      # Memory is slow to release; use a longer stabilization window
      policies:
        - type: Pods
          value: 1
          periodSeconds: 300
```

## Step 3: Combine CPU and Memory Metrics

For workloads that need both CPU and memory scaling:

```yaml
# apps/myapp/hpa-combined.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-combined
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  # HPA will scale when EITHER metric exceeds its target
```

## Step 4: Deploy via Flux

```yaml
# clusters/production/apps/myapp-autoscaling.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-autoscaling
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: myapp
```

## Step 5: Verify Memory HPA

```bash
# Check HPA status (look for memory metric)
kubectl get hpa myapp-worker-memory -n myapp
# Shows: TARGETS: 45%/80%   MINPODS: 2   MAXPODS: 15   REPLICAS: 2

# Describe for detailed metric readings
kubectl describe hpa myapp-worker-memory -n myapp

# Check current memory usage
kubectl top pods -n myapp

# Simulate memory pressure (careful in production!)
kubectl run memory-hog --image=polinux/stress --rm -it --restart=Never \
  -n myapp -- stress --vm 1 --vm-bytes 400M --timeout 60s
```

## Best Practices

- Use longer `stabilizationWindowSeconds` for scale-down with memory-based HPA; memory usage decreases slowly as garbage collection runs.
- Test memory-based HPA thoroughly in staging; JVM garbage collection can cause memory spikes that trigger unnecessary scaling.
- Set `averageUtilization` at 75-85% to leave headroom before the limit; scaling takes time during which memory can continue to rise.
- Monitor actual memory usage patterns before setting HPA thresholds; p99 memory usage during peak load is your target.
- Use VPA (Vertical Pod Autoscaler) in recommendation mode alongside memory HPA to right-size the memory request itself.
- Combine with PodDisruptionBudgets to ensure at least one replica remains available during scale-down.

## Conclusion

Memory-based HPA complements CPU-based autoscaling for memory-intensive workloads. Managing HPA resources through Flux CD keeps scaling policies in Git alongside the application definition, providing a complete picture of how the application is expected to behave under load. The longer stabilization windows required for memory scaling reflect the slower dynamics of memory release compared to CPU, which should be tuned based on actual application behavior.
