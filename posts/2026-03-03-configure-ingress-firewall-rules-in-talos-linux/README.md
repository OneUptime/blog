# How to Configure Ingress Firewall Rules in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Firewall, Ingress Rules, Network Security, Kubernetes

Description: A detailed guide to configuring ingress firewall rules in Talos Linux to protect nodes from unauthorized network access and secure cluster communication.

---

Talos Linux includes a built-in host-level firewall that operates below Kubernetes, protecting the node itself and its system services. Unlike Kubernetes NetworkPolicies that only control pod traffic, Talos ingress firewall rules control what traffic can reach the node's network stack in the first place. This is your first line of defense against unauthorized access to the Talos API, etcd, the kubelet, and other critical services.

This guide covers how to design and implement ingress firewall rules in Talos Linux using NetworkRuleConfig documents.

## How Talos Firewall Works

Talos implements its firewall using nftables under the hood. The baseline behavior is set by a `NetworkDefaultActionConfig` document: when its `ingress` field is `accept` (the default), all traffic is allowed unless a rule blocks it; when set to `block`, all traffic is dropped unless a rule allows it. To get a default-deny posture you must explicitly set `ingress: block` - simply creating `NetworkRuleConfig` documents does not change the default action on its own.

The firewall operates on ingress traffic only - it controls what comes into the node. Egress traffic (outbound from the node) is not filtered by this mechanism.

## Basic Ingress Rule Structure

Ingress rules are defined within `NetworkRuleConfig` documents. A typical setup pairs a `NetworkDefaultActionConfig` (to switch to default-deny) with one or more `NetworkRuleConfig` documents that whitelist specific ports and source subnets:

```yaml
# Switch the default ingress action to block
apiVersion: v1alpha1
kind: NetworkDefaultActionConfig
ingress: block
---
# Basic ingress firewall rule
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-https
portSelector:
  ports:
    - 443              # HTTPS port
  protocol: tcp
ingress:
  - subnet: 0.0.0.0/0  # Allow from any source
```

Each `NetworkRuleConfig` document specifies:
- `name`: A unique identifier for the rule
- `portSelector.ports`: A list of destination ports (or port ranges) the rule covers
- `portSelector.protocol`: Either `tcp` or `udp`
- `ingress`: A list of allowed sources, each containing a `subnet` (CIDR notation) and optional `except` (a CIDR to exclude from that subnet)

## Designing a Firewall Policy

A good firewall policy starts with understanding what services run on each node and who needs to access them. For a Talos Linux control plane node, the services are:

| Service | Port | Who Needs Access |
|---------|------|-----------------|
| Talos API | 50000 | Admin workstations |
| Kubernetes API | 6443 | Users, worker nodes, load balancers |
| etcd client | 2379 | Other control plane nodes |
| etcd peer | 2380 | Other control plane nodes |
| Kubelet | 10250 | API server |
| Scheduler | 10259 | Monitoring (optional) |
| Controller Manager | 10257 | Monitoring (optional) |

Each `NetworkRuleConfig` covers one `portSelector` (a set of ports plus a protocol), so a complete control plane policy is expressed as several documents:

```yaml
# Control plane firewall rules

# Talos API - admin access only
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: talos-api
portSelector:
  ports:
    - 50000
  protocol: tcp
ingress:
  - subnet: 10.10.0.0/24
---
# Kubernetes API - accessible from internal network
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: kube-api
portSelector:
  ports:
    - 6443
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
---
# etcd - control plane nodes only
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: etcd
portSelector:
  ports:
    - 2379
    - 2380
  protocol: tcp
ingress:
  - subnet: 10.0.1.0/24
---
# Kubelet - internal cluster traffic
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: kubelet
portSelector:
  ports:
    - 10250
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
```

For worker nodes, the services are different:

```yaml
# Worker node firewall rules

# Talos API - admin access only
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: talos-api
portSelector:
  ports:
    - 50000
  protocol: tcp
ingress:
  - subnet: 10.10.0.0/24
---
# Kubelet - API server needs access
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: kubelet
portSelector:
  ports:
    - 10250
  protocol: tcp
ingress:
  - subnet: 10.0.1.0/24
---
# NodePort services - accessible from internal network
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: nodeports
portSelector:
  ports:
    - 30000-32767
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
```

## Port Ranges

You can specify port ranges using the dash notation:

```yaml
# Allow a range of ports
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-nodeports
portSelector:
  ports:
    - 30000-32767  # Kubernetes NodePort range
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
```

This is more concise than listing every individual port and is essential for ranges like NodePorts.

## Multiple Source Subnets

When different source networks need access to the same ports, list each as a separate entry under `ingress`. The optional `except` field can carve out a smaller CIDR from a larger allowed subnet:

```yaml
# Allow API access from multiple networks
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: multi-source-api-access
portSelector:
  ports:
    - 6443
    - 50000
  protocol: tcp
ingress:
  # Office network
  - subnet: 192.168.1.0/24
  # VPN users, excluding a reserved range
  - subnet: 172.16.0.0/16
    except: 172.16.255.0/24
  # Cloud network (for managed services)
  - subnet: 10.100.0.0/16
```

