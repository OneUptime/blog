# How to Configure Flannel CNI on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Flannel, CNI, Networking, Kubernetes, VXLAN

Description: Guide to understanding and configuring the default Flannel CNI in Talos Linux including VXLAN settings, backend options, and common customizations.

---

Flannel is the default CNI plugin that ships with Talos Linux. It is simple, reliable, and gets pod networking up and running with minimal configuration. For many Talos Linux deployments, Flannel works perfectly fine out of the box and does not need any tweaking at all. But there are situations where you need to customize Flannel's behavior - adjusting the backend, changing the pod CIDR, tweaking MTU settings, or modifying how interfaces are detected.

This guide covers how Flannel works in Talos Linux and the configurations you can make to customize its behavior.

## How Flannel Works in Talos Linux

Flannel provides a simple overlay network for Kubernetes pods. When Talos Linux boots with the default CNI configuration, it deploys Flannel as a DaemonSet in the `kube-flannel` namespace. Each Flannel pod:

1. Reads the cluster's pod CIDR configuration
2. Requests a subnet lease for its node from the Kubernetes API
3. Creates a VXLAN interface (flannel.1) on the node
4. Sets up routes so that pod traffic to other nodes goes through the VXLAN tunnel
5. Configures the CNI plugin binary so that new pods get IPs from the node's subnet

The default backend is VXLAN, which encapsulates Layer 2 frames in UDP packets. This works across any Layer 3 network without requiring any special configuration on the underlying infrastructure.

## Default Flannel Configuration

When you create a Talos Linux cluster with the default CNI, this is what you get:

```yaml
# Default Talos cluster config (Flannel is used automatically)
cluster:
  network:
    cni:
      name: flannel    # This is the default, you don't need to specify it
    podSubnets:
      - 10.244.0.0/16   # Default pod CIDR
    serviceSubnets:
      - 10.96.0.0/12    # Default service CIDR
```

Verify Flannel is running:

```bash
# Check Flannel pods
kubectl get pods -n kube-flannel

# Check the Flannel ConfigMap
kubectl get configmap -n kube-flannel kube-flannel-cfg -o yaml

# Verify the VXLAN interface on a node
talosctl -n <node-ip> get links flannel.1
```

## Customizing the Pod CIDR

If the default 10.244.0.0/16 conflicts with your existing network, change it in the Talos cluster configuration:

```yaml
# Custom pod CIDR
cluster:
  network:
    podSubnets:
      - 172.16.0.0/16    # Custom pod CIDR
```

This must be set before bootstrapping the cluster. Changing the pod CIDR on an existing cluster requires a full rebuild.

```bash
# Verify the pod CIDR after cluster creation
kubectl get nodes -o jsonpath='{.items[*].spec.podCIDR}'
```

## Configuring Flannel Backend

Flannel supports multiple backends. The default is VXLAN, but you can customize it through the Flannel ConfigMap.

### VXLAN Backend (Default)

```json
{
  "Network": "10.244.0.0/16",
  "Backend": {
    "Type": "vxlan",
    "VNI": 1,
    "Port": 8472,
    "DirectRouting": false
  }
}
```

### VXLAN with Direct Routing

Direct routing sends traffic directly when nodes are on the same subnet, falling back to VXLAN only for cross-subnet communication:

```bash
# Edit the Flannel ConfigMap
kubectl edit configmap -n kube-flannel kube-flannel-cfg
```

```json
{
  "Network": "10.244.0.0/16",
  "Backend": {
    "Type": "vxlan",
    "DirectRouting": true
  }
}
```

This improves performance for nodes on the same Layer 2 segment by avoiding unnecessary encapsulation.

### Host-GW Backend

If all your nodes are on the same Layer 2 network, you can use the host-gw backend for the best performance. It uses static routes instead of encapsulation:

```json
{
  "Network": "10.244.0.0/16",
  "Backend": {
    "Type": "host-gw"
  }
}
```

The host-gw backend adds routes on each node pointing to other nodes for their pod subnets. There is no encapsulation overhead, but it only works when all nodes are on the same subnet because it relies on direct Layer 2 connectivity.

### WireGuard Backend

For encrypted pod traffic, use the WireGuard backend:

```json
{
  "Network": "10.244.0.0/16",
  "Backend": {
    "Type": "wireguard",
    "PersistentKeepaliveInterval": 25
  }
}
```

This encrypts all pod-to-pod traffic between nodes using WireGuard. It has more overhead than plain VXLAN but provides strong encryption.

