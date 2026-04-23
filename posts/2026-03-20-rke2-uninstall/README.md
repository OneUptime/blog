# How to Uninstall RKE2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Rancher, Administration, Cleanup

Description: Step-by-step instructions to cleanly uninstall RKE2 from server and agent nodes, removing all associated data and configurations.

## Introduction

Whether you are decommissioning a node, rebuilding an environment, or migrating to a different Kubernetes distribution, knowing how to cleanly uninstall RKE2 is important. RKE2 ships with a built-in uninstall script that handles most of the cleanup automatically. This guide covers the full process for both server and agent nodes.

## Prerequisites

- Root or sudo access on the node
- The node should be drained before uninstalling (for production clusters)
- For server nodes, make sure removing the node will not break etcd quorum

## Step 1: Drain the Node (Production Clusters)

Before uninstalling, gracefully evict all workloads from the node to avoid downtime.

```bash
# From a node with kubectl access, drain the node

# Replace <NODE_NAME> with the actual node name
kubectl drain <NODE_NAME> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --force

# Verify all pods have been evicted
kubectl get pods --all-namespaces -o wide | grep <NODE_NAME>
```

## Step 2: Stop the RKE2 Service

```bash
# Stop the server service (on server nodes)
sudo systemctl stop rke2-server.service
sudo systemctl status rke2-server.service

# Stop the agent service (on agent nodes)
sudo systemctl stop rke2-agent.service
sudo systemctl status rke2-agent.service
```

## Step 3: Run the Uninstall Script

RKE2 installs an uninstall script during setup. The same script is used for server and agent nodes; the path depends on the installation method.

### Uninstalling an RPM-Based RKE2 Install

```bash
# Run the uninstall script for RPM installs
sudo /usr/bin/rke2-uninstall.sh
```

### Uninstalling a Tarball-Based RKE2 Install

```bash
# Run the uninstall script for tarball installs
sudo /usr/local/bin/rke2-uninstall.sh
```

If RKE2 was installed under `/opt/rke2` or a custom `INSTALL_RKE2_TAR_PREFIX`, run the `rke2-uninstall.sh` script from that prefix's `bin` directory instead.

The uninstall script performs the following actions automatically:
- Stop RKE2 services and disable the systemd units
- Remove the RKE2 packages or binary and cleanup scripts
- Kill the containerd shims
- Remove CNI configuration, plugins, common network interfaces, Kubernetes pod/container logs, kubelet state, and RKE2 data
- Clean up Kubernetes and CNI iptables rules

## Step 4: Remove Residual Data

The official uninstall script removes the default RKE2 data, config, kubelet, CNI, and pod/container log directories. If the script did not complete successfully or you used a custom data directory, check for residual files and remove only the paths that still apply.

```bash
# Remove the RKE2 data directory (contains etcd data, certificates, etc.)
sudo rm -rf /var/lib/rancher/rke2/

# Remove the RKE2 configuration directory
sudo rm -rf /etc/rancher/rke2/

# Remove Kubernetes pod and container log directories
sudo rm -rf /var/log/pods/
sudo rm -rf /var/log/containers/

# Remove the kubectl config only if it was created solely for this RKE2 cluster
# rm -f ~/.kube/config
```

## Step 5: Clean Up Network Interfaces

The uninstall script should handle most network cleanup, but verify manually:

```bash
# Check for lingering CNI network interfaces
ip link show | grep -E "cni|flannel|calico|cilium|vxlan"

# Remove any remaining interfaces manually if found
# Example: sudo ip link delete flannel.1
sudo ip link delete <interface_name>

# Check for leftover iptables rules
sudo iptables -L -n | grep -E "KUBE|CNI|FLANNEL"

# Flush all iptables rules if needed (WARNING: this affects all rules)
# sudo iptables -F
# sudo iptables -X
# sudo iptables -t nat -F
# sudo iptables -t nat -X
```

## Step 6: Remove the Node from the Cluster

From a remaining server node, delete the removed node from the Kubernetes API. For server nodes, make sure the remaining server set still maintains etcd quorum.

```bash
# List all nodes
kubectl get nodes

# Delete the uninstalled node
kubectl delete node <NODE_NAME>
```

## Step 7: Verify Complete Removal

```bash
# Check that no RKE2 binaries remain
which rke2
ls /usr/local/bin/rke2* /usr/bin/rke2* /opt/rke2/bin/rke2* 2>/dev/null

# Check that the service definitions are gone
systemctl list-unit-files | grep rke2

# Verify no RKE2 processes are running
ps aux | grep rke2
```

## Complete Uninstall Script

For convenience, here is a combined script you can run on any node:

```bash
#!/bin/bash
# complete-rke2-uninstall.sh
# Run as root or with sudo

set -e

echo "Stopping RKE2 services..."
systemctl stop rke2-server 2>/dev/null || true
systemctl stop rke2-agent 2>/dev/null || true

echo "Running RKE2 uninstall script..."
UNINSTALL_SCRIPT=""
for path in /usr/bin/rke2-uninstall.sh /usr/local/bin/rke2-uninstall.sh /opt/rke2/bin/rke2-uninstall.sh; do
    if [ -x "$path" ]; then
        UNINSTALL_SCRIPT="$path"
        break
    fi
done

if [ -n "$UNINSTALL_SCRIPT" ]; then
    "$UNINSTALL_SCRIPT"
else
    echo "No rke2-uninstall.sh found in the standard paths."
fi

echo "Removing residual data directories..."
rm -rf /var/lib/rancher/rke2/
rm -rf /etc/rancher/rke2/
rm -rf /var/log/pods/
rm -rf /var/log/containers/

echo "RKE2 uninstall complete."
```

```bash
# Make it executable and run
chmod +x complete-rke2-uninstall.sh
sudo ./complete-rke2-uninstall.sh
```

## Troubleshooting

### Uninstall Script Not Found

If the uninstall script is missing, the installation may have been non-standard. Manually remove the files:

```bash
# Remove binaries and cleanup scripts from common install prefixes
sudo rm -f /usr/local/bin/rke2 /usr/local/bin/rke2-killall.sh /usr/local/bin/rke2-uninstall.sh
sudo rm -f /usr/bin/rke2 /usr/bin/rke2-killall.sh /usr/bin/rke2-uninstall.sh
sudo rm -f /opt/rke2/bin/rke2 /opt/rke2/bin/rke2-killall.sh /opt/rke2/bin/rke2-uninstall.sh
sudo rm -rf /var/lib/rancher/rke2/bin

# Remove systemd service files
sudo rm -f /etc/systemd/system/rke2-server.service
sudo rm -f /etc/systemd/system/rke2-agent.service
sudo rm -f /usr/local/lib/systemd/system/rke2-server.service
sudo rm -f /usr/local/lib/systemd/system/rke2-agent.service
sudo rm -f /usr/lib/systemd/system/rke2-server.service
sudo rm -f /usr/lib/systemd/system/rke2-agent.service
sudo systemctl daemon-reload
```

### Containerd Namespace Still Exists

```bash
# If the RKE2 data directory still exists, list containerd namespaces
sudo /var/lib/rancher/rke2/bin/ctr namespaces list

# Inspect any k8s.io namespace artifacts before removing the RKE2 data directory
sudo /var/lib/rancher/rke2/bin/ctr -n k8s.io containers list
```

## Conclusion

Cleanly uninstalling RKE2 involves stopping services, running the provided uninstall script, removing residual data directories, and cleaning up network artifacts. Always drain nodes before uninstalling in production to avoid disruption. The built-in uninstall script handles most of the heavy lifting, making the process straightforward.
