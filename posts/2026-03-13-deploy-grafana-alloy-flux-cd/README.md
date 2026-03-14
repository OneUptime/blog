# Deploy Grafana Alloy with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Grafana, Alloy, Flux CD, GitOps, Observability, Kubernetes

Description: Learn how to deploy Grafana Alloy, the next-generation telemetry collector, on Kubernetes using Flux CD and GitOps principles. This guide covers HelmRelease configuration, pipeline setup, and best practices.

---

## Introduction

Grafana Alloy is the open-source, OpenTelemetry-compatible distribution of the Grafana Agent. It replaces both Grafana Agent and Grafana Agent Flow, offering a unified collector for metrics, logs, traces, and profiles. Alloy uses a River-based configuration language that makes pipelines composable and readable.

Deploying Alloy via Flux CD ensures your telemetry collection configuration is version-controlled, auditable, and automatically reconciled. Any change pushed to your Git repository is reflected in the cluster without manual `kubectl apply` commands.

This guide walks through bootstrapping a Flux-managed HelmRelease for Grafana Alloy, configuring a basic metrics and logs pipeline, and applying production best practices.

## Prerequisites

- A running Kubernetes cluster (v1.26+)
- Flux CD bootstrapped on the cluster (`flux bootstrap`)
- `flux` CLI installed locally
- `kubectl` configured for the target cluster
- A Git repository connected to Flux

## Step 1: Create the Namespace and HelmRepository

First, define the namespace and point Flux at the Grafana Helm chart registry.

```yaml
# clusters/my-cluster/grafana-alloy/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
---
# clusters/my-cluster/grafana-alloy/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana
  namespace: flux-system
spec:
  interval: 12h
  url: https://grafana.github.io/helm-charts
```

## Step 2: Create the HelmRelease for Grafana Alloy

Define a HelmRelease that deploys Alloy as a DaemonSet so every node ships telemetry data.

```yaml
# clusters/my-cluster/grafana-alloy/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: grafana-alloy
  namespace: monitoring
spec:
  interval: 15m
  chart:
    spec:
      chart: alloy
      version: ">=0.9.0"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
  values:
    # Deploy as a DaemonSet to collect from every node
    controller:
      type: daemonset
    alloy:
      configMap:
        # Reference a ConfigMap with Alloy River config
        name: alloy-config
        key: config.alloy
    serviceMonitor:
      enabled: true
```

## Step 3: Add the Alloy Pipeline ConfigMap

Create a ConfigMap with a basic River pipeline that scrapes Prometheus metrics and forwards them to a remote endpoint.

```yaml
# clusters/my-cluster/grafana-alloy/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alloy-config
  namespace: monitoring
data:
  config.alloy: |
    // Discover Kubernetes pods with Prometheus annotations
    discovery.kubernetes "pods" {
      role = "pod"
    }

    // Scrape discovered pods
    prometheus.scrape "pods" {
      targets    = discovery.kubernetes.pods.targets
      forward_to = [prometheus.remote_write.default.receiver]
    }

    // Forward metrics to a remote_write endpoint (e.g., Mimir or Prometheus)
    prometheus.remote_write "default" {
      endpoint {
        url = "http://mimir-distributor.monitoring.svc:8080/api/v1/push"
      }
    }
```

## Step 4: Create the Kustomization

Wire all resources together with a Flux Kustomization that watches the directory.

```yaml
# clusters/my-cluster/grafana-alloy/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: grafana-alloy
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/grafana-alloy
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: grafana-alloy
      namespace: monitoring
```

## Best Practices

- Store sensitive credentials (e.g., remote write passwords) in Kubernetes Secrets managed by Flux's SOPS or Sealed Secrets integration, never in plain ConfigMaps.
- Use `interval: 12h` on the HelmRepository to avoid excessive polling while still picking up new chart versions.
- Pin chart versions with semantic version ranges (e.g., `>=0.9.0 <1.0.0`) to prevent breaking changes from being auto-applied.
- Enable `serviceMonitor: true` so Alloy's own metrics are scraped by kube-prometheus-stack.
- Use `prune: true` in the Kustomization to automatically remove resources deleted from Git.

## Conclusion

Grafana Alloy is a powerful, GitOps-friendly telemetry collector that consolidates metrics, logs, and traces in a single pipeline configuration. By deploying it via Flux CD you gain declarative lifecycle management, automatic drift detection, and a full audit trail of every configuration change. Commit your Alloy pipeline to Git and let Flux handle the rest.
