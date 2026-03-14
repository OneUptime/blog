# How to Check Current Talos Linux Version on Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Version Check, Talosctl, Cluster Management, Node Information

Description: Learn multiple methods to check the current Talos Linux version running on your nodes, including talosctl commands, Kubernetes labels, and API queries.

---

Knowing which version of Talos Linux is running on each node in your cluster is fundamental for maintenance, troubleshooting, and upgrade planning. There are several ways to check this information, from simple one-liners to fleet-wide inventory queries. This guide covers all the methods and when to use each one.

## Using talosctl version

The most direct way to check the Talos version on a node is the `talosctl version` command:

```bash
# Check version on a specific node
talosctl version --nodes 192.168.1.10

# Example output:
# Client:
#     Tag:         v1.7.0
#     SHA:         abcdef1234567890
#     Built:       2024-03-01T12:00:00Z
#     Go version:  go1.22.0
#     OS/Arch:     linux/amd64
# Server:
#     NODE:        192.168.1.10
#     Tag:         v1.7.0
#     SHA:         abcdef1234567890
#     Built:       2024-03-01T12:00:00Z
#     Go version:  go1.22.0
#     OS/Arch:     linux/amd64
#     Enabled:     RBAC
```

The output shows both the client version (the `talosctl` binary you are running) and the server version (what the node is running). The Server Tag is the version you care about.

## Checking Multiple Nodes at Once

You can query multiple nodes in a single command:

```bash
# Check version on all control plane nodes
talosctl version --nodes 192.168.1.10,192.168.1.11,192.168.1.12

# Check version on all nodes (control plane + workers)
talosctl version --nodes 192.168.1.10,192.168.1.11,192.168.1.12,192.168.1.20,192.168.1.21,192.168.1.22
```

Each node's version is displayed separately, so you can quickly spot any nodes running a different version.

## Parsing Version Output for Scripts

For automation and scripting, you might want just the version tag:

```bash
# Get just the server tag for a specific node
talosctl version --nodes 192.168.1.10 --short

# Or parse the full output
talosctl version --nodes 192.168.1.10 2>/dev/null | grep "Tag:" | tail -1 | awk '{print $2}'

# For JSON output that is easier to parse programmatically
talosctl version --nodes 192.168.1.10 -o json
```

## Using talosctl get Resource Commands

Talos exposes version information through its resource API:

```bash
# Get the machine version resource
talosctl get machinestatus --nodes 192.168.1.10 -o yaml

# This includes the Talos version along with other system status information
```

You can also check the META partition, which stores the installed version:

```bash
# Check metadata that includes version information
talosctl get meta --nodes 192.168.1.10
```

## Checking via Kubernetes Node Labels

Talos Linux sets labels on Kubernetes nodes that include version information:

```bash
# Get node labels that include Talos version
kubectl get nodes --show-labels | grep talos

# Filter for specific Talos-related labels
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
TALOS_VERSION:.metadata.labels.node\\.kubernetes\\.io/instance-type

# Get all labels on a specific node
kubectl describe node worker-01 | grep -A 20 Labels
```

Talos also sets annotations on nodes:

```bash
# Check node annotations for version info
kubectl get node worker-01 -o jsonpath='{.metadata.annotations}' | jq .
```

## Checking via the Kubernetes API

The kubelet reports its version, which can give you an indirect view of the Talos version:

```bash
# The kubelet version is shown in the node status
kubectl get nodes -o wide

# Example output:
# NAME        STATUS   ROLES           AGE   VERSION    INTERNAL-IP    OS-IMAGE
# cp-01       Ready    control-plane   30d   v1.30.0    192.168.1.10   Talos (v1.7.0)
# cp-02       Ready    control-plane   30d   v1.30.0    192.168.1.11   Talos (v1.7.0)
# worker-01   Ready    <none>          30d   v1.30.0    192.168.1.20   Talos (v1.7.0)
```

The OS-IMAGE column typically shows the Talos version. The VERSION column shows the Kubernetes version, not the Talos version.

## Fleet-Wide Version Inventory

For managing large clusters, create a version inventory across all nodes:

