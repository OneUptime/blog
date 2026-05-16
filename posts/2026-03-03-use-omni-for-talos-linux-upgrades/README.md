# How to Use Omni for Talos Linux Upgrades

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Omni, Kubernetes, Upgrade, Cluster Management

Description: Step-by-step guide to performing Talos Linux upgrades through Sidero Omni, including rolling upgrades, version management, and rollback strategies.

---

Upgrading Talos Linux across a cluster can be nerve-wracking, especially in production. You need to update the OS on every node without losing workloads, breaking etcd quorum, or causing extended downtime. Sidero Omni simplifies this process by providing a managed upgrade workflow that handles the sequencing and health checks for you.

This post walks through how to use Omni to upgrade your Talos Linux clusters safely, covering both the Talos OS upgrades and Kubernetes version upgrades.

## Understanding the Upgrade Path

Talos Linux has two separate version tracks that you need to manage. The first is the Talos OS version itself, which controls the operating system, system services, and the machine configuration format. The second is the Kubernetes version, which controls the API server, kubelet, controller manager, and other Kubernetes components.

Omni can handle both types of upgrades. In most cases, you will upgrade the Talos OS first and then the Kubernetes version, though this depends on the specific compatibility matrix for the versions you are targeting.

```bash
# Check current versions across your cluster

omnictl cluster status my-cluster

# Example output showing version info
# Talos Version: v1.5.5
# Kubernetes Version: v1.28.4
# Target Talos Version: v1.6.0
# Target Kubernetes Version: v1.29.0
```

## Pre-Upgrade Checklist

Before starting any upgrade, run through this checklist.

First, verify that your current cluster is healthy. Do not upgrade a cluster that already has issues. The upgrade process assumes a healthy starting state.

```bash
# Check cluster health through Omni
omnictl cluster status my-cluster

# Verify all nodes are ready in Kubernetes
kubectl get nodes
# All nodes should show Ready status

# Check etcd health
talosctl -n 10.0.0.1 etcd status
talosctl -n 10.0.0.1 etcd alarm list
# The member should be healthy and show no active alarms
```

Second, review the release notes for the target version. Talos release notes document breaking changes, deprecated features, and required configuration updates. Skipping this step can lead to surprises during the upgrade.

Third, make sure you have a recent etcd backup. While Omni handles upgrades carefully, having a backup means you can recover from worst-case scenarios.

```bash
# Check the latest etcd backup status for the cluster
omnictl get etcdbackupstatus my-cluster -o yaml

# Trigger a manual etcd backup before upgrading
cat <<EOF > etcd-manual-backup.yaml
metadata:
  namespace: ephemeral
  type: EtcdManualBackups.omni.sidero.dev
  id: my-cluster
spec:
  backupat:
    seconds: $(date +%s)
    nanos: 0
EOF

omnictl apply -f etcd-manual-backup.yaml
```

## Upgrading Talos OS Through Omni

The Talos OS upgrade is performed through the Omni dashboard or by updating a cluster template with `omnictl`. Omni handles the rolling upgrade process, updating one node at a time and waiting for it to come back healthy before moving to the next one.

### Using the Dashboard

In the Omni dashboard, navigate to your cluster and look for the upgrade option. If a newer Talos version is available, Omni will show it as a suggested upgrade. Click the upgrade button, confirm the target version, and Omni starts the process.

The dashboard shows real-time progress as each node is upgraded. You can see which node is currently being updated, which ones have completed, and which ones are still waiting.

### Using the CLI

For automated workflows or when you prefer the command line, use `omnictl` with a cluster template. Export the current template, change the Talos version in the `kind: Cluster` document, and sync the template back to Omni.

```bash
# Export the current cluster template
omnictl cluster template export my-cluster \
  --output cluster-template.yaml

# Edit cluster-template.yaml so the Cluster document contains:
# talos:
#   version: v1.6.0

# Preview and apply the template change
omnictl cluster template diff --file cluster-template.yaml
omnictl cluster template sync --file cluster-template.yaml

# Watch the upgrade progress
omnictl cluster status my-cluster

# The upgrade proceeds node by node
# Control plane nodes are upgraded first, then workers
```

## How the Rolling Upgrade Works

Omni follows a specific sequence when upgrading nodes.

For control plane nodes, Omni upgrades them one at a time. Before upgrading a control plane node, it verifies that etcd has quorum and that the Kubernetes API server is responding. After upgrading the node, it waits for the node to rejoin the cluster, for etcd to report it as healthy, and for the kubelet to become Ready. Only then does it move to the next control plane node.

For worker nodes, the process is similar but without the etcd checks. Omni cordons the node (marking it as unschedulable), drains workloads to other nodes, performs the upgrade, and then uncordons it once it is back online.

