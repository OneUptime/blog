# How to Configure Ingress Firewall Rules in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Firewall, Ingress Rules, Network Security, Kubernetes

Description: A detailed guide to configuring ingress firewall rules in Talos Linux to protect nodes from unauthorized network access and secure cluster communication.

---

Talos Linux includes a built-in host-level firewall that operates below Kubernetes, protecting the node itself and its system services. Unlike Kubernetes NetworkPolicies that only control pod traffic, Talos ingress firewall rules control what traffic can reach the node's network stack in the first place. This is your first line of defense against unauthorized access to the Talos API, etcd, the kubelet, and other critical services.

This guide covers how to design and implement ingress firewall rules in Talos Linux using NetworkRuleConfig documents.

## How Talos Firewall Works

Talos implements its firewall using nftables under the hood. By default, when you create NetworkRuleConfig documents, Talos switches to a default-deny posture for the covered ports. Traffic that does not match any rule is dropped. This is the opposite of the default behavior (which allows everything), giving you explicit control over what traffic reaches your nodes.

The firewall operates on ingress traffic only - it controls what comes into the node. Egress traffic (outbound from the node) is not filtered by this mechanism.

## Basic Ingress Rule Structure

Ingress rules are defined within NetworkRuleConfig documents:

```yaml
# Basic ingress firewall rule
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-https
spec:
  ingress:
    - subnet: 0.0.0.0/0    # Allow from any source
      protocol: tcp
      ports:
        - 443              # HTTPS port
```

Each ingress rule specifies:
- `subnet`: The source IP range allowed to send traffic (CIDR notation)
- `protocol`: Either `tcp` or `udp`
- `ports`: A list of destination ports to allow

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

```yaml
# Control plane firewall rules
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: control-plane-firewall
spec:
  ingress:
    # Talos API - admin access only
    - subnet: 10.10.0.0/24
      protocol: tcp
      ports:
        - 50000

    # Kubernetes API - accessible from internal network
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 6443

    # etcd - control plane nodes only
    - subnet: 10.0.1.0/24
      protocol: tcp
      ports:
        - 2379
        - 2380

    # Kubelet - internal cluster traffic
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 10250
```

For worker nodes, the services are different:

```yaml
# Worker node firewall rules
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: worker-firewall
spec:
  ingress:
    # Talos API - admin access only
    - subnet: 10.10.0.0/24
      protocol: tcp
      ports:
        - 50000

    # Kubelet - API server needs access
    - subnet: 10.0.1.0/24
      protocol: tcp
      ports:
        - 10250

    # NodePort services - accessible from internal network
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 30000-32767
```

## Port Ranges

You can specify port ranges using the dash notation:

```yaml
# Allow a range of ports
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-nodeports
spec:
  ingress:
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 30000-32767  # Kubernetes NodePort range
```

This is more concise than listing every individual port and is essential for ranges like NodePorts.

## Multiple Source Subnets

When different source networks need access to the same ports, list them as separate ingress entries:

```yaml
# Allow from multiple networks
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: multi-source-api-access
spec:
  ingress:
    # Office network
    - subnet: 192.168.1.0/24
      protocol: tcp
      ports:
        - 6443
        - 50000

    # VPN users
    - subnet: 172.16.0.0/16
      protocol: tcp
      ports:
        - 6443
        - 50000

    # Cloud network (for managed services)
    - subnet: 10.100.0.0/16
      protocol: tcp
      ports:
        - 6443
```

## UDP Rules

Most Kubernetes traffic uses TCP, but some services need UDP:

```yaml
# Allow UDP traffic for specific services
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-udp-services
spec:
  ingress:
    # DNS (if running a node-local DNS cache)
    - subnet: 10.0.0.0/8
      protocol: udp
      ports:
        - 53

    # VXLAN overlay network traffic
    - subnet: 10.0.0.0/8
      protocol: udp
      ports:
        - 4789

    # WireGuard (if using WireGuard-based CNI)
    - subnet: 10.0.0.0/8
      protocol: udp
      ports:
        - 51871
```

## Layered Firewall Rules

You can create multiple NetworkRuleConfig documents that each handle a specific aspect of your firewall policy:

```yaml
# File: rules-system.yaml - Core system services
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: system-services
spec:
  ingress:
    - subnet: 10.10.0.0/24
      protocol: tcp
      ports:
        - 50000
---
# File: rules-kubernetes.yaml - Kubernetes services
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: kubernetes-services
spec:
  ingress:
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 6443
        - 10250
---
# File: rules-monitoring.yaml - Monitoring endpoints
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: monitoring-endpoints
spec:
  ingress:
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 9100   # Node exporter
        - 10249  # Kube-proxy metrics
        - 10250  # Kubelet metrics
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

After applying, verify that rules are active:

```bash
# List active network rules
talosctl get networkruleconfigs --nodes 192.168.1.100

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

If firewall rules lock you out, you can remove them by reapplying the configuration without the NetworkRuleConfig patches:

```bash
# Remove firewall rules by reapplying without patches
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file controlplane.yaml
```

This restores the default allow-all behavior for ingress traffic.

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
