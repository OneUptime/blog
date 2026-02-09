# How to Configure Bridge CNI Plugin for Pod Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CNI, Bridge, Networking, Linux

Description: Learn how to configure and troubleshoot the bridge CNI plugin for Kubernetes pod networking, including IPAM configuration, network isolation, and custom bridge setup.

---

The bridge CNI plugin is one of the simplest and most commonly used CNI plugins for container networking. It creates a Linux bridge on each node and connects pods to this bridge using veth pairs, enabling pods on the same node to communicate directly through Layer 2 switching. While production Kubernetes clusters typically use more sophisticated CNI plugins like Calico or Cilium, understanding the bridge plugin provides essential insights into how container networking works at the fundamental level.

The bridge plugin excels in simple single-node or lab environments where you need basic connectivity without advanced features like network policies or multi-node routing. It's also perfect for learning how CNI plugins operate because you can directly observe the network devices, bridges, and routes it creates using standard Linux networking tools.

## Basic Bridge CNI Configuration

Create a simple bridge CNI configuration:

```json
{
  "cniVersion": "1.0.0",
  "name": "mynet",
  "type": "bridge",
  "bridge": "cni0",
  "isGateway": true,
  "ipMasq": true,
  "hairpinMode": true,
  "ipam": {
    "type": "host-local",
    "subnet": "10.244.0.0/16",
    "routes": [
      { "dst": "0.0.0.0/0" }
    ],
    "dataDir": "/var/lib/cni/networks"
  }
}
```

Save this to `/etc/cni/net.d/10-bridge.conf`. The numeric prefix (10) determines plugin precedence when multiple configurations exist.

Let's understand each field:

- `cniVersion`: CNI specification version
- `name`: Network name (must be unique)
- `type`: Plugin executable name (must exist in CNI_PATH)
- `bridge`: Bridge device name on the host
- `isGateway`: If true, bridge gets an IP and acts as default gateway
- `ipMasq`: Enable IP masquerading (NAT) for external traffic
- `hairpinMode`: Allow pods to reach their own service via cluster IP
- `ipam`: IP address management configuration

## Installing Bridge CNI Plugin

Install the CNI plugins including bridge:

```bash
# Download CNI plugins
CNI_VERSION="v1.4.0"
mkdir -p /opt/cni/bin
curl -L "https://github.com/containernetworking/plugins/releases/download/${CNI_VERSION}/cni-plugins-linux-amd64-${CNI_VERSION}.tgz" | tar -C /opt/cni/bin -xz

# Verify installation
ls -l /opt/cni/bin/
# Should see: bridge, host-local, loopback, etc.

# Create CNI config directory
mkdir -p /etc/cni/net.d

# Deploy bridge configuration
cat > /etc/cni/net.d/10-bridge.conf <<EOF
{
  "cniVersion": "1.0.0",
  "name": "mynet",
  "type": "bridge",
  "bridge": "cni0",
  "isGateway": true,
  "ipMasq": true,
  "ipam": {
    "type": "host-local",
    "subnet": "10.244.0.0/16",
    "routes": [
      { "dst": "0.0.0.0/0" }
    ]
  }
}
EOF
```

## Testing Bridge Plugin Manually

Test the bridge plugin outside of Kubernetes:

