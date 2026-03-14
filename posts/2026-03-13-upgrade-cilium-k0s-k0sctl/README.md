# Upgrade Cilium on k0s with k0sctl

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, K0s, EBPF

Description: A step-by-step guide to upgrading Cilium on k0s Kubernetes clusters managed by k0sctl, including k0s-specific configuration and the upgrade procedure for production deployments.

---

## Introduction

k0s is a lightweight Kubernetes distribution that bundles Cilium as a first-class CNI option. k0sctl, its cluster management tool, provides a declarative approach to cluster configuration including CNI versioning. When Cilium is deployed as part of a k0s cluster, upgrades can be managed either through k0sctl's cluster configuration or independently via Helm.

k0s integrates Cilium deeply into its networking stack, handling certificate rotation, CNI binary installation, and configuration generation automatically. This integration means that upgrading k0s itself often updates Cilium as a bundled component, but you can also manage Cilium upgrades independently when you need a specific version.

This guide covers the upgrade procedure for Cilium on k0s clusters, including both the k0sctl-managed upgrade path and standalone Cilium upgrades.

## Prerequisites

- k0s cluster provisioned with k0sctl
- `k0sctl` installed and configured
- `kubectl` with cluster-admin access
- `cilium` CLI installed
- SSH access to k0s nodes (or k0sctl configuration with SSH keys)

## Step 1: Check Current k0s and Cilium Versions

Verify the current state before planning the upgrade.

```bash
# Check k0sctl version
k0sctl version

# Check k0s cluster version
k0sctl kubeconfig --config k0sctl.yaml | kubectl --kubeconfig - version

# Check current Cilium version
cilium version

# Verify Cilium is installed and healthy
kubectl get pods -n kube-system -l app.kubernetes.io/name=cilium

# Check k0s cluster configuration
k0sctl apply --config k0sctl.yaml --dry-run
```

## Step 2: Review k0s Cluster Configuration

Examine the current k0sctl configuration to understand how Cilium is managed.

```yaml
# Example k0sctl.yaml with Cilium configuration
# This shows the typical k0s cluster spec with Cilium CNI
apiVersion: k0sctl.k0sproject.io/v1beta1
kind: Cluster
metadata:
  name: k0s-cluster
spec:
  hosts:
  - role: controller
    ssh:
      address: 192.168.1.10
      user: ubuntu
      port: 22
  - role: worker
    ssh:
      address: 192.168.1.11
      user: ubuntu
      port: 22
  k0s:
    version: "1.29.0+k0s.0"
    config:
      spec:
        network:
          # Configure Cilium as the CNI provider
          provider: cilium
          cilium:
            mode: vxlan
```

```bash
# Check the current k0sctl configuration
cat k0sctl.yaml | grep -A 10 "network:"
```

## Step 3: Upgrade k0s and Cilium via k0sctl

Update the k0sctl configuration and apply the upgrade.

```bash
# Update k0s version in k0sctl.yaml to the new version
# This also updates bundled Cilium to the version bundled with the new k0s release
# Edit k0sctl.yaml and change:
# version: "1.29.0+k0s.0" -> version: "1.30.0+k0s.0"

# Validate the configuration before applying
k0sctl apply --config k0sctl.yaml --dry-run

# Apply the upgrade (k0sctl handles rolling upgrade of control plane and workers)
k0sctl apply --config k0sctl.yaml

# Monitor the upgrade progress
kubectl get nodes -w
```

## Step 4: Upgrade Cilium Independently (Optional)

For a specific Cilium version not bundled with your k0s version, upgrade Cilium independently.

```bash
# Install Cilium via Helm independent of k0s bundled version
helm repo add cilium https://helm.cilium.io/
helm repo update

# Check if Cilium is already managed by Helm
helm list -n kube-system | grep cilium

# If not Helm-managed, install Helm chart alongside k0s-managed installation
helm upgrade --install cilium cilium/cilium \
  --namespace kube-system \
  --version 1.15.0 \
  --reuse-values \
  --atomic \
  --timeout 10m

# Monitor upgrade
kubectl rollout status daemonset/cilium -n kube-system
```

## Step 5: Post-Upgrade Validation

Verify Cilium and k0s cluster health after the upgrade.

```bash
# Check new Cilium version
cilium version

# Verify all k0s components are healthy
k0sctl apply --config k0sctl.yaml --dry-run

# Check all pods are running
kubectl get pods -A | grep -v Running | grep -v Completed

# Run Cilium connectivity test
cilium connectivity test

# Verify Hubble is functioning (if enabled)
cilium hubble enable
cilium hubble port-forward &
hubble status
```

## Best Practices

- Pin both k0s and Cilium versions in k0sctl.yaml for reproducible clusters
- Use k0sctl's built-in rolling upgrade for control plane updates before worker node updates
- Test k0s + Cilium upgrades in a dev cluster that mirrors your production k0sctl configuration
- Keep k0sctl configuration files in version control alongside application manifests
- Monitor k0s component health with `k0sctl backup` before major version upgrades

## Conclusion

Upgrading Cilium on k0s with k0sctl is straightforward when using the bundled CNI approach: update the k0s version in k0sctl.yaml and apply the configuration. For independent Cilium upgrades beyond k0s's bundled version, Helm provides the flexibility needed. In both cases, pre-upgrade validation and post-upgrade connectivity testing ensure the k0s cluster's networking remains healthy throughout the upgrade process.
