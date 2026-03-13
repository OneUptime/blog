# How to Configure Flux Controller Sharding by Resource Type

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Sharding, Resource Types, Scalability

Description: Learn how to shard Flux controllers by resource type to dedicate controller instances to specific Flux custom resources for optimized performance.

---

## Introduction

Resource-type sharding in Flux dedicates separate controller instances to handle specific Flux custom resource types. For example, one controller instance handles only GitRepository sources while another handles only HelmRepository sources. This strategy works well when certain resource types have significantly different reconciliation patterns or volumes.

## Prerequisites

- A running Kubernetes cluster (v1.25 or later)
- Flux CLI installed (v2.0 or later)
- kubectl configured with cluster access
- Flux bootstrapped on the cluster

## When to Use Resource-Type Sharding

Resource-type sharding is most useful when:

- You have a large number of HelmRelease resources that overwhelm the helm-controller
- Your GitRepository sources are numerous and have frequent commit activity
- Different resource types have different reconciliation intervals and performance profiles
- You want to isolate failures so that one resource type does not affect another

## Step 1: Identify Resource Type Distribution

Before sharding, understand your current resource distribution.

```bash
# Count Flux resources by type
echo "GitRepositories: $(kubectl get gitrepositories -A --no-headers | wc -l)"
echo "HelmRepositories: $(kubectl get helmrepositories -A --no-headers | wc -l)"
echo "Kustomizations: $(kubectl get kustomizations -A --no-headers | wc -l)"
echo "HelmReleases: $(kubectl get helmreleases -A --no-headers | wc -l)"
echo "OCIRepositories: $(kubectl get ocirepositories -A --no-headers | wc -l)"
```

## Step 2: Deploy a Dedicated Source Controller for Git Sources

Create a source-controller instance that only handles GitRepository resources by using label selectors.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller-git
  namespace: flux-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: source-controller-git
  template:
    metadata:
      labels:
        app: source-controller-git
    spec:
      containers:
        - name: manager
          image: ghcr.io/fluxcd/source-controller:v1.4.1
          args:
            - --watch-all-namespaces=true
            - --watch-label-selector=sharding.fluxcd.io/resource-type=git
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election=false
            - --storage-path=/data
            - --storage-adv-addr=source-controller-git.flux-system.svc.cluster.local
          ports:
            - containerPort: 9090
              name: http
            - containerPort: 8080
              name: http-prom
          volumeMounts:
            - name: data
              mountPath: /data
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
      serviceAccountName: source-controller
```

## Step 3: Deploy a Dedicated Source Controller for Helm Sources

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller-helm
  namespace: flux-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: source-controller-helm
  template:
    metadata:
      labels:
        app: source-controller-helm
    spec:
      containers:
        - name: manager
          image: ghcr.io/fluxcd/source-controller:v1.4.1
          args:
            - --watch-all-namespaces=true
            - --watch-label-selector=sharding.fluxcd.io/resource-type=helm
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election=false
            - --storage-path=/data
            - --storage-adv-addr=source-controller-helm.flux-system.svc.cluster.local
          ports:
            - containerPort: 9090
              name: http
            - containerPort: 8080
              name: http-prom
          volumeMounts:
            - name: data
              mountPath: /data
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
      serviceAccountName: source-controller
```

## Step 4: Create Services for Each Shard

Each source controller shard needs its own Service for artifact serving.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: source-controller-git
  namespace: flux-system
spec:
  selector:
    app: source-controller-git
  ports:
    - name: http
      port: 80
      targetPort: 9090
---
apiVersion: v1
kind: Service
metadata:
  name: source-controller-helm
  namespace: flux-system
spec:
  selector:
    app: source-controller-helm
  ports:
    - name: http
      port: 80
      targetPort: 9090
```

## Step 5: Label Resources by Type

```bash
# Label GitRepository resources
kubectl label gitrepository my-app-repo \
  sharding.fluxcd.io/resource-type=git \
  -n flux-system

# Label HelmRepository resources
kubectl label helmrepository bitnami \
  sharding.fluxcd.io/resource-type=helm \
  -n flux-system
```

## Step 6: Update the Main Source Controller

Configure the main source controller to skip resources handled by shards.

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
            - --watch-label-selector=!sharding.fluxcd.io/resource-type
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election
            - --storage-path=/data
            - --storage-adv-addr=source-controller.flux-system.svc.cluster.local
```

## Step 7: Verify the Setup

```bash
# Check all source controller instances
kubectl get pods -n flux-system | grep source-controller

# Verify each shard is reconciling the correct resource types
kubectl logs deployment/source-controller-git -n flux-system --tail=10
kubectl logs deployment/source-controller-helm -n flux-system --tail=10
```

## Best Practices

- Monitor memory usage per shard since different resource types have different memory profiles
- Git sources typically need more storage and network resources than Helm sources
- OCI sources can be grouped with either Git or Helm depending on volume
- Use dedicated persistent volumes for high-throughput source shards
- Keep the main controller as a fallback for unlabeled resources

## Conclusion

Sharding Flux controllers by resource type lets you optimize each instance for its specific workload characteristics. Git sources, Helm repositories, and OCI sources each have different resource needs and reconciliation patterns, and dedicated instances allow you to tune each one independently. This approach is particularly valuable in clusters with hundreds of source objects.
