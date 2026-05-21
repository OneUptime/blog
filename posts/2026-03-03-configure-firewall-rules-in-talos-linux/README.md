# How to Configure Firewall Rules in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Firewall, Security, Networking, nftables, Kubernetes

Description: Learn how to configure and manage firewall rules in Talos Linux using the nftables-based network filtering system built into the machine configuration.

---

Talos Linux takes a different approach to firewalling than traditional Linux distributions. There is no iptables command to run, no firewalld service to configure, and no SSH access to manually add rules. Instead, Talos uses a declarative ingress firewall configuration that lives in your machine config. Talos translates these declarations into nftables rules that the kernel enforces. This means your firewall rules are version-controlled, reproducible, and applied consistently across all nodes.

In this guide, we will cover how to configure firewall rules in Talos Linux, from basic port filtering to more advanced scenarios.

## How Firewalling Works in Talos Linux

Starting with Talos Linux v1.6, there is native support for configuring an ingress firewall through the machine configuration. Before this version, you had to rely on external tools or Kubernetes network policies for packet filtering.

Firewall rules are declared as extra configuration documents and rendered into nftables rules by Talos. This gives you kernel-level packet filtering with the convenience of declarative configuration.

Key concepts:

- Rules are defined as `NetworkRuleConfig` documents, each appended to the machine configuration
- A single `NetworkDefaultActionConfig` document sets the default ingress action (`accept` or `block`)
- The firewall only filters ingress traffic; egress is not filtered by Talos
- Traffic on `lo`, `siderolink`, and `kubespan` interfaces is always allowed
- In `block` mode, ICMP/ICMPv6 is allowed at 5 packets/second and traffic between Kubernetes pod/service subnets is allowed for native-routing CNIs
- Rules are applied whenever the machine configuration is updated

## Basic Firewall Configuration

Let us start with a basic firewall configuration that allows essential Talos and Kubernetes traffic while blocking everything else. Each rule is a separate YAML document appended to your machine configuration:

```yaml
# Set the default ingress action to block
apiVersion: v1alpha1
kind: NetworkDefaultActionConfig
ingress: block
---
# Allow Talos API (port 50000)
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: apid-ingress
portSelector:
  ports:
    - 50000
  protocol: tcp
ingress:
  - subnet: 192.168.1.0/24
---
# Allow Kubernetes API (port 6443)
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: kubernetes-api-ingress
portSelector:
  ports:
    - 6443
  protocol: tcp
ingress:
  - subnet: 0.0.0.0/0
  - subnet: ::/0
---
# Allow kubelet (port 10250)
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: kubelet-ingress
portSelector:
  ports:
    - 10250
  protocol: tcp
ingress:
  - subnet: 192.168.1.0/24
---
# Allow etcd (ports 2379-2380) from cluster nodes only
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: etcd-ingress
portSelector:
  ports:
    - 2379-2380
  protocol: tcp
ingress:
  - subnet: 192.168.1.0/24
```

Apply this configuration. It is strongly recommended to use `--mode=try` first, so the change is reverted automatically if it leaves the node unreachable:

```bash
# Try the firewall rules (auto-reverts after a timeout if you can't confirm)
talosctl -n <node-ip> apply-config --file machine-config.yaml --mode=try

# Once verified, apply normally
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
| 51820 | UDP | WireGuard (KubeSpan) |

### Worker Nodes

| Port | Protocol | Purpose |
|------|----------|---------|
| 50000 | TCP | Talos API |
| 10250 | TCP | Kubelet |
| 30000-32767 | TCP/UDP | NodePort services |
| 51820 | UDP | WireGuard (KubeSpan) |

## Control Plane Firewall Configuration

Here is a more complete firewall configuration for control plane nodes. Note that loopback, KubeSpan, and SideroLink interfaces are always allowed, and in `block` mode ICMP/ICMPv6 is already rate-limited to 5 packets per second, so you do not need explicit rules for those:

```yaml
# Control plane node firewall
apiVersion: v1alpha1
kind: NetworkDefaultActionConfig
ingress: block
---
# Talos API - restrict to management network
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: apid-ingress
portSelector:
  ports:
    - 50000
  protocol: tcp
ingress:
  - subnet: 192.168.1.0/24
---
# Talos trustd - restrict to management network
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: trustd-ingress
portSelector:
  ports:
    - 50001
  protocol: tcp
ingress:
  - subnet: 192.168.1.0/24
---
# Kubernetes API - allow from all (or restrict as needed)
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: kubernetes-api-ingress
portSelector:
  ports:
    - 6443
  protocol: tcp
ingress:
  - subnet: 0.0.0.0/0
  - subnet: ::/0
---
# etcd - only from other control plane nodes
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: etcd-ingress
portSelector:
  ports:
    - 2379-2380
  protocol: tcp
ingress:
  - subnet: 192.168.1.10/32
  - subnet: 192.168.1.11/32
  - subnet: 192.168.1.12/32
