# How to Deploy Multiple Source Controller Instances in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Sharding, Source Controller, Scalability

Description: Learn how to deploy multiple Flux source-controller instances to distribute source artifact management across dedicated shards.

---

## Introduction

The source-controller is responsible for fetching artifacts from Git repositories, Helm repositories, OCI registries, and S3-compatible storage. In large-scale deployments with hundreds of sources, a single source-controller instance can become a bottleneck. Deploying multiple instances allows you to distribute this work and improve reconciliation throughput.

## Prerequisites

- A running Kubernetes cluster (v1.25 or later)
- Flux CLI installed (v2.0 or later)
- kubectl configured with cluster access
- Flux bootstrapped on the cluster

## Architecture Overview

When running multiple source-controller instances, each instance needs its own:

- Deployment with a unique name
- Service for artifact serving (each shard serves artifacts at a different address)
- Storage volume for downloaded artifacts
- Label selector to determine which resources it watches

## Step 1: Create the Shard Deployment

Deploy a second source-controller instance with its own label selector.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller-shard-1
  namespace: flux-system
  labels:
    app.kubernetes.io/component: source-controller-shard-1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: source-controller-shard-1
  template:
    metadata:
      labels:
        app: source-controller-shard-1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
    spec:
      containers:
        - name: manager
          image: ghcr.io/fluxcd/source-controller:v1.4.1
          args:
            - --watch-all-namespaces=true
            - --watch-label-selector=sharding.fluxcd.io/key=shard-1
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election=false
            - --storage-path=/data
            - --storage-adv-addr=source-controller-shard-1.flux-system.svc.cluster.local
          ports:
            - containerPort: 9090
              name: http
              protocol: TCP
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
              path: /
              port: http
          volumeMounts:
            - name: data
              mountPath: /data
            - name: tmp
              mountPath: /tmp
          resources:
            limits:
              cpu: 1000m
              memory: 1Gi
            requests:
              cpu: 200m
              memory: 256Mi
      volumes:
        - name: data
          emptyDir: {}
        - name: tmp
          emptyDir: {}
      serviceAccountName: source-controller
```

## Step 2: Create the Shard Service

Each source-controller shard needs its own Service so that downstream controllers can fetch artifacts from it.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: source-controller-shard-1
  namespace: flux-system
  labels:
    app.kubernetes.io/component: source-controller-shard-1
spec:
  type: ClusterIP
  selector:
    app: source-controller-shard-1
  ports:
    - name: http
      port: 80
      targetPort: http
      protocol: TCP
```

## Step 3: Update the Main Source Controller

Configure the main source-controller to exclude sharded resources.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
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
            - --storage-path=/data
            - --storage-adv-addr=source-controller.flux-system.svc.cluster.local
```

## Step 4: Assign Sources to the Shard

Label the source resources that should be handled by the shard.

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-alpha-apps
  namespace: flux-system
  labels:
    sharding.fluxcd.io/key: shard-1
spec:
  interval: 5m
  url: https://github.com/org/team-alpha-apps
  ref:
    branch: main
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: team-alpha-charts
  namespace: flux-system
  labels:
    sharding.fluxcd.io/key: shard-1
spec:
  interval: 30m
  url: https://charts.example.com/team-alpha
```

## Step 5: Configure Downstream Controllers

When using source-controller shards, downstream controllers (kustomize-controller, helm-controller) need to be able to reach the shard's artifact server. The artifact URL in the source status will automatically contain the shard's service address since you set `--storage-adv-addr`.

Verify the artifact URL is correct:

```bash
kubectl get gitrepository team-alpha-apps -n flux-system \
  -o jsonpath='{.status.artifact.url}'
```

The URL should point to `source-controller-shard-1.flux-system.svc.cluster.local`.

## Step 6: Add a NetworkPolicy

If you use network policies, allow traffic from downstream controllers to the shard service.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-source-controller-shard-1
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller-shard-1
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app.kubernetes.io/part-of: flux
      ports:
        - port: 9090
          protocol: TCP
```

## Step 7: Verify the Setup

```bash
# Check all source controller pods
kubectl get pods -n flux-system -l app=source-controller-shard-1

# Verify the shard is serving artifacts
kubectl logs deployment/source-controller-shard-1 -n flux-system --tail=20

# Check artifact availability
curl -s http://source-controller-shard-1.flux-system.svc.cluster.local/
```

## Scaling to More Shards

To add more shards, repeat the process with incremented shard names.

```bash
# Create shard-2, shard-3, etc.
for i in 2 3; do
  sed "s/shard-1/shard-$i/g" source-controller-shard.yaml | kubectl apply -f -
done
```

## Best Practices

- Use persistent volumes for source controller shards that handle large repositories
- Set appropriate resource limits based on the number and size of sources per shard
- Monitor disk usage on each shard since artifacts consume storage
- Keep the `--storage-adv-addr` unique for each shard to prevent artifact conflicts
- Use anti-affinity rules to spread shard pods across different nodes

## Conclusion

Deploying multiple source-controller instances distributes the artifact fetching and serving workload across shards. Each shard operates independently with its own storage and service endpoint, which prevents a single point of contention. This approach is essential for large Flux deployments managing hundreds of Git and Helm sources.