```bash
# Create a test network namespace
ip netns add testing

# Create CNI config
cat > /tmp/bridge-test.conf <<EOF
{
  "cniVersion": "1.0.0",
  "name": "testnet",
  "type": "bridge",
  "bridge": "test-br0",
  "isGateway": true,
  "ipMasq": true,
  "ipam": {
    "type": "host-local",
    "subnet": "10.100.0.0/16",
    "routes": [{"dst": "0.0.0.0/0"}]
  }
}
EOF

# Invoke bridge plugin to ADD network
CNI_COMMAND=ADD \
CNI_CONTAINERID=test123 \
CNI_NETNS=/var/run/netns/testing \
CNI_IFNAME=eth0 \
CNI_PATH=/opt/cni/bin \
/opt/cni/bin/bridge < /tmp/bridge-test.conf

# Check created bridge
ip link show test-br0
# Output: test-br0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 ...

# Check IP on bridge (gateway IP)
ip addr show test-br0

# Check veth pair
ip link | grep veth

# Check inside namespace
ip netns exec testing ip addr show
ip netns exec testing ip route show

# Test connectivity
ip netns exec testing ping -c 3 8.8.8.8

# Cleanup - invoke DEL
CNI_COMMAND=DEL \
CNI_CONTAINERID=test123 \
CNI_NETNS=/var/run/netns/testing \
CNI_IFNAME=eth0 \
CNI_PATH=/opt/cni/bin \
/opt/cni/bin/bridge < /tmp/bridge-test.conf

# Remove test namespace
ip netns del testing
```

## Understanding What Bridge Plugin Creates

When the bridge plugin runs, it creates several network components:

```bash
# Bridge device on host
ip link show cni0
# cni0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP

# Bridge has gateway IP
ip addr show cni0
# inet 10.244.0.1/16 scope global cni0

# Veth pairs connecting pods to bridge
ip link | grep veth
# veth12345abc@if3: <BROADCAST,MULTICAST,UP,LOWER_UP> master cni0

# Pod's view (inside container network namespace)
nsenter -t <pid> -n ip addr
# eth0: inet 10.244.0.5/16 scope global eth0

# Pod's routing table
nsenter -t <pid> -n ip route
# default via 10.244.0.1 dev eth0
# 10.244.0.0/16 dev eth0 scope link src 10.244.0.5
```

## Configuring Multiple Networks

Create multiple isolated networks:

```json
// /etc/cni/net.d/10-frontend-net.conf
{
  "cniVersion": "1.0.0",
  "name": "frontend-net",
  "type": "bridge",
  "bridge": "frontend-br",
  "isGateway": true,
  "ipMasq": true,
  "ipam": {
    "type": "host-local",
    "subnet": "10.10.0.0/16",
    "ranges": [
      [{
        "subnet": "10.10.0.0/24",
        "rangeStart": "10.10.0.10",
        "rangeEnd": "10.10.0.250",
        "gateway": "10.10.0.1"
      }]
    ]
  }
}

// /etc/cni/net.d/20-backend-net.conf
{
  "cniVersion": "1.0.0",
  "name": "backend-net",
  "type": "bridge",
  "bridge": "backend-br",
  "isGateway": true,
  "ipMasq": true,
  "ipam": {
    "type": "host-local",
    "subnet": "10.20.0.0/16",
    "ranges": [
      [{
        "subnet": "10.20.0.0/24",
        "rangeStart": "10.20.0.10",
        "rangeEnd": "10.20.0.250",
        "gateway": "10.20.0.1"
      }]
    ]
  }
}
```

## Advanced IPAM Configuration

Configure more sophisticated IP allocation:

```json
{
  "cniVersion": "1.0.0",
  "name": "advanced-net",
  "type": "bridge",
  "bridge": "cni0",
  "isGateway": true,
  "ipMasq": true,
  "ipam": {
    "type": "host-local",
    "ranges": [
      [
        {
          "subnet": "10.244.0.0/24",
          "rangeStart": "10.244.0.20",
          "rangeEnd": "10.244.0.100",
          "gateway": "10.244.0.1"
        }
      ],
      [
        {
          "subnet": "10.244.1.0/24",
          "rangeStart": "10.244.1.20",
          "rangeEnd": "10.244.1.100",
          "gateway": "10.244.1.1"
        }
      ]
    ],
    "routes": [
      { "dst": "0.0.0.0/0" },
      { "dst": "192.168.0.0/16", "gw": "10.244.0.254" }
    ],
    "dataDir": "/var/lib/cni/networks"
  }
}
```

