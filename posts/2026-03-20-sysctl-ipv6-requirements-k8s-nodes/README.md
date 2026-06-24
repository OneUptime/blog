# How to Configure sysctl Requirements for IPv6 Kubernetes Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, Sysctl, Linux, Node Configuration, Networking

Description: A comprehensive reference for all sysctl kernel parameters required to run IPv6 workloads on Kubernetes nodes.

Kubernetes and common CNI plugins have documented node-level kernel parameter requirements. For kubeadm dual-stack clusters, Kubernetes documents IPv6 forwarding as a per-node requirement; depending on the CNI plugin, service proxy mode, and whether the datapath uses Linux bridge/netfilter, additional sysctl values may be needed to ensure pod networking, service proxying, and network policy enforcement work correctly. For dual-stack clusters, keep the usual IPv4 forwarding and CNI requirements in place as well.

## Common sysctl Reference for IPv6 Kubernetes Nodes

The table below lists common IPv6-related node parameters along with their recommended values.

| Parameter | Value | Purpose |
|---|---|---|
| `net.ipv6.conf.all.forwarding` | `1` | Enable IPv6 packet forwarding |
| `net.ipv6.conf.default.forwarding` | `1` | Apply forwarding to new interfaces |
| `net.ipv6.conf.all.accept_ra` | `0` | Disable RA processing when routes are managed explicitly |
| `net.ipv6.conf.default.accept_ra` | `0` | Same for default |
| `net.bridge.bridge-nf-call-ip6tables` | `1` | Allow ip6tables to see bridged packets when bridge netfilter is used |
| `net.ipv6.conf.all.disable_ipv6` | `0` | Enable IPv6 on existing interfaces and the default setting when applied |

## Step 1: Create a Dedicated sysctl Drop-In File

```bash
# Create the Kubernetes IPv6 sysctl configuration file

cat <<EOF | sudo tee /etc/sysctl.d/99-kubernetes-ipv6.conf
# IPv6 packet forwarding (required for pod routing)
net.ipv6.conf.all.forwarding = 1
net.ipv6.conf.default.forwarding = 1

# Disable Router Advertisement acceptance when forwarding is enabled
# (routes should be managed explicitly unless an interface intentionally uses accept_ra=2)
net.ipv6.conf.all.accept_ra = 0
net.ipv6.conf.default.accept_ra = 0

# Allow ip6tables to process bridged IPv6 packets when bridge netfilter is used
net.bridge.bridge-nf-call-ip6tables = 1

# Ensure IPv6 is enabled on existing interfaces and the default setting
net.ipv6.conf.all.disable_ipv6 = 0
EOF
```

## Step 2: Load the br_netfilter Module

The `bridge-nf-call-ip6tables` parameter is exposed when `br_netfilter` support is available. On systems where it is not built into the kernel, load the `br_netfilter` module.

```bash
# Load the module immediately
sudo modprobe br_netfilter

# Persist the module load across reboots
echo "br_netfilter" | sudo tee /etc/modules-load.d/k8s-br-netfilter.conf
```

## Step 3: Apply All sysctl Settings

```bash
# Reload all sysctl drop-in files
sudo sysctl --system
```

## Step 4: Verify All Settings

```bash
# Verify each parameter is set correctly
sysctl net.ipv6.conf.all.forwarding
sysctl net.ipv6.conf.default.forwarding
sysctl net.ipv6.conf.all.accept_ra
sysctl net.ipv6.conf.default.accept_ra
sysctl net.bridge.bridge-nf-call-ip6tables
sysctl net.ipv6.conf.all.disable_ipv6
```

## Step 5: Include in Node Initialization Scripts

For automated node provisioning (e.g., with kubeadm or Terraform), add these steps to your bootstrap script:

```bash
#!/bin/bash
# bootstrap-k8s-ipv6-node.sh

# Load required kernel modules
modprobe overlay
modprobe br_netfilter

# Persist modules
cat <<EOF > /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

# Write sysctl settings
cat <<EOF > /etc/sysctl.d/99-kubernetes-ipv6.conf
net.ipv6.conf.all.forwarding = 1
net.ipv6.conf.default.forwarding = 1
net.ipv6.conf.all.accept_ra = 0
net.ipv6.conf.default.accept_ra = 0
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv6.conf.all.disable_ipv6 = 0
EOF

# Apply immediately
sysctl --system
```

## Notes on accept_ra

When `net.ipv6.conf.all.forwarding` is set to `1`, the kernel treats the node as a router. In router mode, Router Advertisements are ignored unless `accept_ra` is set to `2` on a specific interface. It is safest to explicitly set `accept_ra = 0` on Kubernetes node interfaces where routes are managed outside RA. On cloud instances where RAs are used for default gateway configuration, ensure your default IPv6 route is configured another way, or intentionally set `accept_ra = 2` on the uplink interface that must learn it from RA.

Applying the IPv6 forwarding and CNI-specific sysctl settings consistently across all cluster nodes is a prerequisite for stable IPv6 Kubernetes networking.
