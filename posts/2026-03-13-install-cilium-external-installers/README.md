# Install Cilium with External Installers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: Guide to installing Cilium on Kubernetes using external installer tools including Helm, Kustomize, and Flux CD for GitOps-native management.

---

## Introduction

While the Cilium CLI is the simplest way to install Cilium, production environments often require installation via declarative tooling that integrates with GitOps workflows. Cilium can be installed with Helm, Kustomize, or as a Flux CD HelmRelease - each offering different levels of version control and lifecycle management.

This guide covers installing Cilium with each external installer approach, with a focus on GitOps integration.

## Prerequisites

- Kubernetes cluster with cluster-admin access
- Helm 3 installed
- `kubectl` installed
- `flux` CLI (for Flux CD approach)
- `cilium` CLI for status verification

## Step 1: Install Cilium with Helm

Helm is the most common external installer for Cilium:

```bash
# Add the Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# List available versions
helm search repo cilium/cilium --versions | head -10

# Install Cilium with basic configuration
helm install cilium cilium/cilium \
  --version 1.15.0 \
  --namespace kube-system \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=false \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true
```

Create a comprehensive values file for reproducible installs:

```yaml
# cilium-helm-values.yaml - Production Cilium values for Helm installation
# IPAM configuration
ipam:
  mode: kubernetes

# Enable kube-proxy replacement for better performance
kubeProxyReplacement: true
k8sServiceHost: 10.0.0.1  # Replace with your API server IP
k8sServicePort: "6443"

# Enable Hubble for observability
hubble:
  enabled: true
  relay:
    enabled: true
    replicas: 2
  ui:
    enabled: true
    replicas: 1
  metrics:
    enabled:
      - dns
      - drop
      - tcp
      - flow
      - port-distribution
      - icmp
      - httpV2

# Enable eBPF masquerading
bpf:
  masquerade: true

# Resource limits for Cilium agents
resources:
  requests:
    cpu: 100m
    memory: 512Mi
  limits:
    cpu: 4000m
    memory: 4Gi

# Enable Prometheus metrics
prometheus:
  enabled: true
  port: 9962
  serviceMonitor:
    enabled: true
    labels:
      release: kube-prometheus-stack
```

Install with the values file:

```bash
helm install cilium cilium/cilium \
  --version 1.15.0 \
  --namespace kube-system \
  -f cilium-helm-values.yaml

# Verify installation
cilium status --wait
```

## Step 2: Install Cilium with Kustomize

For Kustomize-based installations, generate manifests from the Helm chart:

```bash
# Generate Cilium manifests from Helm chart
helm template cilium cilium/cilium \
  --version 1.15.0 \
  --namespace kube-system \
  -f cilium-helm-values.yaml > cilium-manifests.yaml

# Create a Kustomize base
mkdir -p cilium-kustomize/base
mv cilium-manifests.yaml cilium-kustomize/base/
```

```yaml
# cilium-kustomize/base/kustomization.yaml - Kustomize base for Cilium
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - cilium-manifests.yaml
namespace: kube-system
```

Create an overlay for production:

```yaml
# cilium-kustomize/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  # Increase resources for production
  - patch: |-
      apiVersion: apps/v1
      kind: DaemonSet
      metadata:
        name: cilium
        namespace: kube-system
      spec:
        template:
          spec:
            containers:
              - name: cilium-agent
                resources:
                  requests:
                    cpu: 200m
                    memory: 1Gi
```

## Step 3: Install Cilium via Flux CD HelmRelease

Flux CD provides the most GitOps-native approach to managing Cilium:

```yaml
# cilium-helmrelease.yaml - Cilium managed as a Flux HelmRelease
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: cilium
  namespace: flux-system
spec:
  interval: 1h
  url: https://helm.cilium.io/
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cilium
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: cilium
      version: "1.15.x"
      sourceRef:
        kind: HelmRepository
        name: cilium
        namespace: flux-system
  values:
    ipam:
      mode: kubernetes
    kubeProxyReplacement: true
    k8sServiceHost: 10.0.0.1
    k8sServicePort: "6443"
    hubble:
      relay:
        enabled: true
      ui:
        enabled: true
    prometheus:
      enabled: true
      serviceMonitor:
        enabled: true
  # Install as a dependency before other Flux resources
  install:
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
```

Apply via kubectl or commit to your GitOps repository:

```bash
# Apply the Flux resources
kubectl apply -f cilium-helmrelease.yaml

# Monitor the Flux-managed installation
flux get helmreleases -n kube-system

# Check Cilium status
cilium status --wait
```

## Best Practices

- Always use a specific `version` in Helm installs - never install without pinning the version
- Store Helm values in Git alongside the HelmRelease for full version control
- Use Flux's `spec.chart.spec.version` with a semantic version range (e.g., `1.15.x`) to enable automatic patch updates
- Run `cilium connectivity test` in CI/CD after every Cilium upgrade
- Use `helm diff` (helm-diff plugin) to preview changes before upgrading

## Conclusion

Helm, Kustomize, and Flux CD all provide reliable ways to install and manage Cilium in production. For GitOps-first teams, Flux CD's HelmRelease is the recommended approach as it ensures Cilium's configuration is always version-controlled and automatically reconciled. Whichever method you choose, pinning versions and storing values in Git are non-negotiable practices for production Cilium deployments.
