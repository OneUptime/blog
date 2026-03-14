# How to Use talosctl upgrade-k8s for Kubernetes Upgrades

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Talosctl, Kubernetes, Upgrade, Cluster Management

Description: Learn how to use talosctl upgrade-k8s to upgrade the Kubernetes version running on your Talos Linux cluster safely

---

Upgrading Kubernetes is separate from upgrading Talos Linux itself. While `talosctl upgrade` updates the Talos operating system, `talosctl upgrade-k8s` handles upgrading the Kubernetes components - the API server, controller manager, scheduler, kubelet, and other Kubernetes-specific pieces. This separation gives you flexibility to update each layer independently.

## Understanding the Difference

It is important to understand what gets upgraded with each command:

- `talosctl upgrade` - Upgrades the Talos Linux operating system (kernel, init system, base tools)
- `talosctl upgrade-k8s` - Upgrades Kubernetes components (API server, etcd, kubelet, kube-proxy, CoreDNS)

You might upgrade Talos Linux without changing the Kubernetes version, or upgrade Kubernetes without changing the Talos version. However, each Talos Linux release supports a specific range of Kubernetes versions, so you need to check compatibility.

## Basic Usage

To upgrade Kubernetes on your cluster:

```bash
# Upgrade Kubernetes to a specific version
talosctl upgrade-k8s --nodes 192.168.1.10 --to 1.30.0
```

You only need to run this command against one control plane node. The upgrade process handles all nodes in the cluster automatically.

## Pre-Upgrade Preparation

Before upgrading Kubernetes, make sure your cluster is healthy and backed up:

```bash
# Check current Kubernetes version
kubectl version

# Check node status
kubectl get nodes

# Verify all pods are healthy
kubectl get pods -A | grep -v Running | grep -v Completed

# Check etcd health
talosctl etcd members --nodes 192.168.1.10

# Take an etcd backup
talosctl etcd snapshot ./pre-k8s-upgrade-$(date +%Y%m%d).snapshot \
  --nodes 192.168.1.10

# Check the current Talos version
talosctl version --nodes 192.168.1.10
```

## Checking Version Compatibility

Each Talos Linux release supports specific Kubernetes versions. Before upgrading, verify compatibility:

```bash
# Check the current Talos version
talosctl version --nodes 192.168.1.10

# Refer to Talos documentation for the compatibility matrix
# Example: Talos v1.7.x supports Kubernetes v1.28.x through v1.30.x
```

Attempting to upgrade to a Kubernetes version outside the supported range will fail. If you need a newer Kubernetes version, you might need to upgrade Talos Linux first.

## The Upgrade Process

When you run `talosctl upgrade-k8s`, the following happens:

1. The command validates that the target version is compatible with the current Talos version.
2. Control plane components are upgraded (API server, controller manager, scheduler).
3. kubelet is upgraded on all nodes.
4. Core Kubernetes add-ons are upgraded (kube-proxy, CoreDNS).

The process is rolling by nature - each component is upgraded one at a time to maintain cluster availability.

```bash
# Start the Kubernetes upgrade
talosctl upgrade-k8s --nodes 192.168.1.10 --to 1.30.0

# The command will output progress as it goes:
# updating kube-apiserver to v1.30.0
# updating kube-controller-manager to v1.30.0
# updating kube-scheduler to v1.30.0
# updating kubelet on node 192.168.1.10
# updating kubelet on node 192.168.1.11
# updating kubelet on node 192.168.1.12
# updating kubelet on node 192.168.1.20
# ...
```

## Monitoring the Upgrade

While the upgrade is running, you can monitor progress from another terminal:

```bash
# Watch Kubernetes node versions change
kubectl get nodes -w

# Watch pod status in kube-system
kubectl get pods -n kube-system -w

# Check API server availability
kubectl cluster-info

# Monitor events
kubectl get events -n kube-system --sort-by=.lastTimestamp
```

## Upgrading One Minor Version at a Time

Kubernetes supports upgrading one minor version at a time. You should not skip minor versions:

```bash
# Correct: Upgrade from 1.28 to 1.29
talosctl upgrade-k8s --nodes 192.168.1.10 --to 1.29.0

# Then from 1.29 to 1.30
talosctl upgrade-k8s --nodes 192.168.1.10 --to 1.30.0

# Incorrect: Do NOT skip from 1.28 to 1.30
# talosctl upgrade-k8s --nodes 192.168.1.10 --to 1.30.0  # if currently on 1.28
```

Skipping minor versions can cause API compatibility issues and break your cluster.

## Handling Deprecated APIs

Before upgrading Kubernetes, check if you are using any APIs that will be removed in the target version:

```bash
# Use kubectl to check for deprecated APIs
kubectl get apiservices

# Install and run a tool like pluto to check for deprecated APIs
# https://github.com/FairwindsOps/pluto
pluto detect-helm -o wide
pluto detect-files -d ./k8s-manifests/
```

