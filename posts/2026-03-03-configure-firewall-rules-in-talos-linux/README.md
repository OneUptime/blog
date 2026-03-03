# How to Configure Firewall Rules in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Firewall, Security, Networking, nftables, Kubernetes

Description: Learn how to configure and manage firewall rules in Talos Linux using the nftables-based network filtering system built into the machine configuration.

---

Talos Linux takes a different approach to firewalling than traditional Linux distributions. There is no iptables command to run, no firewalld service to configure, and no SSH access to manually add rules. Instead, Talos uses a declarative nftables-based firewall configuration that lives in your machine config. This means your firewall rules are version-controlled, reproducible, and applied consistently across all nodes.

In this guide, we will cover how to configure firewall rules in Talos Linux, from basic port filtering to more advanced scenarios.

## How Firewalling Works in Talos Linux

Starting with Talos Linux v1.6, there is native support for configuring nftables-based firewall rules through the machine configuration. Before this version, you had to rely on external tools or Kubernetes network policies for packet filtering.

The firewall rules are processed by the Talos networkd service and translated into nftables rules that the kernel enforces. This gives you kernel-level packet filtering with the convenience of declarative configuration.

Key concepts:

- Rules are defined in the machine configuration under `machine.network.nftablesRules`
- Rules are organized into chains within tables
- The default policy can be set to accept or drop
- Rules are applied at boot time and whenever the machine config is updated

## Basic Firewall Configuration

Let us start with a basic firewall configuration that allows essential Talos and Kubernetes traffic while blocking everything else:

```yaml
# Basic firewall configuration for a Talos Linux node
machine:
  network:
    nftablesRules:
      - name: talos-firewall
        table: filter
        chain: input
        policy: drop    # Default deny all incoming traffic
        rules:
          # Allow established and related connections
          - match: ct state established,related
            verdict: accept
          # Allow loopback traffic
          - match: iifname "lo"
            verdict: accept
          # Allow Talos API (port 50000)
          - match: tcp dport 50000
            verdict: accept
          # Allow Kubernetes API (port 6443)
          - match: tcp dport 6443
            verdict: accept
          # Allow kubelet (port 10250)
          - match: tcp dport 10250
            verdict: accept
          # Allow etcd (ports 2379-2380) from cluster nodes only
          - match: tcp dport 2379-2380 ip saddr 192.168.1.0/24
            verdict: accept
          # Allow ICMP for diagnostics
          - match: meta l4proto icmp
            verdict: accept
```

Apply this configuration:

```bash
# Apply the firewall rules
talosctl -n <node-ip> apply-config --file machine-config.yaml

# Verify the rules were applied
talosctl -n <node-ip> get nftableschain
```

## Understanding Required Ports

Before locking down your firewall, you need to know which ports Talos Linux and Kubernetes require. Here is a breakdown.

### Control Plane Nodes

| Port | Protocol | Purpose |
|------|----------|---------|
| 50000 | TCP | Talos API |
| 50001 | TCP | Talos trustd |
| 6443 | TCP | Kubernetes API |
| 2379-2380 | TCP | etcd |
| 10250 | TCP | Kubelet |
| 10259 | TCP | kube-scheduler |
| 10257 | TCP | kube-controller-manager |
| 51871 | UDP | WireGuard (KubeSpan) |

### Worker Nodes

| Port | Protocol | Purpose |
|------|----------|---------|
| 50000 | TCP | Talos API |
| 10250 | TCP | Kubelet |
| 30000-32767 | TCP/UDP | NodePort services |
| 51871 | UDP | WireGuard (KubeSpan) |

## Control Plane Firewall Configuration

Here is a more complete firewall configuration for control plane nodes:

```yaml
# Control plane node firewall
machine:
  network:
    nftablesRules:
      - name: cp-firewall-input
        table: filter
        chain: input
        policy: drop
        rules:
          # Allow established connections
          - match: ct state established,related
            verdict: accept
          # Allow loopback
          - match: iifname "lo"
            verdict: accept
          # Allow ICMP and ICMPv6
          - match: meta l4proto icmp
            verdict: accept
          - match: meta l4proto icmpv6
            verdict: accept
          # Talos API - restrict to management network
          - match: tcp dport 50000 ip saddr 192.168.1.0/24
            verdict: accept
          # Talos trustd
          - match: tcp dport 50001 ip saddr 192.168.1.0/24
            verdict: accept
          # Kubernetes API - allow from all (or restrict as needed)
          - match: tcp dport 6443
            verdict: accept
          # etcd - only from other control plane nodes
          - match: tcp dport 2379-2380 ip saddr {192.168.1.10, 192.168.1.11, 192.168.1.12}
            verdict: accept
          # Kubelet
          - match: tcp dport 10250 ip saddr 192.168.1.0/24
            verdict: accept
          # kube-scheduler and kube-controller-manager
          - match: tcp dport {10259, 10257} ip saddr 192.168.1.0/24
            verdict: accept
          # CNI traffic (VXLAN for Flannel)
          - match: udp dport 8472 ip saddr 192.168.1.0/24
            verdict: accept
          # KubeSpan WireGuard
          - match: udp dport 51871
            verdict: accept
```

