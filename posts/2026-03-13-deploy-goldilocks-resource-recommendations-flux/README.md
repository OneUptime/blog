# How to Deploy Goldilocks for Resource Recommendations with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Goldilocks, VPA, Resource Optimization, Cost Management, HelmRelease

Description: Deploy Goldilocks VPA recommendations dashboard using Flux CD HelmRelease to automatically identify right-sized resource requests and limits for your Kubernetes workloads.

---

## Introduction

Finding the correct resource requests and limits for Kubernetes workloads is difficult. Setting them too high wastes money; setting them too low causes throttling and OOMKills. Goldilocks, created by Fairwinds, solves this by running the Kubernetes Vertical Pod Autoscaler (VPA) in recommendation mode and surfacing those recommendations through a clean dashboard - without actually modifying your pods.

The name captures the goal perfectly: you want resource settings that are "just right." Goldilocks watches your running workloads, gathers VPA data, and presents namespace-by-namespace recommendations you can directly copy into your Flux-managed manifests. This creates a virtuous feedback loop where actual runtime data drives your GitOps configuration.

This guide covers deploying both the VPA and Goldilocks using Flux CD HelmRelease resources. You will configure namespace opt-in labels, review recommendations through the dashboard, and integrate findings back into your Flux workload definitions.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- kubectl with cluster-admin access
- A Git repository connected to Flux CD
- Cluster metrics server running (required by VPA)
- At least several hours of workload data for meaningful recommendations

## Step 1: Deploy the Vertical Pod Autoscaler

Goldilocks depends on VPA. Deploy VPA first using Flux CD.

```yaml
# infrastructure/vpa/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: fairwinds-stable
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.fairwinds.com/stable
```

```yaml
# infrastructure/vpa/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: vpa
  namespace: vpa
spec:
  interval: 30m
  chart:
    spec:
      chart: vpa
      version: ">=4.0.0 <5.0.0"
      sourceRef:
        kind: HelmRepository
        name: fairwinds-stable
        namespace: flux-system
      interval: 12h
  values:
    # Run VPA in recommendation-only mode
    # This prevents VPA from automatically changing pod resources
    recommender:
      enabled: true
    updater:
      enabled: false  # Disable auto-updates; use recommendations manually
    admissionController:
      enabled: false  # Not needed for recommendation-only mode
```

## Step 2: Deploy Goldilocks

With VPA running, deploy the Goldilocks controller and dashboard.

```yaml
# infrastructure/goldilocks/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: goldilocks
  namespace: goldilocks
spec:
  interval: 30m
  chart:
    spec:
      chart: goldilocks
      version: ">=8.0.0 <9.0.0"
      sourceRef:
        kind: HelmRepository
        name: fairwinds-stable
        namespace: flux-system
      interval: 12h
  values:
    controller:
      enabled: true
      resources:
        requests:
          cpu: 25m
          memory: 32Mi
        limits:
          cpu: 250m
          memory: 128Mi

    dashboard:
      enabled: true
      replicaCount: 1
      resources:
        requests:
          cpu: 25m
          memory: 32Mi
        limits:
          cpu: 250m
          memory: 128Mi
      ingress:
        enabled: true
        ingressClassName: nginx
        hosts:
          - host: goldilocks.internal.example.com
            paths:
              - path: /
                type: Prefix
```

## Step 3: Enable Goldilocks on Target Namespaces

Goldilocks uses a namespace label to know which namespaces to analyze. Add this label to the namespaces you manage with Flux.

```yaml
# infrastructure/namespaces/backend-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: backend
  labels:
    # This label tells Goldilocks to create VPA objects for workloads here
    goldilocks.fairwinds.com/enabled: "true"
    app.kubernetes.io/managed-by: flux
```

Apply the label to existing namespaces without recreating them using a Flux patch.

```yaml
# infrastructure/goldilocks/namespace-labels-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: goldilocks-namespace-labels
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/namespaces
  prune: false  # Don't prune namespaces - that would delete workloads
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: goldilocks
```

## Step 4: Create the Full Kustomization Stack

Tie everything together with ordered Flux Kustomizations.

```yaml
# clusters/production/goldilocks-stack.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: vpa
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/vpa
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: goldilocks
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/goldilocks
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: vpa
```

## Step 5: Reading and Applying Recommendations

After running for several hours, navigate to the Goldilocks dashboard to view recommendations.

```bash
# Port-forward if no Ingress configured
kubectl port-forward -n goldilocks svc/goldilocks-dashboard 8080:80

# Check that VPA objects were created for your workloads
kubectl get vpa -n backend

# View VPA recommendations directly via kubectl
kubectl describe vpa -n backend my-app-deployment
```

The dashboard shows "Guaranteed" and "Burstable" QoS recommendations. Copy the Burstable recommendations for most web services and update your Flux-managed Deployment specs.

## Best Practices

- Wait at least 24 hours after enabling Goldilocks before acting on recommendations - VPA needs enough data across different traffic patterns to give accurate suggestions.
- Apply recommendations to staging environments first and monitor for instability before promoting changes to production.
- Set `updateMode: "Off"` on all VPA objects created by Goldilocks to ensure recommendations never automatically change running pods.
- Use the Goldilocks dashboard's "QoS" toggle to choose between Guaranteed (same requests and limits) and Burstable (lower requests, higher limits) based on workload type.
- Re-review recommendations quarterly, especially after major traffic changes - workload profiles change over time.
- Track the diff between recommended and current settings in Git commit messages to build an optimization history.

## Conclusion

Goldilocks bridges the gap between theoretical resource planning and evidence-based optimization. By deploying it through Flux CD, your recommendations dashboard is always available and the VPA configuration is version controlled. The result is a systematic, data-driven approach to resource right-sizing that reduces both cloud costs and the operational toil of guessing at resource values.