## UDP Rules

Most Kubernetes traffic uses TCP, but some services need UDP:

```yaml
# DNS (if running a node-local DNS cache)
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: dns
portSelector:
  ports:
    - 53
  protocol: udp
ingress:
  - subnet: 10.0.0.0/8
---
# VXLAN overlay network traffic
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: vxlan
portSelector:
  ports:
    - 4789
  protocol: udp
ingress:
  - subnet: 10.0.0.0/8
---
# WireGuard (if using WireGuard-based CNI)
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: wireguard
portSelector:
  ports:
    - 51871
  protocol: udp
ingress:
  - subnet: 10.0.0.0/8
```

## Layered Firewall Rules

You can create multiple NetworkRuleConfig documents that each handle a specific aspect of your firewall policy:

```yaml
# File: rules-system.yaml - Core system services
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: system-services
portSelector:
  ports:
    - 50000
  protocol: tcp
ingress:
  - subnet: 10.10.0.0/24
---
# File: rules-kubernetes.yaml - Kubernetes services
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: kubernetes-services
portSelector:
  ports:
    - 6443
    - 10250
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
---
# File: rules-monitoring.yaml - Monitoring endpoints
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: monitoring-endpoints
portSelector:
  ports:
    - 9100   # Node exporter
    - 10249  # Kube-proxy metrics
    - 10250  # Kubelet metrics
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
```

This modular approach makes it easy to add, modify, or remove specific rule sets without touching others.

## Applying Firewall Rules

Apply rules alongside your machine configuration:

```bash
# Apply machine config with firewall rules
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file controlplane.yaml \
  --config-patch @rules-system.yaml \
  --config-patch @rules-kubernetes.yaml \
  --config-patch @rules-monitoring.yaml
```

Changes take effect immediately without a reboot.

## Verifying Firewall Rules

After applying, verify that the rules are present in the machine config and that the corresponding nftables chains are active:

```bash
# Extract the firewall documents from the running machine config
talosctl read /system/state/config.yaml --nodes 192.168.1.100 | \
  yq 'select(.kind == "NetworkDefaultActionConfig"), select(.kind == "NetworkRuleConfig")'

# Check the nftables ruleset (shows the actual firewall state)
talosctl get nftableschain --nodes 192.168.1.100 -o yaml
```

Test connectivity from allowed and denied sources:

```bash
# From an allowed subnet, this should work
talosctl get members --nodes 192.168.1.100

# From a denied subnet, this should time out
# (test from a machine outside the allowed subnet)
talosctl get members --nodes 192.168.1.100 --talosconfig denied-test.yaml
```

## Gradual Rollout Strategy

Rolling out firewall rules to an existing cluster should be done carefully:

1. Start with one non-critical worker node
2. Apply rules and verify all cluster functions still work
3. Check that the node stays healthy in Kubernetes
4. Roll out to all worker nodes
5. Apply to control plane nodes one at a time, verifying cluster health after each

```bash
# Step 1: Apply to test worker
talosctl apply-config --nodes 192.168.1.110 --file worker.yaml --config-patch @firewall-rules.yaml

# Step 2: Verify cluster health
kubectl get nodes
kubectl get pods -A | grep -v Running

# Step 3: If healthy, continue rollout
talosctl apply-config --nodes 192.168.1.111 --file worker.yaml --config-patch @firewall-rules.yaml
```

## Emergency Rule Removal

If firewall rules lock you out, reapply the configuration without the `NetworkRuleConfig` and `NetworkDefaultActionConfig` patches. Leaving `NetworkDefaultActionConfig` set to `block` while removing the rule documents would deny everything, so both must be dropped to recover an allow-all posture:

```bash
# Remove firewall rules by reapplying without patches
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file controlplane.yaml
```

This restores the default `accept` action for ingress traffic.

## CNI-Specific Considerations

Different CNIs use different ports and protocols. Make sure your firewall rules account for your specific CNI:

For Cilium:
- Port 4240 (TCP): Cilium health checks
- Port 4244 (TCP): Hubble relay
- Port 8472 (UDP): VXLAN overlay

For Calico:
- Port 179 (TCP): BGP peering
- Port 4789 (UDP): VXLAN overlay
- Port 5473 (TCP): Calico Typha

## Best Practices

Start with a permissive policy and tighten gradually. Audit your rules regularly to remove stale entries. Use descriptive names for your NetworkRuleConfig documents so their purpose is immediately clear. Always include monitoring port access in your rules so you can observe the node. Test every rule change before applying it cluster-wide. Keep a documented list of which ports each service needs and update it when you deploy new components.

Host-level ingress firewall rules in Talos Linux provide essential protection that operates independently of Kubernetes, ensuring your nodes are secure even during cluster bootstrap, upgrades, or API server outages.
