# How to Deploy OpenCost for Cost Tracking with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, OpenCost, Cost Management, FinOps, HelmRelease, Prometheus

Description: Deploy OpenCost open-source Kubernetes cost monitoring using Flux CD to track and allocate cluster spending across namespaces, teams, and workloads.

---

## Introduction

OpenCost is the open-source, vendor-neutral standard for measuring and allocating Kubernetes infrastructure costs. Born as a CNCF sandbox project, it integrates directly with your existing Prometheus installation and provides a clean API and UI for understanding where your cloud spend is going. Unlike proprietary solutions, OpenCost gives you full control over your cost data without vendor lock-in.

Deploying OpenCost through Flux CD means your cost monitoring infrastructure is treated identically to your application workloads — version controlled, peer reviewed, and automatically reconciled. When your team updates pricing configurations or allocation rules, those changes flow through Git with full traceability.

This guide walks you through deploying OpenCost alongside Prometheus in your cluster using Flux CD HelmRelease resources. You will configure cloud provider pricing, namespace cost allocation, and the OpenCost UI — all as declarative manifests committed to Git.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- Prometheus deployed in the cluster (or deploy it alongside OpenCost)
- kubectl with cluster-admin access
- Cloud provider credentials if using cloud pricing APIs
- A Git repository connected to your Flux CD instance

## Step 1: Add the OpenCost HelmRepository

Register the OpenCost Helm chart repository with Flux CD so it can pull chart updates automatically.

```yaml
# infrastructure/opencost/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: opencost
  namespace: flux-system
spec:
  interval: 1h
  url: https://opencost.github.io/opencost-helm-chart
```

```yaml
# infrastructure/opencost/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: opencost
  labels:
    app.kubernetes.io/managed-by: flux
    team: platform
```

## Step 2: Deploy OpenCost with HelmRelease

Create the HelmRelease resource. OpenCost connects to your existing Prometheus instance to query metrics.

```yaml
# infrastructure/opencost/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: opencost
  namespace: opencost
spec:
  interval: 30m
  chart:
    spec:
      chart: opencost
      version: ">=1.0.0 <2.0.0"
      sourceRef:
        kind: HelmRepository
        name: opencost
        namespace: flux-system
      interval: 12h
  values:
    opencost:
      exporter:
        # Connect to your cluster's Prometheus instance
        defaultClusterId: "production-cluster"
        cloudProviderApiKey: ""
        resources:
          requests:
            cpu: 10m
            memory: 55Mi
          limits:
            cpu: 999m
            memory: 1Gi

      # Prometheus connection configuration
      prometheus:
        internal:
          enabled: false
        external:
          enabled: true
          # Update this to your Prometheus service URL
          url: "http://prometheus-operated.monitoring.svc.cluster.local:9090"

      ui:
        enabled: true
        resources:
          requests:
            cpu: 10m
            memory: 55Mi
          limits:
            cpu: 999m
            memory: 1Gi

    # ServiceMonitor for Prometheus scraping
    serviceMonitor:
      enabled: true
      namespace: monitoring
```

## Step 3: Configure Cloud Provider Pricing

For accurate cost data, create a ConfigMap with your cloud provider's pricing configuration.

```yaml
# infrastructure/opencost/pricing-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cloud-pricing-config
  namespace: opencost
data:
  # AWS pricing configuration example
  pricing.json: |
    {
      "provider": "aws",
      "description": "AWS us-east-1 on-demand pricing",
      "CPU": "0.048",
      "spotCPU": "0.0144",
      "RAM": "0.006",
      "spotRAM": "0.0018",
      "GPU": "0.95",
      "storage": "0.04",
      "zoneNetworkEgress": "0.01",
      "regionNetworkEgress": "0.02",
      "internetNetworkEgress": "0.09"
    }
```

## Step 4: Create the Flux Kustomization

Define the Kustomization to apply all OpenCost resources in the correct order.

```yaml
# infrastructure/opencost/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: opencost
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/opencost
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: monitoring  # Ensure Prometheus is deployed first
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: opencost
      namespace: opencost
  timeout: 5m
```

## Step 5: Access the OpenCost API

Once deployed, query the OpenCost API to verify cost allocation is working correctly.

```bash
# Port-forward to the OpenCost UI
kubectl port-forward -n opencost svc/opencost 9090:9090 &

# Query allocation data for the past 7 days
curl "http://localhost:9090/allocation/compute?window=7d&aggregate=namespace"

# Check cost per namespace
curl "http://localhost:9090/allocation/compute?window=1d&aggregate=namespace&accumulate=true"

# Verify Flux reconciliation
flux get helmrelease opencost -n opencost
flux get kustomization opencost
```

## Step 6: Add Ingress for Team Access

Expose the OpenCost UI for your engineering teams to view cost data directly.

```yaml
# infrastructure/opencost/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: opencost
  namespace: opencost
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: opencost.internal.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: opencost
                port:
                  number: 9090
```

## Best Practices

- Pin OpenCost chart versions in the HelmRelease rather than using floating ranges to ensure reproducible deployments.
- Store cloud provider API keys in Kubernetes Secrets and reference them with `valuesFrom` in the HelmRelease to avoid secrets in Git.
- Enable the OpenCost ServiceMonitor so your Prometheus instance scrapes OpenCost metrics; this lets you build cost alerts on top of Alertmanager.
- Aggregate cost data by team labels, not just namespaces; work with your teams to consistently label workloads before relying on allocation data.
- Schedule weekly OpenCost Allocation API exports to a cost tracking spreadsheet or BI tool for historical trend analysis.
- Use OpenCost's `/assets` API endpoint to break down costs by node, disk, and network for infrastructure rightsizing decisions.

## Conclusion

OpenCost is now running in your cluster as a fully GitOps-managed deployment. Your team has a vendor-neutral, open-source cost monitoring system that integrates with the Prometheus stack you already operate. Combine OpenCost data with Flux CD's deployment records to correlate cost changes with specific application releases, giving your FinOps practice the precision it needs to drive meaningful savings.