```bash
#!/bin/bash
# Generate a version inventory for all Talos nodes

echo "Talos Linux Version Inventory"
echo "=============================="
echo ""
printf "%-20s %-15s %-15s %-10s\n" "NODE" "HOSTNAME" "TALOS VERSION" "K8S VERSION"
printf "%-20s %-15s %-15s %-10s\n" "----" "--------" "-------------" "-----------"

# Get all node IPs from kubectl
NODES=$(kubectl get nodes -o jsonpath='{range .items[*]}{.status.addresses[?(@.type=="InternalIP")].address}{"\n"}{end}')

for NODE in $NODES; do
  # Get hostname
  HOSTNAME=$(kubectl get nodes -o jsonpath="{.items[?(@.status.addresses[?(@.type==\"InternalIP\")].address==\"$NODE\")].metadata.name}")

  # Get Talos version
  TALOS_VER=$(talosctl version --nodes "$NODE" --short 2>/dev/null | grep "Tag:" | tail -1 | awk '{print $2}')

  # Get Kubernetes version
  K8S_VER=$(kubectl get node "$HOSTNAME" -o jsonpath='{.status.nodeInfo.kubeletVersion}')

  printf "%-20s %-15s %-15s %-10s\n" "$NODE" "$HOSTNAME" "$TALOS_VER" "$K8S_VER"
done
```

This script produces a table showing every node's IP, hostname, Talos version, and Kubernetes version.

## Detecting Version Mismatches

After a partial upgrade or during a rolling upgrade, some nodes may be running different versions:

```bash
# Quick check for version consistency
talosctl version --nodes 192.168.1.10,192.168.1.11,192.168.1.12 --short

# Look for differences in the output
# All nodes should show the same Tag if the upgrade is complete
```

A more automated approach:

```bash
#!/bin/bash
# Check for version mismatches across the cluster

NODES=$(kubectl get nodes -o jsonpath='{range .items[*]}{.status.addresses[?(@.type=="InternalIP")].address}{" "}{end}')

declare -A VERSIONS

for NODE in $NODES; do
  VER=$(talosctl version --nodes "$NODE" --short 2>/dev/null | grep "Tag:" | tail -1 | awk '{print $2}')
  VERSIONS[$VER]+="$NODE "
done

if [ ${#VERSIONS[@]} -eq 1 ]; then
  echo "All nodes are running the same version: ${!VERSIONS[@]}"
else
  echo "VERSION MISMATCH DETECTED!"
  for VER in "${!VERSIONS[@]}"; do
    echo "  $VER: ${VERSIONS[$VER]}"
  done
fi
```

## Checking Version on Nodes in Maintenance Mode

Nodes in maintenance mode (before a configuration is applied) can also report their version:

```bash
# Use --insecure flag for nodes in maintenance mode
talosctl version --nodes 192.168.1.10 --insecure
```

This is useful when you are setting up new nodes and want to verify which Talos version they booted from.

## Checking the Installed Talos Image

Beyond just the version tag, you might want to know the exact installer image:

```bash
# Check the machine configuration for the install image
talosctl get machineconfig --nodes 192.168.1.10 -o yaml | grep -A 3 "install:"

# Example output:
# install:
#   disk: /dev/sda
#   image: ghcr.io/siderolabs/installer:v1.7.0
```

This tells you the exact container image that was used to install Talos, which is important when you use custom images with extensions.

## Version Information in System Logs

The Talos version is also logged during boot:

```bash
# Check boot logs for version information
talosctl dmesg --nodes 192.168.1.10 | grep -i "talos\|version"

# Check system logs
talosctl logs machined --nodes 192.168.1.10 | grep -i version
```

## Monitoring Versions with Prometheus

If you want to track Talos versions in your monitoring system, you can export version information as a Prometheus metric:

```promql
# The kube_node_info metric includes kubelet version
kube_node_info

# You can create recording rules to track version distribution
count by (kubelet_version) (kube_node_info)
```

For Talos-specific version tracking, you could create a custom exporter or use the node annotations that Talos sets.

## Best Practices

1. Check versions across all nodes before and after any upgrade to confirm consistency
2. Include version checks in your regular operational runbooks
3. Set up alerts for version mismatches that persist for more than a day (which could indicate a failed upgrade)
4. Keep your `talosctl` client version in sync with your cluster version for best compatibility
5. Document target versions in your infrastructure-as-code repository
6. Use the version inventory script during change management reviews

## Conclusion

Checking the Talos Linux version on your nodes is something you will do regularly, especially around upgrades and troubleshooting. The `talosctl version` command is the primary tool, but Kubernetes labels, node information, and system logs all provide version data. For fleet management, automated scripts that check version consistency across all nodes help you catch issues early and maintain a healthy, uniform cluster.