## Adjusting MTU Settings

MTU mismatches are a common source of networking problems. Flannel needs its MTU set correctly based on the underlying network:

```bash
# Check the current MTU on the Flannel interface
talosctl -n <node-ip> get links flannel.1 -o yaml | grep mtu
```

For VXLAN, the MTU should be your physical interface MTU minus 50 bytes (VXLAN overhead). If your physical interface is 1500, the Flannel MTU should be 1450.

To change it, edit the Flannel ConfigMap:

```json
{
  "Network": "10.244.0.0/16",
  "Backend": {
    "Type": "vxlan",
    "MTU": 1450
  }
}
```

After changing the MTU, restart the Flannel pods:

```bash
# Restart Flannel to pick up the new MTU
kubectl rollout restart daemonset -n kube-flannel kube-flannel-ds
```

Common MTU values:

| Physical MTU | Backend | Flannel MTU |
|-------------|---------|-------------|
| 1500 | VXLAN | 1450 |
| 9000 | VXLAN | 8950 |
| 1500 | host-gw | 1500 |
| 1500 | WireGuard | 1420 |

## Interface Detection

By default, Flannel auto-detects the interface to use for inter-node communication. If a node has multiple interfaces, Flannel might pick the wrong one. You can control this through the Flannel DaemonSet:

```bash
# Check which interface Flannel is using
kubectl logs -n kube-flannel -l app=flannel | grep "Using interface"
```

To specify an interface, edit the Flannel DaemonSet and add the `--iface` flag:

```yaml
# In the Flannel DaemonSet spec
containers:
  - name: kube-flannel
    args:
      - --ip-masq
      - --kube-subnet-mgr
      - --iface=eth0    # Force Flannel to use eth0
```

You can also specify the interface by regex pattern:

```yaml
args:
  - --iface-regex=eth.*    # Match any eth interface
```

## Monitoring Flannel

Check the health and status of your Flannel deployment:

```bash
# Check Flannel pod logs for errors
kubectl logs -n kube-flannel -l app=flannel --tail=50

# Verify subnet leases
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'

# Check VXLAN FDB (forwarding database) entries
talosctl -n <node-ip> get links flannel.1 -o yaml

# Verify routes on a node
talosctl -n <node-ip> get routes | grep "10.244"
```

## Troubleshooting Flannel Issues

### Pods Cannot Communicate Across Nodes

```bash
# Verify VXLAN traffic is not being blocked
# Check for UDP port 8472 connectivity between nodes
talosctl -n <node-ip> pcap --interface eth0 --bpf-filter "udp port 8472" --duration 10s -o vxlan.pcap

# Check Flannel interface is up
talosctl -n <node-ip> get links flannel.1

# Look for errors in Flannel logs
kubectl logs -n kube-flannel -l app=flannel | grep -i "error\|fail"
```

### Subnet Lease Conflicts

```bash
# Check for subnet conflicts
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.podCIDR}{"\n"}{end}'

# Look for lease-related errors
kubectl logs -n kube-flannel -l app=flannel | grep -i "lease\|subnet"
```

### Performance Issues

If you are seeing high latency or low throughput with Flannel:

1. Check MTU settings (mismatched MTU causes fragmentation)
2. Consider switching to host-gw backend if all nodes are on the same subnet
3. Enable DirectRouting in VXLAN mode for same-subnet optimization
4. Check for packet drops on the VXLAN interface

```bash
# Check for interface errors
talosctl -n <node-ip> get links flannel.1 -o yaml | grep -i "error\|drop"
```

## When to Move Beyond Flannel

Flannel is great for simplicity, but consider switching to Calico or Cilium if you need:

- Network policy enforcement (Flannel has none)
- BGP peering with your network infrastructure
- Layer 7 traffic filtering
- Advanced observability (Hubble with Cilium)
- Transparent encryption that performs better than WireGuard backend
- Dual-stack (IPv4/IPv6) networking

To migrate away from Flannel, update your Talos machine config to set `cni.name: none` and install your preferred CNI. This requires careful planning as it will disrupt pod networking during the transition.

## Conclusion

Flannel in Talos Linux just works for most straightforward Kubernetes deployments. The VXLAN backend handles cross-subnet pod communication without any special network configuration, and the setup is completely automatic when using Talos defaults. When you do need to customize Flannel, the main knobs to turn are the backend type, MTU settings, and interface selection. If your needs grow beyond what Flannel offers, particularly around network policies and observability, you know it is time to look at Calico or Cilium instead.
