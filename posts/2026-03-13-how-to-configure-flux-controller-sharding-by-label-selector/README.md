# How to Configure Flux Controller Sharding by Label Selector

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Sharding, Labels, Scalability

Description: Learn how to use label selectors to shard Flux controller workloads across multiple instances for fine-grained control over reconciliation distribution.

---

## Introduction

Label-based sharding gives you flexible control over how Flux distributes reconciliation work. Unlike namespace-based sharding, label selectors let you partition resources within the same namespace across different controller instances. This approach is ideal when you want to shard by application criticality, team ownership, or environment tier rather than by namespace boundaries.

## Prerequisites

- A running Kubernetes cluster (v1.25 or later)
- Flux CLI installed (v2.0 or later)
- kubectl configured with cluster access
- Flux bootstrapped on the cluster

## How Label-Based Sharding Works

Flux controllers support the `--watch-label-selector` flag, which restricts a controller instance to only reconcile resources matching the given label selector. By running multiple controller instances with different label selectors, you distribute the work across shards.

## Step 1: Define Your Sharding Labels

Choose a consistent labeling scheme. The recommended convention uses the `sharding.fluxcd.io/key` label.

```bash
# Label resources for shard assignment
kubectl label kustomization app-frontend \
  sharding.fluxcd.io/key=shard-1 \
  -n flux-system

kubectl label kustomization app-backend \
  sharding.fluxcd.io/key=shard-2 \
  -n flux-system
```

## Step 2: Deploy Shard Controller Instances

Create a controller instance for each shard, configured with the appropriate label selector.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller-shard-1
  namespace: flux-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kustomize-controller-shard-1
  template:
    metadata:
      labels:
        app: kustomize-controller-shard-1
    spec:
      containers:
        - name: manager
          image: ghcr.io/fluxcd/kustomize-controller:v1.4.0
          args:
            - --watch-all-namespaces=true
            - --watch-label-selector=sharding.fluxcd.io/key=shard-1
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election=false
          ports:
            - containerPort: 8080
              name: http-prom
          resources:
            limits:
              cpu: 500m
              memory: 512Mi
            requests:
              cpu: 100m
              memory: 128Mi
      serviceAccountName: kustomize-controller
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller-shard-2
  namespace: flux-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kustomize-controller-shard-2
  template:
    metadata:
      labels:
        app: kustomize-controller-shard-2
    spec:
      containers:
        - name: manager
          image: ghcr.io/fluxcd/kustomize-controller:v1.4.0
          args:
            - --watch-all-namespaces=true
            - --watch-label-selector=sharding.fluxcd.io/key=shard-2
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election=false
          ports:
            - containerPort: 8080
              name: http-prom
          resources:
            limits:
              cpu: 500m
              memory: 512Mi
            requests:
              cpu: 100m
              memory: 128Mi
      serviceAccountName: kustomize-controller
```

## Step 3: Configure the Main Controller to Exclude Sharded Resources

Update the main controller to skip resources that have a shard label assigned.

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
          args:
            - --watch-all-namespaces=true
            - --watch-label-selector=!sharding.fluxcd.io/key
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election
```

The `!sharding.fluxcd.io/key` selector tells the main controller to only reconcile resources that do not have the sharding label set.

## Step 4: Label Your Flux Resources

Apply shard labels to your Kustomization or HelmRelease resources.

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-frontend
  namespace: flux-system
  labels:
    sharding.fluxcd.io/key: shard-1
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./frontend
  prune: true
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-backend
  namespace: flux-system
  labels:
    sharding.fluxcd.io/key: shard-2
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./backend
  prune: true
```

## Step 5: Verify the Configuration

```bash
# Check all controller pods are running
kubectl get pods -n flux-system | grep kustomize-controller

# Verify shard-1 is reconciling its resources
kubectl logs deployment/kustomize-controller-shard-1 -n flux-system --tail=20

# Verify shard-2 is reconciling its resources
kubectl logs deployment/kustomize-controller-shard-2 -n flux-system --tail=20

# Confirm main controller skips sharded resources
kubectl logs deployment/kustomize-controller -n flux-system --tail=20
```

## Advanced Label Selectors

You can use more complex label selectors for flexible sharding strategies.

```bash
# Match multiple values using set-based selectors
--watch-label-selector=sharding.fluxcd.io/key in (shard-1,shard-2)

# Match by environment tier
--watch-label-selector=tier=production

# Combine multiple label requirements
--watch-label-selector=sharding.fluxcd.io/key=shard-1,environment=staging
```

## Best Practices

- Use a consistent labeling convention across all Flux resources
- Keep the main controller as a catch-all for unlabeled resources
- Monitor each shard independently to detect imbalances
- Avoid overlapping label selectors between shard instances
- Document your sharding scheme and keep labels in version control

## Conclusion

Label-based sharding provides fine-grained control over how Flux distributes reconciliation work. It allows you to shard resources within the same namespace and create partitioning strategies based on any criteria you choose. Combined with proper monitoring, this approach scales Flux to handle hundreds or thousands of resources efficiently.
