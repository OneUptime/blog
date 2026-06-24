# How to Enable IPv6 Forwarding for Kubernetes Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, Linux, Sysctl, Networking, Node Configuration

Description: A step-by-step guide to enabling IPv6 packet forwarding on Kubernetes nodes so that pods can route IPv6 traffic between networks.

IPv6 forwarding allows a Linux host to act as a router and pass IPv6 packets between network interfaces. Kubernetes nodes must have this enabled for pod traffic that needs to be routed between interfaces, including cross-node and pod-to-external IPv6 communication, to work correctly.

## Why IPv6 Forwarding Is Required

When a Kubernetes node receives an IPv6 packet destined for a pod on another node (or for an external address), the kernel must forward that packet rather than drop it. Without `net.ipv6.conf.all.forwarding=1`, the kernel will not forward packets that are not destined for the node itself.

## Step 1: Check Current Forwarding State

```bash
# Check the current IPv6 forwarding state (0 = disabled, 1 = enabled)

sysctl net.ipv6.conf.all.forwarding
```

## Step 2: Enable IPv6 Forwarding Temporarily

This takes effect immediately but does not survive a reboot.

```bash
# Enable IPv6 forwarding on all interfaces
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Also set the default for interfaces created later
sudo sysctl -w net.ipv6.conf.default.forwarding=1
```

## Step 3: Make IPv6 Forwarding Permanent

Edit `/etc/sysctl.d/99-kubernetes-ipv6.conf` (create it if it does not exist) to persist the setting across reboots.

```bash
# Write the persistent sysctl settings for Kubernetes IPv6 forwarding
cat <<EOF | sudo tee /etc/sysctl.d/99-kubernetes-ipv6.conf
# Required for Kubernetes IPv6 pod routing
net.ipv6.conf.all.forwarding = 1
net.ipv6.conf.default.forwarding = 1
EOF

# Reload all sysctl configuration files
sudo sysctl --system
```

## Step 4: Verify the Setting Is Active

```bash
# Confirm forwarding is now enabled
sysctl net.ipv6.conf.all.forwarding
# Expected: net.ipv6.conf.all.forwarding = 1
```

## Step 5: Automate with Cloud-Init or Node Provisioning

If you provision nodes with cloud-init, add the sysctl settings to your user-data:

```yaml
# cloud-init user-data snippet
#cloud-config
write_files:
  - path: /etc/sysctl.d/99-kubernetes-ipv6.conf
    content: |
      net.ipv6.conf.all.forwarding = 1
      net.ipv6.conf.default.forwarding = 1

runcmd:
  - sysctl --system
```

## Step 6: Validate on a Running Cluster Node

After joining the node to the cluster, verify that pods can exchange IPv6 traffic through the cluster network. From a pod that has `ping` installed, ping another pod's IPv6 address:

```bash
# From a pod, ping another pod's IPv6 address
kubectl exec -it <pod-name> -- ping -6 -c 3 <other-pod-ipv6>
```

## Important Notes

- Some cluster tooling or CNI configurations may set this automatically, but you should verify the effective value on the node instead of assuming it.
- Enabling IPv6 forwarding does **not** affect IPv4 forwarding - use `net.ipv4.ip_forward` for that separately.
- On nodes that use `systemd-networkd`, manage the global setting with `IPv6Forwarding=yes` in `networkd.conf` (or `IPForward=ipv6` on older releases); per-interface `.network` files alone do not enable global IPv6 forwarding.

IPv6 forwarding is a foundational kernel setting that must be in place before IPv6 pod routing across nodes or to external networks can function correctly.
