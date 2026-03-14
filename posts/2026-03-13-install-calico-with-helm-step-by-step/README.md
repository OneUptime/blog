# Install Calico with Helm Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Helm, Kubernetes, CNI, Networking, Installation

Description: Step-by-step guide to installing Calico on Kubernetes using Helm charts for declarative, version-pinned installations.

---

## Introduction

While the Tigera Operator is the recommended installation method for Calico, Helm provides an alternative approach that integrates naturally with existing Helm-based infrastructure toolchains and GitOps workflows. Installing Calico with Helm allows you to pin versions, customize values, and manage upgrades as standard Helm releases.

This guide covers installing Calico using the official Tigera Helm charts, which wrap the Operator and CRDs for a complete Helm-managed installation.

## Prerequisites

- Kubernetes cluster (v1.25+)
- Helm 3 installed
- `kubectl` cluster-admin access
- `calicoctl` installed for policy management

## Step 1: Add the Tigera Helm Repository

```bash
# Add the official Tigera Helm repository
helm repo add projectcalico https://docs.tigera.io/calico/charts

# Update the local Helm cache
helm repo update

# List available Calico chart versions
helm search repo projectcalico/tigera-operator --versions
```

## Step 2: Install Calico via Helm

Install the Tigera Operator and Calico CRDs:

```bash
# Create the tigera-operator namespace (required before Helm install)
kubectl create namespace tigera-operator

# Install the Tigera Operator with Calico using Helm
helm install calico projectcalico/tigera-operator \
  --version v3.27.0 \
  --namespace tigera-operator \
  --set installation.cni.type=Calico \
  --set installation.calicoNetwork.ipPools[0].cidr=192.168.0.0/16 \
  --set installation.calicoNetwork.ipPools[0].encapsulation=VXLAN

# Monitor the installation
kubectl get tigerastatus --watch
```

For a more reproducible installation, use a `values.yaml` file:

```yaml
# calico-values.yaml - Helm values for Calico installation
installation:
  enabled: true
  # Configure the CNI type
  cni:
    type: Calico
  calicoNetwork:
    bgp: Disabled
    ipPools:
      - name: default-ipv4-ippool
        # Set this to your Kubernetes pod CIDR
        cidr: 192.168.0.0/16
        encapsulation: VXLAN
        natOutgoing: Enabled
        nodeSelector: all()
    # Optimal MTU for VXLAN
    mtu: 1450
  # Number of Typha replicas (0 = disabled for small clusters)
  typhaMetricsPort: 9093
  nodeMetricsPort: 9091

# Disable automatic installation of Calico API server (for custom setups)
apiServer:
  enabled: true

# Configure node affinity if needed
nodeSelector: {}
```

Apply with the values file:

```bash
# Install Calico with custom values
helm install calico projectcalico/tigera-operator \
  --version v3.27.0 \
  --namespace tigera-operator \
  --create-namespace \
  -f calico-values.yaml

# Verify the installation
helm status calico -n tigera-operator
kubectl wait --for=condition=Ready tigerastatus/calico --timeout=300s
kubectl get pods -n calico-system
```

## Step 3: Configure calicoctl

```bash
# Set up calicoctl with Kubernetes datastore
export CALICO_DATASTORE_TYPE=kubernetes
export CALICO_KUBECONFIG=~/.kube/config

# Verify calicoctl connectivity
calicoctl get nodes

# Check IP pools installed by Helm
calicoctl get ippools -o wide
```

## Step 4: Upgrade Calico with Helm

Helm makes Calico upgrades straightforward:

```bash
# Check the current installed version
helm list -n tigera-operator

# Upgrade to a new version
helm upgrade calico projectcalico/tigera-operator \
  --version v3.28.0 \
  --namespace tigera-operator \
  -f calico-values.yaml

# Monitor the upgrade
kubectl get tigerastatus --watch
kubectl get pods -n calico-system --watch
```

## Step 5: Manage with Flux CD

Integrate the Calico Helm release into your Flux GitOps workflow:

```yaml
# calico-helmrelease.yaml - Manage Calico via Flux HelmRelease
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: projectcalico
  namespace: flux-system
spec:
  interval: 1h
  url: https://docs.tigera.io/calico/charts
---
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: calico
  namespace: tigera-operator
spec:
  interval: 1h
  chart:
    spec:
      chart: tigera-operator
      version: "v3.27.x"
      sourceRef:
        kind: HelmRepository
        name: projectcalico
        namespace: flux-system
  values:
    installation:
      enabled: true
      cni:
        type: Calico
      calicoNetwork:
        ipPools:
          - name: default-ipv4-ippool
            cidr: 192.168.0.0/16
            encapsulation: VXLAN
            natOutgoing: Enabled
```

## Best Practices

- Always pin to a specific Calico version in Helm installs — never use floating versions in production
- Store Helm values in Git and use Flux HelmRelease for GitOps-managed Calico lifecycle
- Test Helm upgrades in staging before production — Calico upgrades require node-level changes
- Use `helm diff` (helm-diff plugin) to preview changes before applying upgrades
- Back up Calico CRD data with `calicoctl export` before major version upgrades

## Conclusion

Installing Calico with Helm provides a clean, version-controlled, and upgrade-friendly alternative to raw manifest installation. When combined with Flux CD's HelmRelease, it becomes fully GitOps-managed — ensuring your Calico version and configuration are always declared in Git. This approach is recommended for teams already using Helm as their primary Kubernetes package management tool.
