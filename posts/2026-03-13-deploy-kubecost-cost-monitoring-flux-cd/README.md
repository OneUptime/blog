# How to Deploy Kubecost for Cost Monitoring with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Kubecost, Cost Management, FinOps, HelmRelease

Description: Deploy Kubecost Kubernetes cost monitoring tool using Flux CD HelmRelease to gain real-time visibility into cluster spending and resource allocation.

---

## Introduction

Kubernetes infrastructure costs can spiral out of control without proper visibility into how resources are being consumed. Teams often discover overspending only when the cloud bill arrives at the end of the month. Kubecost solves this by providing real-time cost monitoring, allocation breakdowns, and savings recommendations directly within your cluster.

Flux CD provides the GitOps foundation for deploying and managing Kubecost as code. By defining your Kubecost installation in a Git repository, you get full audit trails, consistent deployments across environments, and the ability to roll back configuration changes instantly. This combination of Kubecost and Flux CD gives your team both cost visibility and operational confidence.

In this guide, you will deploy Kubecost into a Kubernetes cluster using Flux CD HelmRelease. You will configure persistent storage for cost data retention, set up namespace-level cost allocation, and expose the Kubecost UI through an Ingress resource - all managed declaratively through Git.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- kubectl configured to access your cluster
- A Git repository connected to Flux CD
- A storage class available for persistent volumes
- Cluster-admin permissions

## Step 1: Create the Kubecost Namespace and HelmRepository

First, define the Helm repository source that Flux CD will use to pull the Kubecost chart.

```yaml
# infrastructure/kubecost/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kubecost
  labels:
    app.kubernetes.io/managed-by: flux
```

```yaml
# infrastructure/kubecost/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kubecost
  namespace: flux-system
spec:
  interval: 1h
  url: https://kubecost.github.io/cost-analyzer/
```

Commit both files to your Git repository. Flux CD will detect them and register the Helm repository.

## Step 2: Deploy Kubecost with a HelmRelease

Create the HelmRelease resource to deploy the Kubecost cost-analyzer chart with production-ready settings.

```yaml
# infrastructure/kubecost/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kubecost
  namespace: kubecost
spec:
  interval: 30m
  chart:
    spec:
      chart: cost-analyzer
      version: ">=2.0.0 <3.0.0"
      sourceRef:
        kind: HelmRepository
        name: kubecost
        namespace: flux-system
      interval: 12h
  values:
    # Enable persistent storage for 15-day cost retention
    persistentVolume:
      enabled: true
      size: 32Gi
      storageClass: "standard"

    # Prometheus configuration - use bundled Prometheus
    prometheus:
      server:
        persistentVolume:
          enabled: true
          size: 32Gi

    # Kubecost token (free tier - no token required)
    kubecostToken: ""

    # Enable cost reports
    reporting:
      productAnalytics: false

    # Resource allocation for cost-analyzer
    resources:
      requests:
        cpu: 200m
        memory: 256Mi
      limits:
        cpu: 800m
        memory: 1Gi
```

## Step 3: Configure the Kustomization

Wire everything together with a Flux Kustomization that applies all resources in order.

```yaml
# infrastructure/kubecost/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubecost
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/kubecost
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infrastructure-controllers
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: kubecost-cost-analyzer
      namespace: kubecost
  timeout: 5m
```

## Step 4: Expose the Kubecost UI

Add an Ingress to make the Kubecost dashboard accessible to your team.

```yaml
# infrastructure/kubecost/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kubecost
  namespace: kubecost
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: kubecost-basic-auth
spec:
  ingressClassName: nginx
  rules:
    - host: kubecost.internal.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: kubecost-cost-analyzer
                port:
                  number: 9090
```

## Step 5: Verify the Deployment

After committing all files to Git, verify that Flux CD has reconciled the resources successfully.

```bash
# Check HelmRelease status
flux get helmrelease kubecost -n kubecost

# Check all pods are running
kubectl get pods -n kubecost

# Verify persistent volumes are bound
kubectl get pvc -n kubecost

# Check Flux Kustomization status
flux get kustomization kubecost
```

Expected output shows the HelmRelease in a `Ready` state with `Applied revision` matching your Git commit.

## Best Practices

- Enable RBAC on the Kubecost UI - never expose cost data without authentication, as it reveals your infrastructure topology.
- Set a cost retention period aligned with your billing cycle; 30 days ensures you can reconcile Kubecost reports with actual cloud invoices.
- Use Kubecost's namespace labels feature to map costs to teams; define label conventions in a shared ConfigMap managed by Flux.
- Schedule weekly cost reports using Kubecost's Actions feature and distribute to engineering leads.
- Store Kubecost Helm values in a separate Secret for any API tokens and reference them with `valuesFrom` in the HelmRelease.
- Monitor Kubecost's own resource usage - it can be memory-intensive in large clusters; adjust limits accordingly.

## Conclusion

You now have Kubecost deployed and managed through Flux CD, giving you real-time Kubernetes cost visibility through GitOps. Every configuration change to your cost monitoring setup is tracked in Git, providing the audit trail and consistency your FinOps team needs. From here, explore Kubecost's savings recommendations and use them to drive right-sizing decisions back into your Flux-managed workload definitions.
