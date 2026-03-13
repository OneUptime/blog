# How to Deploy Multiple Kustomize Controller Instances in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Sharding, Kustomize Controller, Scalability

Description: Learn how to deploy multiple kustomize-controller instances in Flux to distribute Kustomization reconciliation across dedicated shards.

---

## Introduction

The kustomize-controller reconciles Kustomization resources by building kustomize overlays, applying them to the cluster, performing health checks, and handling garbage collection. In clusters with many Kustomization resources, a single controller instance can become overloaded. Deploying multiple instances distributes this work and reduces reconciliation latency.

## Prerequisites

- A running Kubernetes cluster (v1.25 or later)
- Flux CLI installed (v2.0 or later)
- kubectl configured with cluster access
- Flux bootstrapped on the cluster

## Step 1: Plan Your Sharding Strategy

Determine how to distribute Kustomizations across shards. Common strategies include splitting by team, environment, or application tier.

```bash
# Review current Kustomization count and distribution
kubectl get kustomizations -A --no-headers | wc -l
kubectl get kustomizations -A --no-headers | awk '{print $1}' | sort | uniq -c | sort -rn
```

## Step 2: Deploy the First Shard

Create a kustomize-controller shard that handles resources labeled for shard-1.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller-shard-1
  namespace: flux-system
  labels:
    app.kubernetes.io/component: kustomize-controller-shard-1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kustomize-controller-shard-1
  template:
    metadata:
      labels:
        app: kustomize-controller-shard-1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
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
            - --concurrent=10
            - --requeue-dependency=5s
          ports:
            - containerPort: 8080
              name: http-prom
              protocol: TCP
            - containerPort: 9440
              name: healthz
              protocol: TCP
          livenessProbe:
            httpGet:
              path: /healthz
              port: healthz
          readinessProbe:
            httpGet:
              path: /readyz
              port: healthz
          resources:
            limits:
              cpu: 1000m
              memory: 1Gi
            requests:
              cpu: 200m
              memory: 256Mi
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            runAsNonRoot: true
      serviceAccountName: kustomize-controller
      terminationGracePeriodSeconds: 60
```

## Step 3: Deploy the Second Shard

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller-shard-2
  namespace: flux-system
  labels:
    app.kubernetes.io/component: kustomize-controller-shard-2
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
            - --concurrent=10
            - --requeue-dependency=5s
          ports:
            - containerPort: 8080
              name: http-prom
            - containerPort: 9440
              name: healthz
          livenessProbe:
            httpGet:
              path: /healthz
              port: healthz
          readinessProbe:
            httpGet:
              path: /readyz
              port: healthz
          resources:
            limits:
              cpu: 1000m
              memory: 1Gi
            requests:
              cpu: 200m
              memory: 256Mi
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            runAsNonRoot: true
      serviceAccountName: kustomize-controller
      terminationGracePeriodSeconds: 60
```

## Step 4: Update the Main Controller

Modify the main kustomize-controller to exclude sharded resources.

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
            - --concurrent=10
            - --requeue-dependency=5s
```

## Step 5: Label Kustomization Resources

Assign each Kustomization to a shard.

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha-apps
  namespace: flux-system
  labels:
    sharding.fluxcd.io/key: shard-1
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: team-alpha-repo
  path: ./clusters/production
  prune: true
  timeout: 5m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-beta-apps
  namespace: flux-system
  labels:
    sharding.fluxcd.io/key: shard-2
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: team-beta-repo
  path: ./clusters/production
  prune: true
  timeout: 5m
```

## Step 6: Configure Concurrency Per Shard

Adjust the `--concurrent` flag based on each shard's workload.

```bash
# For a shard handling many small Kustomizations
--concurrent=20

# For a shard handling fewer but larger Kustomizations
--concurrent=5
```

## Step 7: Verify the Deployment

```bash
# Check all kustomize-controller instances
kubectl get pods -n flux-system | grep kustomize-controller

# Verify shard-1 is processing its resources
kubectl logs deployment/kustomize-controller-shard-1 -n flux-system --tail=20

# Check reconciliation status
flux get kustomizations -A --status-selector ready=true
flux get kustomizations -A --status-selector ready=false
```

## Handling Dependencies Across Shards

When Kustomizations have cross-shard dependencies, the dependent resource will wait for the dependency to become ready. The dependency status is stored in the Kubernetes API, so it is visible across all controller instances.

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-config
  namespace: flux-system
  labels:
    sharding.fluxcd.io/key: shard-2
spec:
  dependsOn:
    - name: infrastructure  # This may be on shard-1
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./config
```

## Best Practices

- Set `--concurrent` based on the number of Kustomizations per shard
- Use `terminationGracePeriodSeconds` to allow in-progress reconciliations to complete
- Monitor reconciliation duration per shard to detect overloaded shards
- Keep cross-shard dependencies minimal to reduce latency
- Spread shard pods across nodes using pod anti-affinity rules

## Conclusion

Deploying multiple kustomize-controller instances is a practical way to scale Flux in clusters with many Kustomization resources. Each shard operates independently with its own label selector, reducing reconciliation queue depth and latency. This approach is essential for production environments managing dozens or hundreds of applications through Flux.
