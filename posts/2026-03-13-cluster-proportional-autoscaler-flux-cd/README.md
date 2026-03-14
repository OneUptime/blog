# Managing Cluster Proportional Autoscaler with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, Autoscaling, Cluster-proportional-autoscaler, GitOps, Helm

Description: Learn how to deploy and manage the Kubernetes Cluster Proportional Autoscaler using Flux CD, enabling automatic scaling of cluster add-ons like CoreDNS in proportion to cluster size.

---

## Introduction

Cluster Proportional Autoscaler (CPA) scales deployments proportionally to the number of nodes or CPU cores in the cluster. Unlike HPA (which scales based on resource utilization) and VPA (which adjusts resource requests), CPA is designed for cluster-level infrastructure components like CoreDNS, that should scale with cluster size rather than individual workload metrics. Managing CPA via Flux CD ensures DNS scaling configuration is version-controlled.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- kubectl and flux CLI
- A deployment to scale proportionally (CoreDNS used as primary example)

## Step 1: Deploy Cluster Proportional Autoscaler via Flux

```yaml
# clusters/production/infrastructure/coredns-cpa.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: cluster-proportional-autoscaler
  namespace: flux-system
spec:
  interval: 1h
  url: https://kubernetes-sigs.github.io/cluster-proportional-autoscaler
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: coredns-autoscaler
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: cluster-proportional-autoscaler
      version: "1.9.x"
      sourceRef:
        kind: HelmRepository
        name: cluster-proportional-autoscaler
  values:
    config:
      linear:
        # Scaling rules: nodes/coresPerReplica or nodes/nodesPerReplica
        coresPerReplica: 256   # 1 CoreDNS replica per 256 CPU cores
        nodesPerReplica: 16    # 1 CoreDNS replica per 16 nodes
        min: 2                 # Minimum CoreDNS replicas
        max: 50               # Maximum CoreDNS replicas
        preventSinglePointOfFailure: true
    options:
      namespace: kube-system
      target: "deployment/coredns"
      nodesSelector: ""  # All nodes
    resources:
      requests:
        cpu: 20m
        memory: 10Mi
      limits:
        cpu: 100m
        memory: 64Mi
```

## Step 2: Alternative: Direct Deployment Without Helm

```yaml
# infrastructure/coredns-autoscaler/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coredns-autoscaler
  namespace: kube-system
  labels:
    k8s-app: coredns-autoscaler
spec:
  selector:
    matchLabels:
      k8s-app: coredns-autoscaler
  template:
    metadata:
      labels:
        k8s-app: coredns-autoscaler
    spec:
      serviceAccountName: coredns-autoscaler
      tolerations:
        - key: CriticalAddonsOnly
          operator: Exists
      containers:
        - name: autoscaler
          image: registry.k8s.io/cpa/cluster-proportional-autoscaler:v1.9.0
          command:
            - /cluster-proportional-autoscaler
            - --namespace=kube-system
            - --configmap=coredns-autoscaler
            - --target=deployment/coredns
            - --logtostderr=true
            - --v=2
          resources:
            requests:
              cpu: 20m
              memory: 10Mi
            limits:
              cpu: 100m
              memory: 64Mi
---
# ConfigMap with scaling policy
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-autoscaler
  namespace: kube-system
data:
  linear: |
    {
      "coresPerReplica": 256,
      "nodesPerReplica": 16,
      "min": 2,
      "max": 50,
      "preventSinglePointOfFailure": true
    }
```

## Step 3: Scale Other Addons

CPA can scale any Deployment. Example for kube-proxy or monitoring agents:

```yaml
# Scale metrics-server proportionally
apiVersion: v1
kind: ConfigMap
metadata:
  name: metrics-server-autoscaler
  namespace: kube-system
data:
  linear: |
    {
      "nodesPerReplica": 50,
      "min": 1,
      "max": 10
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-server-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      k8s-app: metrics-server-autoscaler
  template:
    spec:
      containers:
        - name: autoscaler
          image: registry.k8s.io/cpa/cluster-proportional-autoscaler:v1.9.0
          command:
            - /cluster-proportional-autoscaler
            - --namespace=kube-system
            - --configmap=metrics-server-autoscaler
            - --target=deployment/metrics-server
```

## Step 4: Deploy via Flux with Dependency

```yaml
# clusters/production/infrastructure/cpa-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: coredns-autoscaler
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/coredns-autoscaler
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: kube-system
```

## Step 5: Verify CPA Scaling

```bash
# Check autoscaler is running
kubectl get deployment coredns-autoscaler -n kube-system

# View autoscaler logs
kubectl logs -n kube-system deployment/coredns-autoscaler --tail=30

# Check current CoreDNS replica count
kubectl get deployment coredns -n kube-system

# Simulate cluster growth (by adding nodes) and watch CPA respond
# kubectl get deployment coredns -n kube-system --watch

# Check ConfigMap for current scaling policy
kubectl get configmap coredns-autoscaler -n kube-system -o yaml
```

## Best Practices

- Use CPA for cluster infrastructure components (CoreDNS, metrics-server, cluster-level monitoring agents) and HPA for application workloads.
- Set `min: 2` for CoreDNS to ensure DNS availability during single-node failures.
- Tune `nodesPerReplica` based on your actual DNS query load; the default is a starting point, not a universal value.
- Update the CPA ConfigMap through Flux to track scaling policy changes in Git.
- Monitor CoreDNS CPU and memory after adjusting CPA parameters; the defaults may not be right for workloads with heavy internal DNS traffic.
- Use `preventSinglePointOfFailure: true` to ensure CPA adds a replica when the cluster has only one node.

## Conclusion

Cluster Proportional Autoscaler deployed via Flux CD provides automatic scaling for cluster infrastructure components based on cluster size rather than utilization metrics. For CoreDNS specifically, CPA is the recommended scaling approach because DNS load scales with cluster size (number of pods and services) rather than individual query bursts. Managing CPA configuration through GitOps ensures your cluster's DNS capacity automatically grows with cluster size.