---
# Kubelet
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: kubelet-ingress
portSelector:
  ports:
    - 10250
  protocol: tcp
ingress:
  - subnet: 192.168.1.0/24
---
# CNI VXLAN traffic (UDP 8472 for Cilium/Flannel VXLAN; Calico uses 4789)
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: cni-vxlan
portSelector:
  ports:
    - 8472
  protocol: udp
ingress:
  - subnet: 192.168.1.0/24
```

## Worker Node Firewall Configuration

Worker nodes need a slightly different set of rules:

```yaml
# Worker node firewall
apiVersion: v1alpha1
kind: NetworkDefaultActionConfig
ingress: block
---
# Talos API
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: apid-ingress
portSelector:
  ports:
    - 50000
  protocol: tcp
ingress:
  - subnet: 192.168.1.0/24
---
# Kubelet
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: kubelet-ingress
portSelector:
  ports:
    - 10250
  protocol: tcp
ingress:
  - subnet: 192.168.1.0/24
---
# NodePort range (TCP)
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: nodeport-tcp-ingress
portSelector:
  ports:
    - 30000-32767
  protocol: tcp
ingress:
  - subnet: 0.0.0.0/0
  - subnet: ::/0
---
# NodePort range (UDP)
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: nodeport-udp-ingress
portSelector:
  ports:
    - 30000-32767
  protocol: udp
ingress:
  - subnet: 0.0.0.0/0
  - subnet: ::/0
---
# CNI VXLAN traffic
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: cni-vxlan
portSelector:
  ports:
    - 8472
  protocol: udp
ingress:
  - subnet: 192.168.1.0/24
```

## What About Egress (Outbound) Filtering?

The Talos ingress firewall, as the name suggests, only filters inbound traffic to the host. There is no built-in mechanism to restrict outbound traffic from the node itself. If you need egress filtering you have a couple of options:

- Apply policy at the network layer (e.g. cloud security groups, a router/firewall in front of the cluster) to restrict what nodes can reach.
- For workloads in pods, use Kubernetes `NetworkPolicy` resources (with a CNI that supports egress policies such as Cilium or Calico) to restrict pod-level egress.

Talos itself does not provide a `NetworkRuleConfig` equivalent for egress, so do not expect to filter outbound DNS/NTP/registry traffic with this feature.

## Verifying Firewall Rules

After applying firewall rules, verify they are rendered into the kernel's nftables ruleset:

```bash
# List the rendered nftables chains
talosctl -n <node-ip> get nftableschain

# Inspect the full rendered ruleset
talosctl -n <node-ip> get nftableschain -o yaml

# Test that allowed ports are accessible
nc -zv <node-ip> 6443    # Should succeed (Kubernetes API)
nc -zv <node-ip> 22      # Should fail (SSH is not running anyway)
```

## Debugging Dropped Traffic

The Talos `NetworkRuleConfig` schema does not currently expose an in-rule logging primitive - there is no `log` verdict you can attach to a rule. To debug what is being dropped, your options are:

- Inspect the rendered nftables chains with `talosctl get nftableschain -o yaml` to confirm rules match what you expect.
- Generate test traffic from a known source and observe whether it succeeds.
- Temporarily flip `NetworkDefaultActionConfig` back to `ingress: accept` (with `--mode=try`) to isolate whether a missing rule is the cause.

When iterating, always use `--mode=try` so a misconfigured rule does not lock you out of the node.

## Recovering from Firewall Lockout

One risk with firewall rules is accidentally locking yourself out. Since Talos does not have SSH, you cannot fall back to a console login to fix things. Your best line of defense is `talosctl apply-config --mode=try`, which applies the config for a short window and automatically reverts it if you do not confirm - use it whenever you change firewall rules.

If you do end up locked out, here are your recovery options:

1. **Use Talos maintenance mode**: If you have physical or IPMI access, boot the node into maintenance mode (which runs without the applied machine config) and apply a corrected config.
2. **Use a different interface**: If you have a secondary management interface in an allowed subnet, connect through that.
3. **Serial console**: If available, use the serial console to interact with the dashboard and apply a corrected config.

```bash
# In maintenance mode, apply a fixed configuration
talosctl -n <node-ip> apply-config --file fixed-config.yaml --insecure
```

To avoid lockouts in the first place, always test new firewall rules on a single non-critical node first, using `--mode=try`, before applying them cluster-wide.

## Conclusion

The Talos Linux ingress firewall is clean and declarative. By appending `NetworkDefaultActionConfig` and `NetworkRuleConfig` documents to your machine configuration, you get reproducible host-level filtering that is applied consistently across your fleet. Start with the essential ports for Talos and Kubernetes, lock down etcd to only the control plane nodes, and remember that egress filtering is not part of this feature - handle that at the network or CNI layer. Always test on a single node with `--mode=try` first, and make sure you have a recovery path before applying restrictive rules to your entire cluster.
