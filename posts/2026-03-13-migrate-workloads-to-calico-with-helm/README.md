# Migrate Workloads to Calico with Helm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Migration, Helm, CNI

Description: Learn how to install and manage Calico using the official Helm chart, enabling GitOps-friendly deployment workflows and easy configuration management for production Kubernetes clusters.

---

## Introduction

Helm is the de facto package manager for Kubernetes, and Calico provides an official Helm chart through the Tigera operator chart. Using Helm to install Calico brings several advantages: version-controlled configuration via `values.yaml`, easy upgrades through `helm upgrade`, and seamless integration with GitOps pipelines using Flux or Argo CD.

Migrating an existing Calico installation to Helm management - or performing a fresh Calico install via Helm - enables teams to manage Calico configuration as code alongside their other Helm-based workloads. This is particularly valuable in organizations that standardize on Helm for all cluster component management.

This guide covers adding the Calico Helm repository, installing Calico via Helm, configuring IP pools and encapsulation through Helm values, and integrating with GitOps workflows for ongoing management.

## Prerequisites

- Kubernetes cluster v1.27+ without an existing CNI, or with an existing CNI to replace
- Helm v3.10+ installed
- `kubectl` with cluster-admin access
- `calicoctl` v3.27+ installed for post-install validation
- Helm repository access to `projectcalico.org`

## Step 1: Add the Calico Helm Repository

Register the official Calico Helm repository with your Helm client.

Add and update the Tigera operator Helm repository:

```bash
# Add the Calico Helm repository
helm repo add projectcalico https://docs.tigera.io/calico/charts

# Update the local Helm chart cache
helm repo update

# Search for available Calico chart versions
helm search repo projectcalico --versions | head -10
```

## Step 2: Create a Calico values.yaml

Define your Calico configuration as a Helm values file for reproducibility.

Create a values file with your cluster-specific settings:

```yaml
# calico-values.yaml - Helm values for Calico installation
# This file should be stored in version control

tigera-operator:
  # Resource requests for the Tigera operator
  resources:
    requests:
      cpu: 150m
      memory: 128Mi

installation:
  enabled: true
  calicoNetwork:
    bgp: Disabled                 # Set to Enabled if BGP peering is needed
    ipPools:
    - blockSize: 26
      cidr: 192.168.0.0/16        # Must match --cluster-cidr in kubelet config
      encapsulation: VXLAN        # VXLAN, IPIP, or None
      natOutgoing: Enabled
      nodeSelector: all()
  # Enable eBPF for improved performance (optional)
  # calicoNetwork:
  #   linuxDataplane: BPF
```

## Step 3: Install Calico via Helm

Deploy Calico using the Helm chart and your custom values file.

Install the Tigera operator and Calico using Helm:

```bash
# Create the tigera-operator namespace
kubectl create namespace tigera-operator

# Install Calico using the Helm chart and custom values
helm install calico projectcalico/tigera-operator \
  --namespace tigera-operator \
  --values calico-values.yaml \
  --version v3.27.0 \
  --wait \
  --timeout 5m

# Verify the Helm release is deployed
helm list -n tigera-operator
```

## Step 4: Integrate with GitOps Using Flux

Manage the Calico Helm chart through Flux for continuous reconciliation.

Create a Flux HelmRelease for the Calico Tigera operator:

```yaml
# calico-helmrelease.yaml - Flux HelmRelease for Calico management
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: calico
  namespace: flux-system
spec:
  interval: 12h
  url: https://docs.tigera.io/calico/charts
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: calico
  namespace: tigera-operator
spec:
  interval: 30m
  chart:
    spec:
      chart: tigera-operator
      version: "3.27.*"
      sourceRef:
        kind: HelmRepository
        name: calico
        namespace: flux-system
  values:
    installation:
      calicoNetwork:
        ipPools:
        - blockSize: 26
          cidr: 192.168.0.0/16
          encapsulation: VXLAN
          natOutgoing: Enabled
```

Apply the Flux resources:

```bash
kubectl apply -f calico-helmrelease.yaml
```

## Step 5: Validate and Monitor

Verify the Calico Helm installation and confirm workload connectivity.

Check that all Calico components are healthy after Helm installation:

```bash
# Verify Helm release status
helm status calico -n tigera-operator

# Check Calico system pods
kubectl get pods -n calico-system

# Validate IP pool configuration via calicoctl
calicoctl get ippools -o wide

# Test pod-to-pod connectivity
kubectl run test --image=curlimages/curl --rm -it -- curl http://kubernetes.default.svc
```

## Best Practices

- Store `calico-values.yaml` in a Git repository alongside your other infrastructure-as-code files
- Use Helm's `--atomic` flag during upgrades to automatically roll back on failure
- Pin Calico chart versions in production and follow a testing-then-promote upgrade process
- Enable Helm diff plugin to preview changes before applying `helm upgrade`
- Monitor Calico with OneUptime after each Helm upgrade to validate network connectivity is maintained

## Conclusion

Managing Calico with Helm brings the benefits of GitOps-friendly infrastructure-as-code to your cluster networking layer. By combining Helm's version management with Flux for continuous reconciliation, you can ensure your Calico configuration is always in the desired state and easily roll back changes if issues arise. Integrate with OneUptime to monitor network health after each Calico upgrade and receive immediate alerts on connectivity degradation.
