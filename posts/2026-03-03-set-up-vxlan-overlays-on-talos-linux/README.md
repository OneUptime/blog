# How to Set Up VXLAN Overlays on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, VXLAN, Overlay Networks, Networking, Kubernetes, CNI, Flannel

Description: Guide to setting up VXLAN overlay networks on Talos Linux for extending Layer 2 connectivity across Layer 3 boundaries.

---

VXLAN (Virtual Extensible LAN) is an overlay network technology that encapsulates Layer 2 Ethernet frames inside Layer 3 UDP packets. This lets you extend a Layer 2 network across Layer 3 boundaries, effectively connecting machines on different physical subnets as if they were on the same switch. In the context of Talos Linux and Kubernetes, VXLAN is one of the most common overlay technologies used by CNI plugins to create the pod network.

This guide covers how VXLAN works, how it is used in Talos Linux clusters, and how to configure both CNI-managed and manual VXLAN overlays.

## How VXLAN Works

VXLAN wraps each Ethernet frame in a UDP packet with a VXLAN header. The key components are:

- **VNI (VXLAN Network Identifier)**: A 24-bit ID that identifies the overlay network. Think of it as a VLAN ID, but with a much larger range (up to 16 million networks).
- **VTEP (VXLAN Tunnel Endpoint)**: The network device that encapsulates and decapsulates VXLAN packets. On Linux, this is a virtual network interface.
- **UDP Port**: VXLAN uses UDP port 4789 by default.

The encapsulation adds overhead (50 bytes for VXLAN + UDP + outer IP headers), so the MTU on VXLAN interfaces is typically 1450 when the physical network MTU is 1500.

## VXLAN in Kubernetes CNI Plugins

Most Kubernetes CNI plugins support VXLAN as an overlay mode. When you use VXLAN with your CNI, the plugin handles all the VXLAN configuration automatically.

### Flannel with VXLAN

Flannel is one of the simplest CNI plugins and uses VXLAN by default:

```yaml
# Flannel configuration in Talos machine config
cluster:
  network:
    cni:
      name: flannel
  podSubnets:
    - 10.244.0.0/16
  serviceSubnets:
    - 10.96.0.0/12
```

Flannel creates a `flannel.1` VXLAN interface on each node and manages the overlay automatically.

### Calico with VXLAN

Calico supports VXLAN as an alternative to its default IPIP encapsulation:

```yaml
# Install Calico with VXLAN encapsulation
# In the Calico installation manifest:
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    bgp: Disabled
    ipPools:
      - blockSize: 26
        cidr: 10.244.0.0/16
        encapsulation: VXLAN
        natOutgoing: Enabled
        nodeSelector: all()
```

### Cilium with VXLAN

Cilium also supports VXLAN tunneling:

```bash
# Install Cilium with VXLAN tunnel mode
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set tunnel=vxlan \
  --set ipam.mode=kubernetes
```

## Talos-Specific VXLAN Configuration

### MTU Settings

Since VXLAN adds encapsulation overhead, you need to account for the reduced MTU. Configure this in the Talos machine configuration:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        mtu: 1500  # Physical interface MTU

# For the CNI, configure MTU in the CNI settings
cluster:
  network:
    cni:
      name: custom
      urls:
        - https://raw.githubusercontent.com/cilium/cilium/v1.15.0/install/kubernetes/quick-install.yaml
```

If your physical network supports jumbo frames, you can increase the physical MTU to accommodate VXLAN overhead:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        mtu: 9000  # Jumbo frames on physical network
        # VXLAN interfaces will use 8950 (9000 - 50 bytes overhead)
```

### Firewall Considerations

VXLAN uses UDP port 4789. Make sure this port is open between all nodes in your cluster:

```yaml
# No Talos host firewall by default, but check network-level firewalls
# Required: UDP 4789 between all nodes
```

### Kernel Parameters

Some kernel parameters affect VXLAN performance:

```yaml
machine:
  sysctls:
    # Enable IP forwarding (required for overlay routing)
    net.ipv4.ip_forward: "1"

    # Increase UDP receive buffer for VXLAN performance
    net.core.rmem_max: "16777216"
    net.core.wmem_max: "16777216"

    # Increase neighbor table size for large clusters
    net.ipv4.neigh.default.gc_thresh1: "4096"
    net.ipv4.neigh.default.gc_thresh2: "8192"
    net.ipv4.neigh.default.gc_thresh3: "16384"
```

The neighbor table settings are important for large clusters because each VXLAN peer requires an entry in the ARP/neighbor table.

## Manual VXLAN Configuration

