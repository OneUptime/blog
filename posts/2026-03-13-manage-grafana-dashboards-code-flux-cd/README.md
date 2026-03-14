# Manage Grafana Dashboards as Code with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: grafana, flux-cd, gitops, kubernetes, dashboards, observability, monitoring

Description: Learn how to manage Grafana dashboards as code in Kubernetes using ConfigMaps and Flux CD, enabling version-controlled, automatically reconciled dashboard deployments.

---

## Introduction

Grafana dashboards created through the UI are notoriously fragile—they live only in a database and can be accidentally modified or deleted. Managing dashboards as code in Git solves this problem by treating every dashboard as a versioned artifact that is automatically deployed by Flux CD.

The Grafana sidecar provisioner watches for ConfigMaps with specific labels and automatically loads the JSON dashboard definitions they contain. Combined with Flux CD, this pattern means every dashboard change is reviewed via pull request, deployed automatically, and can be rolled back with a simple `git revert`.

This guide walks through storing Grafana dashboard JSON in ConfigMaps, organizing them in Git, and reconciling them with Flux CD so Grafana always reflects the current state in your repository.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- Grafana deployed with the sidecar dashboard provisioner enabled
- `kubectl` and `flux` CLIs installed
- Grafana dashboard JSON exported from the Grafana UI

## Step 1: Deploy Grafana with Sidecar Provisioning Enabled

Deploy Grafana using the official Helm chart with the dashboard sidecar enabled. The sidecar watches for ConfigMaps labeled `grafana_dashboard: "1"`.

```yaml
# grafana/helm-release.yaml - Grafana HelmRelease with dashboard sidecar enabled
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: grafana
  namespace: monitoring
spec:
  interval: 10m
  chart:
    spec:
      chart: grafana
      version: "7.*"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: monitoring
  values:
    # Enable the sidecar that loads dashboards from ConfigMaps
    sidecar:
      dashboards:
        enabled: true
        label: grafana_dashboard
        labelValue: "1"
        # Watch all namespaces for dashboard ConfigMaps
        searchNamespace: ALL
        folderAnnotation: grafana_folder
        provider:
          foldersFromFilesStructure: true
```

## Step 2: Store a Dashboard as a ConfigMap

Export a dashboard from Grafana's UI as JSON, then wrap it in a ConfigMap. The sidecar will detect and load it automatically.

```yaml
# grafana/dashboards/kubernetes-overview.yaml - Kubernetes overview dashboard ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubernetes-overview-dashboard
  namespace: monitoring
  labels:
    # This label triggers the Grafana sidecar to load the dashboard
    grafana_dashboard: "1"
  annotations:
    # Place this dashboard in the 'Kubernetes' folder in Grafana
    grafana_folder: "Kubernetes"
data:
  kubernetes-overview.json: |
    {
      "title": "Kubernetes Overview",
      "uid": "kubernetes-overview",
      "panels": [],
      "schemaVersion": 36,
      "version": 1
    }
```

## Step 3: Organize Dashboards by Team or Domain

Use a directory structure in Git to separate dashboards by team or domain, and apply Kustomize to add consistent labels.

```yaml
# grafana/dashboards/kustomization.yaml - Kustomize file adding labels to all dashboard ConfigMaps
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - kubernetes-overview.yaml
  - application-performance.yaml
  - database-metrics.yaml
commonLabels:
  # Ensure all ConfigMaps in this directory are picked up by the Grafana sidecar
  grafana_dashboard: "1"
```

## Step 4: Create a Flux Kustomization for Dashboards

Reconcile the dashboard ConfigMaps from Git using a dedicated Flux Kustomization so Grafana stays synchronized with Git.

```yaml
# clusters/my-cluster/grafana-dashboards.yaml - Flux Kustomization reconciling all Grafana dashboards
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: grafana-dashboards
  namespace: flux-system
spec:
  interval: 5m
  path: ./grafana/dashboards
  prune: true  # Delete ConfigMaps when dashboard files are removed from Git
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: grafana  # Ensure Grafana is running before pushing dashboards
```

## Best Practices

- Export dashboards from Grafana UI, then immediately commit them to Git to establish a baseline
- Use unique, stable `uid` values in dashboard JSON to prevent Grafana from creating duplicates
- Enable `prune: true` in the Kustomization so deleted dashboard files are removed from the cluster
- Use `grafana_folder` annotations to organize dashboards into logical folders within Grafana
- Store dashboard JSON without the `id` field—Grafana assigns IDs on import and they vary between instances
- Run a CI check that validates dashboard JSON schema on pull requests before merging

## Conclusion

Managing Grafana dashboards as ConfigMaps in Git, reconciled by Flux CD, eliminates the problem of dashboard drift and accidental deletion. Your team gains a full audit trail of every dashboard change, the ability to review and approve changes via pull requests, and automatic recovery if dashboards are deleted from Grafana.
