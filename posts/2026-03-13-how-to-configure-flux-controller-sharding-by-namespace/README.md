# How to Configure Flux Controller Sharding by Namespace

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Sharding, Namespace, Scalability

Description: Learn how to configure Flux controller sharding by namespace to distribute reconciliation workloads across multiple controller instances for improved scalability.

---

## Introduction

As your Kubernetes fleet grows, a single Flux controller instance can become a bottleneck. Namespace-based sharding allows you to partition reconciliation work across multiple controller instances, where each shard is responsible for resources in specific namespaces. This approach is straightforward and maps naturally to multi-tenant cluster architectures.

## Prerequisites

Before configuring namespace-based sharding, ensure you have the following in place:

- A running Kubernetes cluster (v1.25 or later)
- Flux CLI installed (v2.0 or later)
- kubectl configured with cluster access
- Flux bootstrapped on the cluster

## Understanding Namespace-Based Sharding

In namespace-based sharding, each controller instance watches only the namespaces assigned to it. This is achieved by setting the `--watch-all-namespaces=false` flag and specifying the target namespace for each shard instance.

The main controller continues to handle resources in namespaces that are not assigned to any shard, while dedicated shard instances handle their assigned namespaces.

## Step 1: Create a Shard Controller Deployment

Create a new deployment for the shard controller. This example creates a shard for the kustomize-controller that watches a specific namespace.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller-shard-alpha
  namespace: flux-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kustomize-controller-shard-alpha
  template:
    metadata:
      labels:
        app: kustomize-controller-shard-alpha
    spec:
      containers:
        - name: manager
          image: ghcr.io/fluxcd/kustomize-controller:v1.4.0
          args:
            - --watch-all-namespaces=false
            - --watch-namespace=team-alpha
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

## Step 2: Configure RBAC for the Shard

Ensure the shard controller has the necessary permissions in its target namespace.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: kustomize-controller-shard-alpha
  namespace: team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kustomize-controller
subjects:
  - kind: ServiceAccount
    name: kustomize-controller
    namespace: flux-system
```

## Step 3: Configure the Main Controller

Update the main kustomize-controller to exclude the sharded namespace so that reconciliation is not duplicated.

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

## Step 4: Label Resources for Shard Assignment

Apply a shard label to the Kustomization resources that should be handled by the shard controller.

```bash
kubectl label kustomization my-app \
  sharding.fluxcd.io/key=shard-alpha \
  -n team-alpha
```

## Step 5: Verify the Sharding Configuration

Confirm that the shard controller is running and reconciling resources in its assigned namespace.

```bash
# Check shard controller pods
kubectl get pods -n flux-system -l app=kustomize-controller-shard-alpha

# Check reconciliation status in the sharded namespace
flux get kustomizations -n team-alpha

# Verify main controller is not reconciling sharded resources
kubectl logs deployment/kustomize-controller -n flux-system | grep team-alpha
```

## Multiple Namespace Shards

You can create multiple shards, each watching different namespaces. Here is an example with two shards.

```yaml
# Shard for team-beta namespace
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller-shard-beta
  namespace: flux-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kustomize-controller-shard-beta
  template:
    metadata:
      labels:
        app: kustomize-controller-shard-beta
    spec:
      containers:
        - name: manager
          image: ghcr.io/fluxcd/kustomize-controller:v1.4.0
          args:
            - --watch-all-namespaces=false
            - --watch-namespace=team-beta
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election=false
          resources:
            limits:
              cpu: 500m
              memory: 512Mi
            requests:
              cpu: 100m
              memory: 128Mi
      serviceAccountName: kustomize-controller
```

## Best Practices

- Keep the main controller as a fallback for namespaces without dedicated shards
- Monitor each shard instance independently using Prometheus metrics
- Use resource limits appropriate for the expected workload per shard
- Disable leader election on shard instances since each runs as a single replica
- Document the namespace-to-shard mapping for your team

## Conclusion

Namespace-based sharding is an effective way to scale Flux controllers in large clusters. By distributing reconciliation work across dedicated controller instances per namespace, you reduce the load on any single controller and improve overall reconciliation throughput. This approach works especially well in multi-tenant environments where namespaces naturally map to teams or applications.
