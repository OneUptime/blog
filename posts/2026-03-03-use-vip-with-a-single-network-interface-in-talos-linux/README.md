# How to Use VIP with a Single Network Interface in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, VIP, Networking, High Availability, Kubernetes, Single NIC

Description: Guide to configuring and using a Virtual IP address on Talos Linux nodes that have only one network interface for both management and workload traffic.

---

Many Talos Linux deployments, particularly in home labs, small offices, or cost-sensitive environments, run on hardware with a single network interface. This means all traffic - Talos management, Kubernetes API, pod networking, and application data - flows through one NIC. Setting up a VIP in this scenario is straightforward, but there are some specific considerations you need to keep in mind.

This guide covers how to configure and operate VIP effectively when your nodes only have one network interface.

## The Single NIC Reality

In an ideal world, you would have separate interfaces for management traffic, cluster communication, storage, and application data. In practice, many deployments use a single Ethernet port per node. This is perfectly fine for small to medium clusters. Talos Linux handles this well because all traffic is multiplexed over the same interface, and the VIP is just one more address on that interface.

The configuration is actually simpler than multi-NIC setups because there is no question about which interface gets the VIP.

## Basic VIP Configuration

Here is the machine configuration for a control plane node with a single interface:

```yaml
# Control plane node with single NIC and VIP
machine:
  network:
    hostname: cp-01
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24      # Node's primary IP
        routes:
          - network: 0.0.0.0/0    # Default route
            gateway: 192.168.1.1
        vip:
          ip: 192.168.1.100       # Shared VIP
    nameservers:
      - 8.8.8.8
      - 1.1.1.1
```

Each control plane node gets the same VIP configuration but a different primary address:

```yaml
# Node 2: cp-02
- interface: eth0
  addresses:
    - 192.168.1.11/24
  vip:
    ip: 192.168.1.100

# Node 3: cp-03
- interface: eth0
  addresses:
    - 192.168.1.12/24
  vip:
    ip: 192.168.1.100
```

Worker nodes do not need VIP configuration. They connect to the VIP address but do not participate in the VIP election:

```yaml
# Worker node - no VIP, but references VIP for cluster endpoint
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.20/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
cluster:
  controlPlane:
    endpoint: https://192.168.1.100:6443    # Points to VIP
```

## How It Works with One Interface

When a node owns the VIP, its single interface has two IP addresses:

```bash
# On the VIP owner node
talosctl -n 192.168.1.10 get addresses
# Shows:
# eth0: 192.168.1.10/24    (primary address)
# eth0: 192.168.1.100/32   (VIP address)
```

Both addresses are on the same physical interface. Traffic to either address arrives at the same NIC. The Linux kernel handles routing incoming traffic to the correct service based on the destination IP and port.

The Kubernetes API server listens on all interfaces (0.0.0.0:6443 by default), so it responds to requests on both the primary address and the VIP address.

## Applying and Verifying

```bash
# Generate configs
talosctl gen config my-cluster https://192.168.1.100:6443

# Apply to control plane nodes
talosctl -n 192.168.1.10 apply-config --file controlplane.yaml
talosctl -n 192.168.1.11 apply-config --file controlplane.yaml
talosctl -n 192.168.1.12 apply-config --file controlplane.yaml

# Bootstrap the cluster (only on first node)
talosctl -n 192.168.1.10 bootstrap

# Wait for cluster to come up
talosctl -n 192.168.1.10 health

# Verify VIP is assigned
for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
  echo -n "$node: "
  talosctl -n $node get addresses 2>/dev/null | grep "192.168.1.100" || echo "no VIP"
done
```

## DHCP with VIP

If you prefer DHCP for the primary address, you can combine DHCP with a static VIP:

```yaml
# DHCP for primary address, static VIP
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true    # Primary address via DHCP
        vip:
          ip: 192.168.1.100    # Static VIP
```

This works, but there is a caveat: if DHCP assigns an address on a different subnet than the VIP, things will break. Make sure your DHCP server always assigns addresses on the same subnet as the VIP.

