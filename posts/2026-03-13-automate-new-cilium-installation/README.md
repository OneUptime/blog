# Automate a New Cilium Installation with Helm and CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, installation, helm, kubernetes, automation, cni, networking

Description: Learn how to automate a production-ready Cilium installation using Helm and the Cilium CLI, with configuration management through GitOps and post-install validation steps.

---

## Introduction

Installing Cilium manually with `cilium install` is straightforward for a single cluster, but automating it for multiple clusters, ensuring consistent configuration, and integrating it into a GitOps or CI/CD pipeline requires a more structured approach. Helm is the standard mechanism for automated Cilium installation, providing declarative configuration, version pinning, and upgrade management.

This guide covers automating a complete Cilium installation: Helm chart configuration, installation scripts, post-install validation, and integration into a CI/CD pipeline or Flux GitOps workflow.

## Prerequisites

- Kubernetes cluster with no existing CNI installed (or CNI replacement mode)
- `helm` v3.12+
- `cilium` CLI v1.14+
- `kubectl` configured with cluster access
- Access to the Cilium Helm chart (`https://helm.cilium.io/`)

## Step 1: Add the Cilium Helm Repository

Set up the Cilium Helm repository and verify the latest available chart version.

```bash
# Add the official Cilium Helm chart repository
helm repo add cilium https://helm.cilium.io/

# Update the Helm repository cache
helm repo update

# List available Cilium chart versions to choose a pinned version
helm search repo cilium/cilium --versions | head -10
```

## Step 2: Create a Cilium Values File

Define your Cilium configuration in a Helm values file. This is the canonical source of truth for your Cilium installation.

```yaml
# cilium-values.yaml
# Production-ready Cilium configuration
# Adjust these values based on your environment and feature requirements

# Cluster identification
cluster:
  name: "production-cluster-01"   # Unique name for this cluster
  id: 1                            # Unique ID for multi-cluster setups

# IPAM configuration
ipam:
  mode: "kubernetes"               # Use Kubernetes node CIDR allocation

# KubeProxy replacement — enables Cilium's eBPF-based kube-proxy replacement
kubeProxyReplacement: true

# Kubernetes API server address (required when kubeProxyReplacement is true)
k8sServiceHost: "10.0.0.1"        # Replace with your API server IP or hostname
k8sServicePort: "6443"

# Enable Hubble for network observability
hubble:
  enabled: true
  relay:
    enabled: true
  ui:
    enabled: true

# Operator configuration
operator:
  replicas: 2                       # Two replicas for HA operator

# Resource limits for Cilium agent DaemonSet
resources:
  requests:
    cpu: 100m
    memory: 512Mi
  limits:
    cpu: 500m
    memory: 1Gi

# Enable Prometheus metrics endpoint
prometheus:
  enabled: true
  serviceMonitor:
    enabled: true                  # Create a Prometheus ServiceMonitor CRD
```

## Step 3: Write the Installation Script

Create a reproducible installation script that handles both fresh installs and upgrades.

```bash
#!/bin/bash
# scripts/install-cilium.sh
# Automates Cilium installation using Helm with validation
# Usage: ./install-cilium.sh [CILIUM_VERSION]

set -euo pipefail

CILIUM_VERSION="${1:-1.15.0}"
CILIUM_NAMESPACE="kube-system"
VALUES_FILE="cilium-values.yaml"
WAIT_TIMEOUT="300s"

echo "=== Installing Cilium v${CILIUM_VERSION} ==="

# Verify the values file exists
if [ ! -f "${VALUES_FILE}" ]; then
  echo "ERROR: Values file ${VALUES_FILE} not found"
  exit 1
fi

# Install or upgrade Cilium using Helm
# --install flag makes this idempotent (installs if not present, upgrades if present)
helm upgrade --install cilium cilium/cilium \
  --version "${CILIUM_VERSION}" \
  --namespace "${CILIUM_NAMESPACE}" \
  --values "${VALUES_FILE}" \
  --wait \                           # Wait for all pods to be ready
  --timeout "${WAIT_TIMEOUT}" \
  --atomic \                         # Roll back automatically on failure
  --create-namespace

echo "Cilium installed. Waiting for full readiness..."

# Use the Cilium CLI to wait for the installation to stabilize
cilium status --wait --wait-duration "${WAIT_TIMEOUT}"

echo ""
echo "=== Post-Install Validation ==="

# Run a basic connectivity test to confirm the CNI is working
cilium connectivity test --test pod-to-pod --timeout 120s

echo ""
echo "=== Cilium v${CILIUM_VERSION} Installation Complete ==="
```

## Step 4: Automate with Flux (GitOps)

For GitOps-managed clusters, deploy Cilium as a Flux `HelmRelease` so updates are handled declaratively.

```yaml
# clusters/production/cilium-helmrelease.yaml
# Manages the Cilium installation via Flux HelmRelease
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: cilium
  namespace: flux-system
spec:
  interval: 1h
  url: https://helm.cilium.io/
---
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: cilium
  namespace: kube-system
spec:
  interval: 10m
  chart:
    spec:
      chart: cilium
      version: "1.15.0"              # Pin to a specific version
      sourceRef:
        kind: HelmRepository
        name: cilium
        namespace: flux-system
  values:
    cluster:
      name: production-cluster-01
    kubeProxyReplacement: true
    k8sServiceHost: "10.0.0.1"
    k8sServicePort: "6443"
    hubble:
      enabled: true
      relay:
        enabled: true
  install:
    remediation:
      retries: 3                     # Retry failed installs 3 times
  upgrade:
    remediation:
      retries: 3
      remediateLastFailure: true
```

## Step 5: Verify the Installation

After automated installation, run the validation commands to confirm Cilium is operating correctly.

```bash
# Check Cilium agent and operator status
cilium status

# Verify all agents are running on every node
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Confirm Hubble relay is running
kubectl get pods -n kube-system -l k8s-app=hubble-relay

# View installed Cilium version
cilium version
```

## Best Practices

- Always pin Cilium to a specific chart version in production — never use `latest` or floating version ranges.
- Use `--atomic` in Helm installs to automatically roll back if the installation fails.
- Store your values file in Git and manage it through a GitOps workflow (Flux or ArgoCD).
- Run `cilium connectivity test` as part of the post-install pipeline to validate the CNI before scheduling application workloads.
- Use separate values files per cluster (dev/staging/prod) with a shared base values file.

## Conclusion

Automating Cilium installation with Helm and integrating it into a CI/CD or GitOps pipeline ensures consistent, reproducible deployments across all your clusters. By combining version-pinned Helm charts, declarative values files, and post-install connectivity testing, you can confidently deploy and upgrade Cilium in production with full auditability.
