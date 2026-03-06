# How to Deploy OpenCost with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, opencost, cost management, kubernetes, gitops, helm, cncf, monitoring

Description: A step-by-step guide to deploying OpenCost, the open-source CNCF cost monitoring tool, using Flux CD for GitOps-driven cost visibility.

---

## Introduction

OpenCost is a CNCF sandbox project that provides real-time Kubernetes cost monitoring. Unlike commercial alternatives, OpenCost is fully open-source and implements the OpenCost Specification for standardized cost allocation. Deploying OpenCost with Flux CD ensures your cost monitoring stack is managed through GitOps, making it reproducible and auditable.

This guide covers deploying OpenCost alongside Prometheus, configuring custom pricing, and setting up cost allocation by namespace, label, and team.

## Prerequisites

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped
- Prometheus running in the cluster (or deployed alongside OpenCost)
- kubectl access to the cluster

## Repository Structure

```
clusters/
  production/
    opencost/
      namespace.yaml
      source.yaml
      release.yaml
      prometheus-source.yaml
      prometheus-release.yaml
      kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/production/opencost/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: opencost
  labels:
    # Identify this namespace as part of the platform stack
    app.kubernetes.io/part-of: cost-monitoring
```

## Step 2: Add Helm Repository Sources

OpenCost requires Prometheus for metrics collection. Add both Helm repositories.

```yaml
# clusters/production/opencost/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: opencost
  namespace: flux-system
spec:
  # Official OpenCost Helm chart repository
  url: https://opencost.github.io/opencost-helm-chart
  interval: 1h
---
# clusters/production/opencost/prometheus-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  # Prometheus community Helm charts
  url: https://prometheus-community.github.io/helm-charts
  interval: 1h
```

## Step 3: Deploy Prometheus (If Not Already Running)

OpenCost depends on Prometheus for metrics. Deploy it if you do not already have it.

```yaml
# clusters/production/opencost/prometheus-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: prometheus
  namespace: opencost
spec:
  interval: 30m
  chart:
    spec:
      chart: prometheus
      version: "25.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  install:
    createNamespace: false
    remediation:
      retries: 3
  values:
    # Disable components not needed for OpenCost
    alertmanager:
      enabled: false
    pushgateway:
      enabled: false
    # Configure server for cost metrics retention
    server:
      retention: 30d
      persistentVolume:
        enabled: true
        size: 50Gi
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
        limits:
          cpu: 1000m
          memory: 2Gi
    # Enable node exporter for node-level cost metrics
    nodeExporter:
      enabled: true
    # Scrape config to collect kubelet and cadvisor metrics
    serverFiles:
      prometheus.yml:
        scrape_configs:
          - job_name: kubelet
            scheme: https
            tls_config:
              insecure_skip_verify: true
            bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
            kubernetes_sd_configs:
              - role: node
            metrics_path: /metrics/cadvisor
```

## Step 4: Deploy OpenCost

Create the HelmRelease for OpenCost with full configuration.

```yaml
# clusters/production/opencost/release.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: opencost
  namespace: opencost
spec:
  # Reconcile every 30 minutes
  interval: 30m
  # Depend on Prometheus being ready first
  dependsOn:
    - name: prometheus
      namespace: opencost
  chart:
    spec:
      chart: opencost
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: opencost
        namespace: flux-system
      interval: 12h
  install:
    createNamespace: false
    remediation:
      retries: 3
  upgrade:
    cleanupOnFail: true
    remediation:
      retries: 3
  values:
    # OpenCost configuration
    opencost:
      exporter:
        # Point OpenCost to the Prometheus server
        defaultClusterId: "production"
        extraEnv:
          # Prometheus endpoint for cost data queries
          PROMETHEUS_SERVER_ENDPOINT: "http://prometheus-server.opencost.svc:80"
          # Cloud provider for accurate pricing
          CLOUD_PROVIDER_API_KEY: ""
          # Cluster ID for multi-cluster setups
          CLUSTER_ID: "production"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
      # Enable the OpenCost UI
      ui:
        enabled: true
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 256Mi
      # Metrics export configuration
      metrics:
        serviceMonitor:
          # Enable if using Prometheus Operator
          enabled: false
```