```bash
# You can monitor the drain process from kubectl
kubectl get pods --all-namespaces --field-selector spec.nodeName=worker-01

# Watch for pods being evicted and rescheduled
kubectl get events --field-selector reason=Evicted --watch
```

## Upgrading Kubernetes Version

After the Talos OS is upgraded, you can upgrade the Kubernetes version. This is a separate operation in Omni.

```bash
# Export the current cluster template
omnictl cluster template export my-cluster \
  --output cluster-template.yaml

# Edit cluster-template.yaml so the Cluster document contains:
# kubernetes:
#   version: v1.29.0

# Run Kubernetes upgrade pre-checks, then apply the template change
omnictl cluster kubernetes upgrade-pre-checks my-cluster --to v1.29.0
omnictl cluster template diff --file cluster-template.yaml
omnictl cluster template sync --file cluster-template.yaml

# This upgrades the Kubernetes components:
# - API server
# - Controller manager
# - Scheduler
# - Kubelet
# - Kube-proxy
```

The Kubernetes upgrade pre-pulls the new component images, renders new static pod definitions, waits for those changes to propagate to the API server, updates the `kube-proxy` daemonset, and then updates the kubelet on each node.

## Handling Upgrade Failures

Sometimes an upgrade does not go as planned. A node might fail to come back online, or a health check might not pass. Omni handles this by pausing the upgrade and notifying you through the dashboard.

If a node fails during upgrade, you have several options.

```bash
# Check the status of the stuck upgrade
omnictl cluster status my-cluster

# Look at the problematic machine's logs
omnictl machine-logs <machine-id> --tail 100

# Check if the node is in maintenance mode
talosctl -n <node-ip> version

# If the upgrade cannot proceed, cancel it from the Omni UI
# and inspect the machine before retrying the upgrade.
```

For a rollback, you can cancel the upgrade in the Omni UI if the operation is still in progress and the node is responsive. Talos uses an A/B partition scheme, so canceling can revert the node to the previous version. If you need to downgrade after the upgrade has completed, select an older supported Talos version in the Omni UI or change the template back to that version and sync it.

```bash
# After editing cluster-template.yaml back to the previous Talos version
omnictl cluster template sync --file cluster-template.yaml
```

## Scheduling Upgrades

For production clusters, you probably do not want to start an upgrade in the middle of a business day. While Omni does not have a built-in scheduling feature, you can use your CI/CD system to trigger upgrades at specific times.

```yaml
# Example GitHub Actions workflow for scheduled upgrades
name: Talos Upgrade
on:
  schedule:
    # Run at 2 AM UTC on Saturday
    - cron: '0 2 * * 6'

jobs:
  upgrade:
    runs-on: ubuntu-latest
    steps:
      - name: Install omnictl
        run: |
          # Download and install the Omni CLI
          OMNICTL="omnictl-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/amd64/; s/aarch64/arm64/')"
          curl -LO "https://github.com/siderolabs/omni/releases/latest/download/${OMNICTL}"
          chmod +x "${OMNICTL}"
          sudo mv "${OMNICTL}" /usr/local/bin/omnictl

      - name: Verify cluster health
        run: |
          omnictl cluster status production-cluster

      - name: Start Talos upgrade
        run: |
          omnictl cluster template diff --file production-cluster.yaml
          omnictl cluster template sync --file production-cluster.yaml
```

## Upgrading Multiple Clusters

If you manage multiple clusters, upgrade them in order of risk. Start with your development or testing cluster, then staging, and finally production. This gives you confidence that the new version works before it hits your most critical infrastructure.

```bash
# Upgrade dev cluster first
omnictl cluster template sync --file dev-cluster.yaml

# After verification, upgrade staging
omnictl cluster template sync --file staging-cluster.yaml

# Finally, upgrade production
omnictl cluster template sync --file production-cluster.yaml
```

## Post-Upgrade Verification

After an upgrade completes, verify that everything is working correctly.

```bash
# Check all nodes are on the new version
kubectl get nodes -o wide

# Verify workloads are running
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Run any application-specific health checks
curl https://your-app.example.com/health

# Verify Talos services
talosctl -n 10.0.0.1 version
talosctl -n 10.0.0.1 health
```

## Conclusion

Upgrading Talos Linux through Omni takes much of the risk out of the process. The rolling upgrade logic, built-in health checks, and ability to pause or cancel in-progress upgrades give you confidence that your clusters will survive the upgrade without incidents. Start with non-production clusters, always have an etcd backup, and use the dashboard to monitor progress in real time. Combined with scheduled upgrades through CI/CD, you can keep your Talos infrastructure up to date without losing sleep.