## Worker Node Firewall Configuration

Worker nodes need a slightly different set of rules:

```yaml
# Worker node firewall
machine:
  network:
    nftablesRules:
      - name: worker-firewall-input
        table: filter
        chain: input
        policy: drop
        rules:
          - match: ct state established,related
            verdict: accept
          - match: iifname "lo"
            verdict: accept
          - match: meta l4proto icmp
            verdict: accept
          # Talos API
          - match: tcp dport 50000 ip saddr 192.168.1.0/24
            verdict: accept
          # Kubelet
          - match: tcp dport 10250 ip saddr 192.168.1.0/24
            verdict: accept
          # NodePort range
          - match: tcp dport 30000-32767
            verdict: accept
          - match: udp dport 30000-32767
            verdict: accept
          # CNI traffic
          - match: udp dport 8472 ip saddr 192.168.1.0/24
            verdict: accept
          # KubeSpan WireGuard
          - match: udp dport 51871
            verdict: accept
```

## Configuring Output Rules

By default, Talos does not restrict outgoing traffic. If you need to restrict egress from your nodes, add output chain rules:

```yaml
# Restrict outbound traffic
machine:
  network:
    nftablesRules:
      - name: output-filter
        table: filter
        chain: output
        policy: drop
        rules:
          - match: ct state established,related
            verdict: accept
          - match: oifname "lo"
            verdict: accept
          # Allow DNS
          - match: udp dport 53
            verdict: accept
          - match: tcp dport 53
            verdict: accept
          # Allow HTTPS (for pulling container images)
          - match: tcp dport 443
            verdict: accept
          # Allow HTTP
          - match: tcp dport 80
            verdict: accept
          # Allow NTP
          - match: udp dport 123
            verdict: accept
          # Allow cluster communication
          - match: ip daddr 192.168.1.0/24
            verdict: accept
```

Be careful with output rules. If you block something Talos or Kubernetes needs, you can break your cluster. Test output rules on a single node first before rolling them out broadly.

## Verifying Firewall Rules

After applying firewall rules, verify they are active and working:

```bash
# List all nftables chains
talosctl -n <node-ip> get nftableschain

# Check the full nftables ruleset
talosctl -n <node-ip> get nftableschain -o yaml

# Test that allowed ports are accessible
nc -zv <node-ip> 6443    # Should succeed (Kubernetes API)
nc -zv <node-ip> 22      # Should fail (SSH is not running anyway)

# Check for dropped packets in kernel logs
talosctl -n <node-ip> dmesg | grep -i "nft\|drop\|reject"
```

## Logging Dropped Packets

For debugging purposes, you can add a logging rule before the drop policy catches traffic:

```yaml
# Add logging for dropped packets
machine:
  network:
    nftablesRules:
      - name: firewall-with-logging
        table: filter
        chain: input
        policy: drop
        rules:
          # ... your accept rules here ...
          # Log packets that will be dropped (add this as the last rule)
          - match: ct state new
            verdict: log prefix "DROPPED: " level info
```

View the logged packets:

```bash
# Check kernel logs for dropped packet entries
talosctl -n <node-ip> dmesg | grep "DROPPED:"
```

## Recovering from Firewall Lockout

One risk with firewall rules is accidentally locking yourself out. Since Talos does not have SSH, you cannot fall back to a console login to fix things. Here are your recovery options:

1. **Use Talos maintenance mode**: If you have physical or IPMI access, reboot into maintenance mode where firewall rules are not applied
2. **Use a different interface**: If you have a secondary management interface, connect through that
3. **Serial console**: If available, use the serial console to apply a corrected config

```bash
# In maintenance mode, apply a fixed configuration
talosctl -n <node-ip> apply-config --file fixed-config.yaml --insecure
```

To avoid lockouts in the first place, always test new firewall rules on a single non-critical node before applying them cluster-wide.

## Conclusion

Firewall configuration in Talos Linux is clean and declarative. By defining your rules in the machine configuration, you get reproducible security that is applied consistently across your fleet. Start with the essential ports for Talos and Kubernetes, lock down etcd to only control plane nodes, and be cautious with output filtering. Always test on a single node first, and make sure you have a recovery path before applying restrictive rules to your entire cluster.
