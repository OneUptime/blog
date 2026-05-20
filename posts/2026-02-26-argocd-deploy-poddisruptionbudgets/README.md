# How to Deploy PodDisruptionBudgets with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, PodDisruptionBudget, High Availability

Description: Learn how to deploy PodDisruptionBudgets with ArgoCD to protect application availability during node maintenance, cluster upgrades, and voluntary disruptions.

---

PodDisruptionBudgets (PDBs) are Kubernetes resources that limit the number of pods that can be voluntarily disrupted at the same time. They protect your application's availability during node drains, cluster upgrades, and autoscaler scale-downs. Without PDBs, a node drain could take down all replicas of a service simultaneously. Managing PDBs through ArgoCD ensures these availability guarantees are consistently applied.

## What PDBs Protect Against

PDBs guard against voluntary disruptions:

- Node drains during maintenance (`kubectl drain`)
- Cluster autoscaler removing underutilized nodes
- Kubernetes version upgrades
- Eviction API based pod removals

PDBs do not block every voluntary action. Directly deleting a pod, deleting a Deployment, or a Deployment rolling update can bypass the PDB, although pods that become unavailable still count against the disruption budget.

PDBs do not protect against involuntary disruptions like node crashes, OOM kills, or hardware failures. For those, you need sufficient replicas and proper resource requests.

## Basic PDB Configuration

Here is a PDB that ensures at least 2 pods of a web application are always running:

```yaml
# apps/myapp/pdb.yaml

apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: myapp
```

Or expressed as maximum unavailable:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: myapp
```

Both approaches work, but they have different behavior when scaling:

- `minAvailable: 2` with 3 replicas allows 1 disruption. With 5 replicas, allows 3 disruptions.
- `maxUnavailable: 1` always allows only 1 disruption regardless of replica count.

## Using Percentages

For applications where the replica count changes (through HPA), use percentages:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
spec:
  maxUnavailable: "25%"
  selector:
    matchLabels:
      app: myapp
```

With 4 replicas, this allows 1 disruption. With 8 replicas, it allows 2. This scales better than absolute numbers.

## Complete Example with Deployment and PDB

Here is a complete application setup with PDB managed through ArgoCD:

```yaml
# apps/myapp/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      # Spread pods across nodes for true HA
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: myapp
      containers:
        - name: myapp
          image: myapp:1.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
---
# apps/myapp/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: myapp
---
# apps/myapp/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
```

## ArgoCD Application Configuration

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops
    targetRevision: main
    path: apps/myapp
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Sync Waves: PDB Before Deployment

Create PDBs before the Deployments they protect:

```yaml
# PDB created first
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: myapp
---
# Deployment created after PDB
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  # ...
```

This ensures the PDB is in place before any pods are created, so they are protected from the start.

## PDB Patterns for Different Workload Types

### Stateless Web Services

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-api-pdb
spec:
  maxUnavailable: "25%"  # Percentage works well with HPA
  selector:
    matchLabels:
      app: web-api
```

### Databases (StatefulSets)

```yaml
# For a 3-node database cluster, always keep quorum
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgres-pdb
spec:
  minAvailable: 2  # Maintain quorum (majority of 3)
  selector:
    matchLabels:
      app: postgres
```

### Queue Workers

```yaml
# Workers can tolerate more disruption
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: worker-pdb
spec:
  maxUnavailable: "50%"
  selector:
    matchLabels:
      app: queue-worker
```

### Single-Instance Services

```yaml
# For services that must always have at least one instance
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: scheduler-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: scheduler
```

Be cautious with `minAvailable` equal to replica count - this blocks all voluntary disruptions, including node drains:

```yaml
# WARNING: This blocks all node drains for pods matching this selector
spec:
  minAvailable: 3  # If replicas is also 3, nothing can be evicted
```

## PDB Interactions with ArgoCD Sync

PDBs can affect ArgoCD operations in a few ways:

1. **Rolling updates**: When ArgoCD applies a Deployment update, the Deployment controller uses the Deployment's rolling update settings such as `maxUnavailable` and `maxSurge`. Pods unavailable during the rollout count against the PDB, but the Deployment controller is not limited by the PDB when it replaces pods.

2. **Concurrent node operations**: If a node drain or autoscaler action is already using the allowed disruption, additional evictions can be blocked until replacement pods become Ready. Automatic sync retries can help with transient failures:

```yaml
spec:
  syncPolicy:
    retry:
      limit: 5
      backoff:
        duration: 30s
        factor: 2
        maxDuration: 10m
```

3. **Health checks**: ArgoCD does not include a built-in health check for PDB status. If you want PDB health to affect Application health, add a custom health check that evaluates fields such as `status.disruptionsAllowed`.

## Monitoring PDB Status

Check PDB status to ensure your availability guarantees are being met:

```bash
# View PDB status
kubectl get pdb -n production

# Output shows:
# NAME        MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS   AGE
# myapp-pdb   N/A            1                  1                     7d
```

The `ALLOWED DISRUPTIONS` column is key. If it is 0, no more pods can be voluntarily evicted.

## Kustomize for Environment-Specific PDBs

```yaml
# base/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: myapp

# overlays/production/pdb-patch.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
spec:
  # Stricter in production
  maxUnavailable: 1

# overlays/staging/pdb-patch.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
spec:
  # More relaxed in staging
  maxUnavailable: "50%"
```

## Common Mistakes

**Mistake 1**: PDB selector does not match any pods.

```yaml
# PDB selects "myapp" but pods are labeled "my-app"
spec:
  selector:
    matchLabels:
      app: myapp  # No pods have this label
```

**Mistake 2**: PDB is too restrictive, blocking cluster operations.

```yaml
# With 2 replicas and minAvailable: 2, nothing can be evicted
spec:
  minAvailable: 2  # Same as replica count - blocks all drains
```

**Mistake 3**: No PDB at all, losing all replicas during a node drain.

Always create PDBs for production workloads with 2 or more replicas.

## PDBs with Unhealthy Pod Eviction

Kubernetes 1.26 introduced the `unhealthyPodEvictionPolicy` field as alpha. It became enabled by default as beta in Kubernetes 1.27 and stable in Kubernetes 1.31. By default, unhealthy pods count toward the PDB. This means a pod stuck in CrashLoopBackOff can block node drains even though it is not serving traffic:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: myapp
  # Allow evicting unhealthy pods even when PDB is at limit
  unhealthyPodEvictionPolicy: AlwaysAllow
```

## Summary

PodDisruptionBudgets are essential for production workloads managed through ArgoCD. They reduce the risk that node maintenance, cluster upgrades, and autoscaler operations take down your services. Use `maxUnavailable` with percentages for scalable protection, create PDBs in earlier sync waves than their associated Deployments, and test that PDBs allow at least one disruption for workloads that need to tolerate node drains. Combined with topology spread constraints and proper replica counts, PDBs give you strong availability guarantees that are enforced through GitOps.
