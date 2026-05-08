# Upgrade Cilium on k0s with k0sctl

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, k0s, eBPF

Description: A step-by-step guide to upgrading Cilium on k0s Kubernetes clusters managed by k0sctl, including k0s-specific configuration and the upgrade procedure for production deployments.

---

## Introduction

k0s is a lightweight Kubernetes distribution that supports custom CNI providers, including Cilium. k0sctl, its cluster management tool, provides a declarative approach to cluster configuration and k0s versioning. When Cilium is deployed on a k0s cluster, keep the k0s network provider set to `custom` and manage the Cilium version with the Cilium CLI or Helm.

k0s bundles Kube-router and Calico as built-in network providers. Cilium is installed separately after k0sctl provisions the cluster, so upgrading k0s itself does not upgrade Cilium. Treat the k0s upgrade and the Cilium upgrade as related but separate changes.

This guide covers the upgrade procedure for Cilium on k0s clusters, including the k0sctl-managed k0s upgrade path and the standalone Cilium upgrade.

## Prerequisites

- k0s cluster provisioned with k0sctl
- `k0sctl` installed and configured
- `kubectl` with cluster-admin access
- `cilium` CLI installed
- `hubble` CLI installed (if validating Hubble)
- SSH access to k0s nodes (or k0sctl configuration with SSH keys)

## Step 1: Check Current k0s and Cilium Versions

Verify the current state before planning the upgrade.

```bash
# Check k0sctl version

k0sctl version

# Check k0s cluster version
k0sctl kubeconfig --config k0sctl.yaml > k0s.config
kubectl --kubeconfig k0s.config version

# Check current Cilium version and status
cilium version
cilium status

# Verify Cilium is installed and healthy
kubectl get pods -n kube-system -l app.kubernetes.io/name=cilium

# Check k0s cluster configuration
k0sctl apply --config k0sctl.yaml --dry-run
```

## Step 2: Review k0s Cluster Configuration

Examine the current k0sctl configuration to understand how Cilium is managed.

```yaml
# Example k0sctl.yaml with Cilium configuration
# This shows the k0s cluster spec for a custom CNI such as Cilium
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
    version: "v1.35.2+k0s.0"
    config:
      apiVersion: k0s.k0sproject.io/v1beta1
      kind: ClusterConfig
      metadata:
        name: k0s
      spec:
        network:
          # k0s does not manage Cilium directly; Cilium is installed separately
          provider: custom
          # Disable kube-proxy only if Cilium is configured for kube-proxy replacement
          kubeProxy:
            disabled: true
```

```bash
# Check the current k0sctl configuration
cat k0sctl.yaml | grep -A 10 "network:"
```

## Step 3: Upgrade k0s via k0sctl

Update the k0sctl configuration and apply the k0s upgrade.

```bash
# Update k0s version in k0sctl.yaml to the new version
# This does not update Cilium; Cilium is managed separately
# Edit k0sctl.yaml and change:
# version: "v1.35.2+k0s.0" -> version: "v1.35.3+k0s.0"

# Validate the configuration before applying
k0sctl apply --config k0sctl.yaml --dry-run

# Apply the upgrade (k0sctl handles rolling upgrade of controllers and workers)
k0sctl apply --config k0sctl.yaml

# Monitor the upgrade progress
kubectl get nodes -w
```

## Step 4: Upgrade Cilium Independently (Optional)

Upgrade Cilium independently after confirming that your target Cilium version supports the Kubernetes version provided by your k0s release.

```bash
# Upgrade Cilium via Helm
helm repo add cilium https://helm.cilium.io/
helm repo update

# Check if Cilium is already managed by Helm
helm list -n kube-system | grep cilium

# Save the current Helm values and review them against the target Cilium version
helm get values cilium --namespace kube-system -o yaml > old-values.yaml

# Upgrade one minor release at a time and preserve the values required for your cluster
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --version 1.19.3 \
  -f old-values.yaml \
  --atomic \
  --timeout 10m

# Monitor upgrade
kubectl rollout status daemonset/cilium -n kube-system
kubectl rollout status deployment/cilium-operator -n kube-system
```

## Step 5: Post-Upgrade Validation

Verify Cilium and k0s cluster health after the upgrade.

```bash
# Check new Cilium version
cilium version

# Verify Cilium is healthy
cilium status --wait

# Check all pods are running
kubectl get pods -A | grep -v Running | grep -v Completed

# Run Cilium connectivity test
cilium connectivity test

# Verify Hubble is functioning (if enabled)
cilium hubble port-forward &
hubble status
```

## Best Practices

- Pin the k0s version in k0sctl.yaml and the Cilium chart or CLI version in your Cilium deployment workflow
- Use k0sctl's built-in rolling upgrade for control plane updates before worker node updates
- Test k0s + Cilium upgrades in a dev cluster that mirrors your production k0sctl configuration
- Keep k0sctl configuration files in version control alongside application manifests
- Take a `k0sctl backup` before major version upgrades and monitor k0s component health during the rollout

## Conclusion

Upgrading Cilium on k0s with k0sctl-managed clusters is straightforward when you keep the responsibilities separate: update the k0s version in k0sctl.yaml and apply the configuration, then upgrade Cilium with the Cilium CLI or Helm. In both cases, pre-upgrade validation and post-upgrade connectivity testing ensure the k0s cluster's networking remains healthy throughout the upgrade process.