A safer approach is to use static addressing for control plane nodes and DHCP only for workers:

```yaml
# Static addressing is more predictable for control plane
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24    # Static - no surprises
        vip:
          ip: 192.168.1.100
```

## Bandwidth Considerations

With a single interface, all traffic shares the same bandwidth. On a 1 Gbps interface, you might see:

- Kubernetes API traffic: relatively low bandwidth
- Pod-to-pod traffic (via CNI overlay): can be significant
- Storage traffic (if using network storage): often the biggest consumer
- Application ingress/egress: varies by workload

The VIP traffic itself is minimal - it is just the Kubernetes API server traffic, which is typically small unless you are running very large clusters with thousands of pods.

```bash
# Monitor interface traffic to understand bandwidth usage
talosctl -n <node-ip> get links eth0 -o yaml | grep -i "bytes\|packets"
```

If bandwidth becomes a bottleneck, consider upgrading to 10 Gbps or 25 Gbps interfaces rather than adding more 1 Gbps ports.

## Failover Behavior with Single NIC

VIP failover with a single interface works the same as with multiple interfaces. When the VIP owner goes down:

1. The etcd lease expires
2. Another node wins the election
3. The new owner adds the VIP to its eth0 interface
4. A gratuitous ARP announcement is sent
5. Traffic redirects to the new owner

```bash
# Test failover
# First, find the VIP owner
for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
  talosctl -n $node get addresses 2>/dev/null | grep -q "192.168.1.100" && echo "VIP owner: $node"
done

# Reboot the VIP owner
talosctl -n <vip-owner> reboot

# Watch the VIP move
watch -n 1 'for n in 192.168.1.10 192.168.1.11 192.168.1.12; do echo -n "$n: "; talosctl -n $n get addresses 2>/dev/null | grep 192.168.1.100 || echo "no"; done'
```

The failover time is the same regardless of how many interfaces you have - typically 3-12 seconds.

## Security with Single NIC

With a single interface, all traffic is on the same network segment. This means:

- Management traffic (talosctl) is on the same network as application traffic
- The Kubernetes API server is reachable from the same network as your pods
- There is no network-level isolation between management and workload traffic

To mitigate this, use these approaches:

### Kubernetes Network Policies

```yaml
# Restrict access to the kube-system namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-kube-system
  namespace: kube-system
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector: {}
```

### Talos Firewall Rules

```yaml
# Restrict Talos API access to known management IPs
machine:
  network:
    nftablesRules:
      - name: restrict-management
        table: filter
        chain: input
        policy: accept
        rules:
          - match: tcp dport 50000 ip saddr != 192.168.1.0/24
            verdict: drop
```

## Monitoring Tips

With everything on one interface, monitoring is simple:

```bash
# Check interface health
talosctl -n <node-ip> get links eth0

# Monitor for packet drops (sign of congestion)
talosctl -n <node-ip> get links eth0 -o yaml | grep -i "drop\|error"

# Check VIP health
curl -sk https://192.168.1.100:6443/healthz

# Monitor API server latency through VIP
time kubectl --server=https://192.168.1.100:6443 get nodes
```

## When to Add a Second Interface

Consider adding a second interface when:

- Network bandwidth becomes a bottleneck
- You need to physically separate management and application traffic for security compliance
- Storage traffic is competing with application traffic
- You want to put different traffic types on different VLANs for better isolation

For most home labs and small deployments, a single interface with VIP is perfectly adequate and significantly simpler to manage.

## Conclusion

Using VIP with a single network interface on Talos Linux is the simplest and most common configuration. There is nothing inherently wrong with running everything through one NIC, and for many deployments it is the right choice. The VIP just adds an additional address to the same interface, and failover works identically to multi-NIC setups. Keep your control plane nodes on static IPs for predictability, make sure the VIP is on the same subnet, and test failover to confirm everything works. That is really all there is to it.