## Step 5: Configure Custom Pricing

If you need custom pricing (on-prem or for specific regions), create a pricing ConfigMap.

```yaml
# clusters/production/opencost/config/custom-pricing.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: opencost-custom-pricing
  namespace: opencost
data:
  # Custom pricing model for on-premises clusters
  default.json: |
    {
      "provider": "custom",
      "description": "Custom on-premises pricing",
      "CPU": "0.031611",
      "spotCPU": "0.006655",
      "RAM": "0.004237",
      "spotRAM": "0.000892",
      "GPU": "0.95",
      "spotGPU": "0.25",
      "storage": "0.00005479452",
      "zoneNetworkEgress": "0.01",
      "regionNetworkEgress": "0.01",
      "internetNetworkEgress": "0.12"
    }
```

## Step 6: Set Up RBAC for Multi-Team Access

Configure RBAC so different teams can view their own cost data.

```yaml
# clusters/production/opencost/rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: opencost-viewer
rules:
  # Allow read access to OpenCost API
  - apiGroups: [""]
    resources: ["pods", "nodes", "namespaces"]
    verbs: ["get", "list"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: opencost-viewer-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: opencost-viewer
subjects:
  # Bind to a group for team-based access
  - kind: Group
    name: cost-viewers
    apiGroup: rbac.authorization.k8s.io
```

## Step 7: Create the Flux Kustomization

```yaml
# clusters/production/opencost/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: opencost
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production/opencost
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: opencost
      namespace: opencost
  timeout: 10m
  # Wait for Prometheus to be healthy before deploying OpenCost
  dependsOn:
    - name: prometheus
```

## Step 8: Expose OpenCost via Ingress

```yaml
# clusters/production/opencost/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: opencost
  namespace: opencost
  annotations:
    # Use your ingress controller annotations
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: opencost-basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "OpenCost Authentication"
spec:
  ingressClassName: nginx
  rules:
    - host: opencost.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: opencost
                port:
                  number: 9090
  tls:
    - hosts:
        - opencost.example.com
      secretName: opencost-tls
```

## Step 9: Query the OpenCost API

After deployment, use the OpenCost API to retrieve cost data.

```bash
# Port-forward to the OpenCost service
kubectl port-forward -n opencost svc/opencost 9003:9003

# Get cost allocation by namespace for the last 24 hours
curl "http://localhost:9003/allocation/compute?window=24h&aggregate=namespace&step=1h"

# Get cost allocation by controller (deployment, statefulset, etc.)
curl "http://localhost:9003/allocation/compute?window=7d&aggregate=controller&accumulate=true"

# Get cost allocation by label
curl "http://localhost:9003/allocation/compute?window=7d&aggregate=label:team&accumulate=true"
```

## Step 10: Verify Deployment

```bash
# Check Flux reconciliation status
flux get helmreleases -n opencost

# Verify all pods are healthy
kubectl get pods -n opencost

# Check OpenCost logs
kubectl logs -n opencost deployment/opencost

# Verify Prometheus connectivity
kubectl exec -n opencost deployment/opencost -- \
  wget -qO- "http://prometheus-server.opencost.svc:80/api/v1/query?query=up"
```

## Troubleshooting

```bash
# If OpenCost shows zero costs, verify Prometheus has kubelet metrics
kubectl exec -n opencost deployment/opencost -- \
  wget -qO- "http://prometheus-server:80/api/v1/query?query=container_cpu_usage_seconds_total" | head -20

# Force Flux to reconcile the HelmRelease
flux reconcile helmrelease opencost -n opencost --with-source

# Check for resource conflicts or errors
kubectl describe helmrelease opencost -n opencost
```

## Summary

You now have OpenCost deployed via Flux CD, providing open-source Kubernetes cost monitoring. The deployment is fully managed through GitOps, meaning all configuration changes go through version control. OpenCost gives you real-time cost allocation by namespace, label, deployment, and team, helping you understand exactly where your Kubernetes spending goes. Combined with Flux CD, any pricing model changes or configuration updates are automatically reconciled from your Git repository.