If your workloads use deprecated APIs, update them before upgrading Kubernetes. Otherwise, they might stop working after the upgrade.

## Post-Upgrade Verification

After the upgrade completes, verify everything is working:

```bash
# Check Kubernetes version
kubectl version

# Verify all nodes are running the new version
kubectl get nodes -o wide

# Check all system pods are running
kubectl get pods -n kube-system

# Run a quick smoke test
kubectl run test-pod --image=busybox --rm -it -- echo "Kubernetes is working"

# Check node conditions
kubectl describe nodes | grep -A5 "Conditions:"

# Verify cluster DNS is working
kubectl run dns-test --image=busybox --rm -it -- nslookup kubernetes.default
```

## Upgrading in a Specific Order

The `talosctl upgrade-k8s` command handles the upgrade order automatically, but it is good to understand what happens:

1. **API server, controller manager, scheduler**: These are upgraded first on each control plane node, one node at a time.
2. **kubelet**: Upgraded on each node, starting with control plane nodes and then worker nodes.
3. **kube-proxy**: Updated across all nodes.
4. **CoreDNS**: Updated.

This order ensures backward compatibility since the API server is upgraded before kubelet.

## Dry Run

Before performing the actual upgrade, you can do a dry run:

```bash
# Dry run to see what will change
talosctl upgrade-k8s --nodes 192.168.1.10 --to 1.30.0 --dry-run
```

The dry run shows you exactly what changes will be made without actually applying them. This is useful for reviewing the upgrade plan before committing to it.

## Rolling Back a Kubernetes Upgrade

If something goes wrong after a Kubernetes upgrade, you can downgrade by running `upgrade-k8s` with the previous version:

```bash
# Roll back to the previous version
talosctl upgrade-k8s --nodes 192.168.1.10 --to 1.29.5
```

However, rollbacks are not always clean. Some Kubernetes versions store data in etcd in formats that are not backward compatible. This is why etcd backups before upgrades are essential:

```bash
# If rollback does not work cleanly, restore the etcd backup
# This is a last resort and requires taking down the cluster
```

## Automating Kubernetes Upgrades

For organizations with multiple clusters, you can script the upgrade process:

```bash
#!/bin/bash
# k8s-upgrade.sh - Automated Kubernetes upgrade script

CLUSTERS=(
  "dev:192.168.1.10"
  "staging:10.0.1.10"
  "production:10.0.2.10"
)

TARGET_VERSION="1.30.0"

for cluster_info in "${CLUSTERS[@]}"; do
  IFS=':' read -r cluster_name node <<< "$cluster_info"

  echo "=== Upgrading $cluster_name cluster ==="

  # Take backup
  talosctl etcd snapshot "./${cluster_name}-pre-upgrade.snapshot" \
    --nodes "$node"

  # Check current version
  echo "Current version:"
  kubectl --context "$cluster_name" version --short 2>/dev/null

  # Perform upgrade
  talosctl upgrade-k8s --nodes "$node" --to "$TARGET_VERSION"

  # Verify
  echo "Post-upgrade version:"
  kubectl --context "$cluster_name" version --short 2>/dev/null

  # Health check
  talosctl health --nodes "$node" --wait-timeout 5m

  echo "=== $cluster_name upgrade complete ==="
  echo ""
done
```

## Common Issues and Solutions

### Upgrade Hangs

If the upgrade seems stuck:

```bash
# Check what is happening
kubectl get pods -n kube-system
kubectl get events -n kube-system --sort-by=.lastTimestamp

# Check if a specific component is failing to start
talosctl logs kube-apiserver --nodes 192.168.1.10 | tail -50
```

### Component Fails to Start After Upgrade

```bash
# Check component logs
talosctl logs kube-apiserver --nodes 192.168.1.10
talosctl logs kube-controller-manager --nodes 192.168.1.10
talosctl logs kube-scheduler --nodes 192.168.1.10

# Check kubelet logs
talosctl logs kubelet --nodes 192.168.1.10
```

### Node Not Ready After Upgrade

```bash
# Check node conditions
kubectl describe node <node-name>

# Check kubelet status
talosctl services --nodes 192.168.1.20 | grep kubelet

# Restart kubelet if needed
talosctl service kubelet restart --nodes 192.168.1.20
```

## Best Practices

- Always take an etcd backup before upgrading Kubernetes.
- Upgrade one minor version at a time, never skip versions.
- Check for deprecated API usage before upgrading.
- Use the dry-run flag to preview changes.
- Test upgrades in a non-production environment first.
- Monitor the cluster throughout the upgrade process.
- Verify all components and workloads after the upgrade.
- Keep Talos Linux and Kubernetes versions within the supported compatibility matrix.
- Plan Kubernetes upgrades as part of your regular maintenance schedule.
- Document the upgrade process and any issues encountered for future reference.

The `talosctl upgrade-k8s` command makes Kubernetes upgrades on Talos Linux straightforward and reliable. By following the practices outlined here, you can keep your Kubernetes version current while minimizing risk to your workloads.