This configuration provides two IP ranges and custom routing.

## Plugin Chaining with Bridge

Combine bridge with other plugins:

```json
{
  "cniVersion": "1.0.0",
  "name": "mynet",
  "plugins": [
    {
      "type": "bridge",
      "bridge": "cni0",
      "isGateway": true,
      "ipMasq": true,
      "hairpinMode": true,
      "ipam": {
        "type": "host-local",
        "subnet": "10.244.0.0/16"
      }
    },
    {
      "type": "portmap",
      "capabilities": {
        "portMappings": true
      },
      "snat": true
    },
    {
      "type": "bandwidth",
      "ingressRate": 10000000,
      "ingressBurst": 20000000,
      "egressRate": 10000000,
      "egressBurst": 20000000
    },
    {
      "type": "tuning",
      "sysctl": {
        "net.ipv4.conf.all.log_martians": "1",
        "net.ipv4.conf.all.rp_filter": "1"
      }
    }
  ]
}
```

This chain:
1. Creates bridge networking
2. Adds port mapping support (for HostPort)
3. Applies bandwidth limits
4. Sets kernel network parameters

## Troubleshooting Bridge CNI

### Problem: Pods can't communicate

```bash
# Check if bridge exists
ip link show cni0

# Verify bridge has IP
ip addr show cni0

# Check veth pairs are attached to bridge
bridge link show

# Verify IP masquerading rules
iptables -t nat -L POSTROUTING -n -v | grep 10.244

# Check pod IP allocation
ls -l /var/lib/cni/networks/mynet/

# Test connectivity from pod
kubectl exec -it <pod> -- ping 8.8.8.8
```

### Problem: IP allocation failures

```bash
# Check IPAM data directory
ls -l /var/lib/cni/networks/

# Look for lock contention
lsof /var/lib/cni/networks/mynet/lock

# Verify subnet has available IPs
cat /var/lib/cni/networks/mynet/last_reserved_ip.*

# Manual cleanup if needed (DANGEROUS - only if pods are gone)
rm -rf /var/lib/cni/networks/mynet/*
```

### Problem: Network namespace issues

```bash
# List network namespaces
ip netns list
lsns -t net

# Find namespace for running container
PID=$(crictl inspect <container-id> | jq -r '.info.pid')
nsenter -t $PID -n ip addr

# Check for orphaned namespaces
find /var/run/netns -type f
```

## Performance Tuning

Optimize bridge performance:

```json
{
  "cniVersion": "1.0.0",
  "name": "optimized-net",
  "type": "bridge",
  "bridge": "cni0",
  "isGateway": true,
  "ipMasq": true,
  "mtu": 9000,
  "promiscMode": false,
  "vlan": 0,
  "ipam": {
    "type": "host-local",
    "subnet": "10.244.0.0/16"
  }
}
```

Tune bridge sysctl parameters:

```bash
# Disable netfilter on bridge (improves performance)
echo 0 > /proc/sys/net/bridge/bridge-nf-call-iptables
echo 0 > /proc/sys/net/bridge/bridge-nf-call-ip6tables

# Or set permanently
cat >> /etc/sysctl.conf <<EOF
net.bridge.bridge-nf-call-iptables = 0
net.bridge.bridge-nf-call-ip6tables = 0
EOF
sysctl -p
```

## Monitoring Bridge CNI

Monitor bridge statistics:

```bash
# Bridge interface stats
ip -s link show cni0

# Connected ports
bridge link show

# Forwarding database (MAC addresses)
bridge fdb show dev cni0

# Monitor new connections
bridge monitor fdb

# Check iptables counters
iptables -t nat -L -n -v | grep cni0
```

The bridge CNI plugin provides a simple, understandable foundation for container networking. While not suitable for large production clusters, it's perfect for learning environments and single-node deployments where simplicity matters more than advanced features.