While CNI plugins handle VXLAN automatically for the pod network, you might need manual VXLAN configuration for other use cases, such as connecting to external VXLAN networks or creating separate overlay networks for specific purposes.

### Using Machine Configuration Files

You can create VXLAN interfaces using configuration files placed by Talos:

```yaml
machine:
  files:
    - content: |
        [NetDev]
        Name=vxlan100
        Kind=vxlan

        [VXLAN]
        VNI=100
        Local=192.168.1.10
        Remote=192.168.1.11
        Port=4789
      path: /etc/systemd/network/25-vxlan100.netdev
      permissions: 0644
```

Note that Talos uses its own networking stack rather than systemd-networkd, so manual VXLAN creation typically requires using a system extension or an init container approach.

### Using a Privileged DaemonSet

For manual VXLAN interfaces, a DaemonSet can create and manage them:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: vxlan-manager
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: vxlan-manager
  template:
    metadata:
      labels:
        app: vxlan-manager
    spec:
      hostNetwork: true
      initContainers:
        - name: setup-vxlan
          image: nicolaka/netshoot
          securityContext:
            privileged: true
          command:
            - /bin/sh
            - -c
            - |
              # Create VXLAN interface
              ip link add vxlan100 type vxlan \
                id 100 \
                dstport 4789 \
                local $(hostname -I | awk '{print $1}') \
                group 239.1.1.1 \
                dev eth0

              # Assign IP to the VXLAN interface
              ip addr add 10.100.0.$(hostname -I | awk -F. '{print $4}')/24 dev vxlan100

              # Bring up the interface
              ip link set vxlan100 up

              echo "VXLAN interface configured"
      containers:
        - name: keepalive
          image: busybox
          command: ["sleep", "infinity"]
      tolerations:
        - operator: Exists
```

## VXLAN Multicast vs Unicast

VXLAN can use either multicast or unicast for distributing broadcast, unknown unicast, and multicast (BUM) traffic:

### Multicast Mode

```bash
# Multicast VXLAN - uses a multicast group for BUM traffic
ip link add vxlan100 type vxlan \
  id 100 \
  group 239.1.1.1 \
  dstport 4789 \
  dev eth0
```

Requires multicast support on the physical network, which many cloud environments do not provide.

### Unicast Mode (Head-End Replication)

```bash
# Unicast VXLAN - manually specify remote VTEPs
ip link add vxlan100 type vxlan \
  id 100 \
  dstport 4789 \
  local 192.168.1.10 \
  nolearning

# Add remote VTEP entries
bridge fdb append 00:00:00:00:00:00 dev vxlan100 dst 192.168.1.11
bridge fdb append 00:00:00:00:00:00 dev vxlan100 dst 192.168.1.12
```

Most Kubernetes CNI plugins use unicast mode with a control plane that manages VTEP entries, eliminating the need for multicast.

## Monitoring VXLAN

### Check VXLAN Interface Status

```bash
# From a debug pod
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  ip -d link show type vxlan

# Check VXLAN FDB entries
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  bridge fdb show dev flannel.1
```

### Performance Monitoring

```bash
# Check interface statistics
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  ip -s link show flannel.1

# Check for drops
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  ethtool -S flannel.1 2>/dev/null || echo "ethtool stats not available"
```

## Troubleshooting VXLAN

### Pods Cannot Communicate Across Nodes

```bash
# Verify VXLAN interface exists on both nodes
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- ip link show type vxlan
kubectl debug node/talos-node-2 -it --image=nicolaka/netshoot -- ip link show type vxlan

# Check if UDP 4789 is reachable between nodes
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  nc -zuv 192.168.1.11 4789

# Check MTU settings
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  ip link show flannel.1 | grep mtu
```

### MTU-Related Issues

If large packets fail but small packets work, it is likely an MTU issue:

```bash
# Test with different packet sizes
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  ping -M do -s 1400 <pod-ip-on-other-node>

# If 1400 works but 1450 does not, the MTU is set correctly
# If 1400 also fails, check for additional encapsulation overhead
```

### VXLAN Performance

VXLAN adds CPU overhead for encapsulation/decapsulation. If you see performance issues:

1. Enable checksum offloading on the physical NIC
2. Use jumbo frames to reduce the relative overhead
3. Consider using native routing (no encapsulation) if your network supports it

## Conclusion

VXLAN overlays are a fundamental building block of Kubernetes networking on Talos Linux. While CNI plugins like Flannel, Calico, and Cilium handle VXLAN configuration automatically for the pod network, understanding how VXLAN works helps you troubleshoot networking issues and configure manual overlays when needed. Pay attention to MTU settings, firewall rules for UDP 4789, and kernel parameters to ensure reliable overlay networking in your cluster.
