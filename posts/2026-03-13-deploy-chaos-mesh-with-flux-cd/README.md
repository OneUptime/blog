# How to Deploy Chaos Mesh with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Chaos Engineering, Chaos Mesh

Description: Deploy the Chaos Mesh fault injection platform to Kubernetes using Flux CD HelmRelease for declarative, version-controlled chaos testing.

---

## Introduction

Chaos Mesh is a cloud-native chaos engineering platform that provides fine-grained chaos injection capabilities for Kubernetes workloads. It supports pod chaos, network chaos, IO chaos, stress chaos, and more - all defined as Kubernetes custom resources. Because everything in Chaos Mesh is a CRD, it pairs naturally with Flux CD's GitOps reconciliation model.

Deploying Chaos Mesh through Flux CD means your chaos testing infrastructure is treated the same way as your production applications: declared in Git, automatically applied to the cluster, and continuously reconciled. This removes the manual step of running `helm install` and ensures every cluster in your fleet can have a consistent chaos testing capability.

This tutorial walks you through deploying Chaos Mesh using a Flux HelmRelease, exposing its dashboard, and committing your first PodChaos experiment to Git.

## Prerequisites

- Kubernetes cluster (1.24+) with Flux CD bootstrapped
- `flux` and `kubectl` CLI tools available
- Git repository connected to Flux CD
- Cluster-admin permissions to install CRDs

## Step 1: Add the Chaos Mesh HelmRepository

```yaml
# clusters/my-cluster/chaos-mesh/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: chaos-mesh
  namespace: flux-system
spec:
  # Official Chaos Mesh Helm chart repository
  url: https://charts.chaos-mesh.org
  interval: 10m
```

## Step 2: Create the Namespace

```yaml
# clusters/my-cluster/chaos-mesh/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: chaos-mesh
  labels:
    app.kubernetes.io/managed-by: flux
```

## Step 3: Deploy Chaos Mesh via HelmRelease

```yaml
# clusters/my-cluster/chaos-mesh/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: chaos-mesh
  namespace: flux-system
spec:
  interval: 15m
  targetNamespace: chaos-mesh
  chart:
    spec:
      chart: chaos-mesh
      # Pin to a specific version for reproducibility
      version: "2.x.x"
      sourceRef:
        kind: HelmRepository
        name: chaos-mesh
        namespace: flux-system
  values:
    # Install all Chaos Mesh CRDs automatically
    chaosDaemon:
      runtime: containerd
      socketPath: /run/containerd/containerd.sock
    dashboard:
      # Expose dashboard via ClusterIP; use Ingress in production
      service:
        type: ClusterIP
    # Enable security mode for production clusters
    controllerManager:
      enableFilterNamespace: true
```

## Step 4: Annotate Application Namespaces for Chaos

Chaos Mesh uses namespace labels to control which namespaces are eligible for chaos injection when `enableFilterNamespace` is true.

```bash
# Allow chaos injection in the 'default' namespace
kubectl annotate namespace default chaos-mesh.org/inject=enabled
```

Or manage it declaratively in Git:

```yaml
# clusters/my-cluster/chaos-mesh/inject-namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: default
  annotations:
    # Permit Chaos Mesh to inject faults into this namespace
    chaos-mesh.org/inject: enabled
```

## Step 5: Define a PodChaos Experiment in Git

```yaml
# clusters/my-cluster/chaos-mesh/experiments/pod-kill.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-example
  namespace: chaos-mesh
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      # Target pods with this label
      app: nginx
  # Run the experiment for 30 seconds
  duration: "30s"
  scheduler:
    # Trigger every hour using cron syntax
    cron: "@every 1h"
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/my-cluster/chaos-mesh/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: chaos-mesh
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/chaos-mesh
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: chaos-controller-manager
      namespace: chaos-mesh
```

## Step 7: Verify and Monitor

```bash
# Confirm Chaos Mesh pods are healthy
kubectl get pods -n chaos-mesh

# List active chaos experiments
kubectl get podchaos -n chaos-mesh

# Check experiment status
kubectl describe podchaos pod-kill-example -n chaos-mesh

# Watch Flux reconciliation
flux get helmreleases -n flux-system
```

## Best Practices

- Pin the Chaos Mesh Helm chart to a specific version using `version` in the HelmRelease to prevent unexpected upgrades.
- Use `enableFilterNamespace: true` in production to limit blast radius to explicitly annotated namespaces.
- Store all `PodChaos`, `NetworkChaos`, and other experiment manifests in Git for full auditability.
- Use Flux `dependsOn` to ensure the `chaos-mesh` HelmRelease is healthy before deploying experiment resources.
- Integrate with your alerting stack to notify on-call engineers before scheduled chaos windows.
- Use separate Kustomizations for the Chaos Mesh installation and the experiment definitions so experiments can be paused independently.

## Conclusion

Deploying Chaos Mesh through Flux CD gives your team a reproducible, auditable chaos engineering platform that is managed entirely through Git. By treating chaos experiments as code, you can review, approve, and roll back experiments with the same confidence as any other infrastructure change, making resilience testing a sustainable part of your delivery pipeline.
