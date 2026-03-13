# How to Configure Flux Operator for Multi-Cluster Fleet Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Flux Operator, Multi-Cluster, Fleet Management, Kubernetes, GitOps

Description: Learn how to configure the Flux Operator to manage Flux installations across multiple Kubernetes clusters for fleet-wide GitOps.

---

## Introduction

Managing Flux installations across a fleet of Kubernetes clusters is a common challenge for organizations running multiple environments or edge deployments. The Flux Operator simplifies this by providing a declarative way to manage Flux lifecycle through FluxInstance resources, which can be deployed and managed using GitOps workflows themselves.

This guide covers strategies for using the Flux Operator to manage Flux across multiple clusters, including centralized configuration management, environment-specific customizations, and automated rollouts of Flux upgrades across your fleet.

## Prerequisites

Before you begin, ensure you have:

- Multiple Kubernetes clusters with the Flux Operator installed on each.
- A Git repository for fleet configuration management.
- `kubectl` configured to access your clusters.
- Understanding of Flux GitOps concepts.

## Fleet Architecture Overview

In a multi-cluster fleet architecture, each cluster runs the Flux Operator and has a FluxInstance resource that defines its Flux configuration. A central Git repository contains the FluxInstance definitions for all clusters, organized by environment or cluster name.

```
fleet-repo/
  base/
    flux-instance.yaml          # Base FluxInstance template
    kustomization.yaml
  clusters/
    production-us-east/
      flux-instance-patch.yaml  # Cluster-specific overrides
      kustomization.yaml
    production-eu-west/
      flux-instance-patch.yaml
      kustomization.yaml
    staging/
      flux-instance-patch.yaml
      kustomization.yaml
    development/
      flux-instance-patch.yaml
      kustomization.yaml
```

## Creating a Base FluxInstance Template

Define a base FluxInstance that contains common configuration shared across all clusters.

```yaml
# base/flux-instance.yaml
# Base FluxInstance template for all clusters
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.4.0"
    registry: ghcr.io/fluxcd
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
  cluster:
    type: kubernetes
    networkPolicy: true
```

Create the base Kustomization.

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - flux-instance.yaml
```

## Creating Cluster-Specific Overrides

Each cluster can override the base configuration with patches for its specific requirements.

Production cluster with high availability:

```yaml
# clusters/production-us-east/flux-instance-patch.yaml
# Production overrides for US East cluster
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.4.0"
  cluster:
    multitenant: true
  sync:
    kind: GitRepository
    url: https://github.com/myorg/fleet-infra.git
    ref: refs/heads/main
    path: clusters/production-us-east
    pullSecret: flux-git-auth
  kustomize:
    patches:
      - target:
          kind: Deployment
        patch: |
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: all
          spec:
            template:
              spec:
                containers:
                  - name: manager
                    resources:
                      limits:
                        cpu: 1000m
                        memory: 1Gi
                      requests:
                        cpu: 200m
                        memory: 256Mi
```

```yaml
# clusters/production-us-east/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patchesStrategicMerge:
  - flux-instance-patch.yaml
```

Development cluster with lightweight configuration:

```yaml
# clusters/development/flux-instance-patch.yaml
# Development overrides
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.x"
  cluster:
    networkPolicy: false
  sync:
    kind: GitRepository
    url: https://github.com/myorg/fleet-infra.git
    ref: refs/heads/main
    path: clusters/development
    pullSecret: flux-git-auth
```

## Bootstrapping Clusters

Each cluster needs an initial bootstrap that installs the Flux Operator and creates the initial FluxInstance. You can automate this with a bootstrap script.

```bash
#!/bin/bash
# bootstrap-cluster.sh
# Bootstrap a cluster with the Flux Operator and initial FluxInstance

CLUSTER_NAME=$1
GIT_REPO="https://github.com/myorg/fleet-infra.git"

# Install the Flux Operator
helm repo add fluxcd-community https://fluxcd-community.github.io/helm-charts
helm repo update
helm install flux-operator fluxcd-community/flux-operator \
  --namespace flux-system \
  --create-namespace

# Create Git authentication secret
kubectl create secret generic flux-git-auth \
  --namespace flux-system \
  --from-literal=username=git \
  --from-literal=password="${GITHUB_TOKEN}"

# Apply the cluster-specific FluxInstance
kubectl apply -k "fleet-repo/clusters/${CLUSTER_NAME}/"
```

## Managing Flux Upgrades Across the Fleet

To upgrade Flux across all clusters, update the version in the base FluxInstance and commit the change. Each cluster's Flux installation will reconcile the updated version.

For a controlled rollout, use different version pinning per environment.

```yaml
# clusters/development/flux-instance-patch.yaml
spec:
  distribution:
    version: "2.5.0"  # Upgrade development first
```

After validating in development:

```yaml
# clusters/staging/flux-instance-patch.yaml
spec:
  distribution:
    version: "2.5.0"  # Then upgrade staging
```

After validating in staging:

```yaml
# base/flux-instance.yaml
spec:
  distribution:
    version: "2.5.0"  # Finally upgrade the base for all production clusters
```

## Monitoring Fleet-Wide Flux Status

Use Prometheus and Grafana to monitor the Flux Operator and FluxInstance status across all clusters. Each Flux Operator exposes metrics about the FluxInstance reconciliation.

```yaml
# prometheus-federation.yaml
# Federated Prometheus scrape for multi-cluster monitoring
scrape_configs:
  - job_name: flux-operator-production-us-east
    honor_labels: true
    metrics_path: /federate
    params:
      match[]:
        - '{__name__=~"flux_.*"}'
    static_configs:
      - targets:
          - prometheus.production-us-east.internal:9090
        labels:
          cluster: production-us-east
  - job_name: flux-operator-production-eu-west
    honor_labels: true
    metrics_path: /federate
    params:
      match[]:
        - '{__name__=~"flux_.*"}'
    static_configs:
      - targets:
          - prometheus.production-eu-west.internal:9090
        labels:
          cluster: production-eu-west
```

Create alerts for fleet-wide issues.

```yaml
# flux-fleet-alerts.yaml
# Alert rules for fleet-wide Flux monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-fleet-alerts
  namespace: monitoring
spec:
  groups:
    - name: flux-fleet
      rules:
        - alert: FluxInstanceNotReady
          expr: flux_instance_ready == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "FluxInstance not ready on cluster {{ $labels.cluster }}"
        - alert: FluxVersionDrift
          expr: count(count by (version) (flux_instance_info)) > 1
          for: 24h
          labels:
            severity: warning
          annotations:
            summary: "Different Flux versions detected across fleet"
```

## Handling Cluster-Specific Secrets

Each cluster may need different secrets for Git authentication, registry credentials, or other sensitive data. Manage these outside of Git using sealed secrets or external secrets.

```yaml
# sealed-secret-git-auth.yaml
# SealedSecret for Git authentication (encrypted, safe to store in Git)
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: flux-git-auth
  namespace: flux-system
spec:
  encryptedData:
    username: AgByz...encrypted...
    password: AgCde...encrypted...
```

## Conclusion

Configuring the Flux Operator for multi-cluster fleet management enables consistent, version-controlled Flux installations across all your clusters. By using a base FluxInstance template with cluster-specific overrides stored in Git, you manage your entire fleet through the same GitOps workflow that Flux provides for your applications. Controlled upgrade rollouts from development through staging to production reduce the risk of Flux upgrades, while fleet-wide monitoring ensures visibility across all clusters.
