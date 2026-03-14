# How to Deploy Litmus Chaos with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Chaos Engineering, LitmusChaos

Description: Deploy the LitmusChaos chaos engineering platform to Kubernetes using Flux CD HelmRelease for automated, GitOps-driven chaos experiments.

---

## Introduction

Chaos engineering is the practice of deliberately injecting failures into your systems to discover weaknesses before they cause real outages. LitmusChaos is a CNCF-graduated chaos engineering platform that provides a rich library of chaos experiments for Kubernetes workloads, from pod kills to network disruptions.

Managing LitmusChaos through Flux CD brings the discipline of GitOps to your chaos engineering practice. Every experiment definition, schedule, and configuration change is version-controlled, auditable, and automatically reconciled to your cluster. This eliminates the risk of configuration drift and ensures your chaos testing environment is reproducible across clusters.

In this guide, you will bootstrap LitmusChaos onto a Kubernetes cluster using Flux CD HelmRelease resources, configure the Litmus portal, and run your first ChaosEngine experiment — all driven from a Git repository.

## Prerequisites

- A running Kubernetes cluster (1.24+)
- Flux CD bootstrapped on the cluster (`flux bootstrap`)
- `kubectl` and `flux` CLI installed locally
- A Git repository connected to Flux CD
- Helm 3.x installed locally for local testing

## Step 1: Create the LitmusChaos Namespace and HelmRepository

Add a HelmRepository source pointing to the official LitmusChaos Helm registry, and create the target namespace.

```yaml
# clusters/my-cluster/litmus/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: litmus
  labels:
    app.kubernetes.io/managed-by: flux
```

```yaml
# clusters/my-cluster/litmus/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: litmuschaos
  namespace: flux-system
spec:
  # Official LitmusChaos Helm chart repository
  url: https://litmuschaos.github.io/litmus-helm/
  # Poll for new chart versions every 10 minutes
  interval: 10m
```

## Step 2: Create the HelmRelease for Litmus

Define a HelmRelease that installs the `litmus` chart into the `litmus` namespace.

```yaml
# clusters/my-cluster/litmus/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: litmus
  namespace: flux-system
spec:
  interval: 15m
  targetNamespace: litmus
  chart:
    spec:
      chart: litmus
      version: "3.x.x"
      sourceRef:
        kind: HelmRepository
        name: litmuschaos
        namespace: flux-system
  values:
    # Enable the Litmus portal UI
    portal:
      frontend:
        service:
          type: ClusterIP
      server:
        service:
          type: ClusterIP
    # Resource limits for production use
    adminConfig:
      DBUSER: "admin"
      DBPASSWORD: "1234"  # Use ExternalSecret in production
```

## Step 3: Create a Kustomization for Litmus Resources

Group the Litmus resources under a single Flux Kustomization for ordered reconciliation.

```yaml
# clusters/my-cluster/litmus/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: litmus
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/litmus
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Wait for namespace to exist before deploying Helm chart
  dependsOn:
    - name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: litmus-frontend
      namespace: litmus
```

## Step 4: Commit and Push to Git

```bash
# Stage all Litmus resources
git add clusters/my-cluster/litmus/
git commit -m "feat: add LitmusChaos deployment via Flux HelmRelease"
git push origin main

# Watch Flux reconcile the resources
flux get helmreleases --namespace flux-system
flux get kustomizations
```

## Step 5: Deploy a ChaosExperiment and ChaosEngine

Once Litmus is running, define chaos experiments as Kubernetes CRDs tracked in Git.

```yaml
# clusters/my-cluster/litmus/experiments/pod-delete.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosExperiment
metadata:
  name: pod-delete
  namespace: litmus
spec:
  definition:
    scope: Namespaced
    permissions:
      - apiGroups: [""]
        resources: ["pods"]
        verbs: ["get", "list", "delete"]
    image: "litmuschaos/go-runner:latest"
    args:
      - -c
      - ./experiments/pod-delete
    command:
      - /bin/bash
    env:
      - name: TOTAL_CHAOS_DURATION
        value: "30"  # Duration in seconds
      - name: CHAOS_INTERVAL
        value: "10"
      - name: FORCE
        value: "false"
```

```yaml
# clusters/my-cluster/litmus/experiments/chaosengine.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: nginx-chaos
  namespace: litmus
spec:
  appinfo:
    appns: default
    applabel: "app=nginx"
    appkind: deployment
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "20"
```

## Step 6: Verify the Deployment

```bash
# Check Litmus pods are running
kubectl get pods -n litmus

# Check ChaosEngine status
kubectl get chaosengine -n litmus

# View experiment results
kubectl get chaosresult -n litmus
```

## Best Practices

- Store `ChaosEngine` and `ChaosExperiment` manifests in Git alongside application manifests for traceability.
- Use Flux `dependsOn` to ensure Litmus is fully healthy before applying experiment resources.
- Never store database passwords in plain YAML; use External Secrets Operator or SOPS encryption.
- Set resource requests and limits on the Litmus server to prevent it from starving application pods.
- Use Flux notifications to alert your team when a ChaosEngine transitions to a failed state.
- Run chaos experiments only in non-production windows unless you have verified blast radius controls.

## Conclusion

By deploying LitmusChaos through Flux CD, you gain a fully GitOps-managed chaos engineering platform where every experiment is version-controlled and auditable. Changes to chaos configurations flow through the same pull request and review process as application code, making chaos engineering a first-class part of your engineering workflow rather than an ad-hoc manual process.
