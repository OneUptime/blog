# How to Configure CNI Plugins for Containers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CNI, Container, Networking, Kubernetes

Description: Learn how CNI plugins work on Ubuntu, how to install and configure them for container networking, and how to create custom network configurations for different use cases.

---

CNI (Container Network Interface) is the standard that Kubernetes, containerd, CRI-O, and other container runtimes use to configure networking for containers. When a container starts, the runtime calls a CNI plugin to set up network interfaces, assign IP addresses, and configure routing. When the container stops, the plugin tears the networking down. Understanding how CNI plugins work and how to configure them is essential for running containers outside of managed Kubernetes or for troubleshooting networking issues.

## How CNI Works

The CNI specification defines a simple interface: a container runtime calls CNI plugins (executable binaries) with a JSON configuration and information about the container's network namespace. The plugins set up networking and return the assigned IP addresses back to the runtime.

CNI plugins come in two categories:
- **Interface plugins** - Create network interfaces (bridge, macvlan, ipvlan, etc.)
- **Chained plugins** - Operate on top of other plugins (IPAM for IP allocation, bandwidth limiting, firewall rules)

## Installing CNI Plugins on Ubuntu

The reference CNI plugins from the CNCF cover most common needs:

```bash
# Create the CNI binary directory
sudo mkdir -p /opt/cni/bin

# Download the CNI plugins tarball
CNI_VERSION="v1.4.0"
curl -sSL https://github.com/containernetworking/plugins/releases/download/${CNI_VERSION}/cni-plugins-linux-amd64-${CNI_VERSION}.tgz \
  | sudo tar -xz -C /opt/cni/bin

# Verify the plugins were extracted
ls /opt/cni/bin/
```

You should see plugins like: `bridge`, `host-local`, `loopback`, `dhcp`, `ipvlan`, `macvlan`, `ptp`, `vlan`, `portmap`, `bandwidth`, `firewall`, `static`, `tuning`, `vrf`

### Create the CNI Configuration Directory

```bash
sudo mkdir -p /etc/cni/net.d
```

## CNI Configuration Format

Each CNI configuration is a JSON file in `/etc/cni/net.d/`. The filename determines the order plugins are applied (lexicographic sort - lower names run first).

A basic configuration has this structure:

```json
{
  "cniVersion": "1.0.0",
  "name": "network-name",
  "type": "plugin-name",
  "ipam": {
    "type": "ipam-plugin-name",
    "subnet": "10.0.0.0/24"
  }
}
```

For chained plugins (multiple plugins in sequence), use `plugins` array:

```json
{
  "cniVersion": "1.0.0",
  "name": "network-name",
  "plugins": [
    {
      "type": "bridge",
      "bridge": "cni0",
      "ipam": {
        "type": "host-local",
        "subnet": "10.0.0.0/24"
      }
    },
    {
      "type": "portmap",
      "capabilities": {"portMappings": true}
    }
  ]
}
```

## Common CNI Plugin Configurations

### bridge Plugin - Container-to-Host Bridge Network

The bridge plugin creates a Linux bridge and connects containers to it. Containers on the same bridge can communicate with each other, and NAT provides internet access:

```bash
sudo nano /etc/cni/net.d/10-bridge.conf
```

```json
{
  "cniVersion": "1.0.0",
  "name": "mybridge",
  "type": "bridge",
  "bridge": "cni0",
  "isGateway": true,
  "ipMasq": true,
  "hairpinMode": true,
  "ipam": {
    "type": "host-local",
    "subnet": "10.88.0.0/16",
    "routes": [
      {"dst": "0.0.0.0/0"}
    ]
  }
}
```

- `isGateway: true` - The bridge gets an IP address and acts as the container's gateway
- `ipMasq: true` - NAT outbound traffic so containers can reach the internet
- `hairpinMode: true` - Allow a container to reach itself via the bridge IP
- `host-local` IPAM - Assign IPs from the local subnet, tracked in files

### macvlan Plugin - Direct MAC Address Containers

macvlan gives each container its own MAC address on the host network. Containers appear as separate devices on the physical LAN:

```bash
sudo nano /etc/cni/net.d/20-macvlan.conf
```

```json
{
  "cniVersion": "1.0.0",
  "name": "mymacvlan",
  "type": "macvlan",
  "master": "eth0",
  "mode": "bridge",
  "ipam": {
    "type": "host-local",
    "subnet": "192.168.1.0/24",
    "rangeStart": "192.168.1.200",
    "rangeEnd": "192.168.1.250",
    "gateway": "192.168.1.1"
  }
}
```

- `master` - The physical interface to attach macvlan to
- `mode: bridge` - Containers on the same macvlan can communicate with each other

Note: With macvlan, the host cannot directly communicate with containers using the host's physical interface. Use macvtap or a separate interface if you need host-to-container communication.

### ipvlan Plugin - Similar to macvlan but Shares MAC Address

ipvlan is similar to macvlan but all containers share the host's MAC address. Useful where switches limit MAC addresses per port:

```json
{
  "cniVersion": "1.0.0",
  "name": "myipvlan",
  "type": "ipvlan",
  "master": "eth0",
  "mode": "l2",
  "ipam": {
    "type": "host-local",
    "subnet": "192.168.1.0/24",
    "rangeStart": "192.168.1.200",
    "rangeEnd": "192.168.1.250",
    "gateway": "192.168.1.1"
  }
}
```

### ptp Plugin - Point-to-Point VETH Pair

The ptp plugin creates a veth pair - one end in the container, one end in the host namespace. No bridge is created:

```json
{
  "cniVersion": "1.0.0",
  "name": "myptp",
  "type": "ptp",
  "ipam": {
    "type": "host-local",
    "subnet": "10.1.0.0/24",
    "gateway": "10.1.0.1",
    "routes": [
      {"dst": "0.0.0.0/0", "gw": "10.1.0.1"}
    ]
  }
}
```

## IPAM Plugin Options

IP Address Management (IPAM) plugins handle IP allocation:

### host-local - File-Based IP Tracking

Stores assigned IPs in files under `/var/lib/cni/networks/`:

```json
"ipam": {
  "type": "host-local",
  "subnet": "10.88.0.0/16",
  "rangeStart": "10.88.0.10",
  "rangeEnd": "10.88.0.200",
  "gateway": "10.88.0.1",
  "routes": [
    {"dst": "0.0.0.0/0"}
  ]
}
```

```bash
# View assigned IPs (useful for debugging)
ls /var/lib/cni/networks/mybridge/
```

### dhcp - DHCP Client

Get IP addresses from a DHCP server on the network:

```json
"ipam": {
  "type": "dhcp"
}
```

The dhcp plugin requires a running daemon:

```bash
# Start the DHCP daemon
sudo /opt/cni/bin/dhcp daemon &
```

### static - Fixed IP Assignment

Assign a specific IP to the container:

```json
"ipam": {
  "type": "static",
  "addresses": [
    {
      "address": "10.10.0.100/24",
      "gateway": "10.10.0.1"
    }
  ],
  "routes": [
    {"dst": "0.0.0.0/0", "gw": "10.10.0.1"}
  ]
}
```

## Adding Port Forwarding

Chain the portmap plugin to add port forwarding to any network:

```bash
sudo nano /etc/cni/net.d/10-bridge.conf
```

```json
{
  "cniVersion": "1.0.0",
  "name": "mybridge",
  "plugins": [
    {
      "type": "bridge",
      "bridge": "cni0",
      "isGateway": true,
      "ipMasq": true,
      "ipam": {
        "type": "host-local",
        "subnet": "10.88.0.0/16",
        "routes": [{"dst": "0.0.0.0/0"}]
      }
    },
    {
      "type": "portmap",
      "capabilities": {"portMappings": true}
    },
    {
      "type": "bandwidth",
      "capabilities": {"bandwidth": true}
    }
  ]
}
```

## Testing CNI Configuration with cnitool

`cnitool` lets you test CNI configurations without running a full container runtime:

```bash
# Install cnitool
go install github.com/containernetworking/cni/cnitool@latest
# Or download from releases

# Create a network namespace for testing
sudo ip netns add testns

# Add a container to the network using your CNI config
sudo CNI_PATH=/opt/cni/bin \
  NETCONFPATH=/etc/cni/net.d \
  cnitool add mybridge /var/run/netns/testns

# List network interfaces in the namespace
sudo ip netns exec testns ip addr

# Test connectivity
sudo ip netns exec testns ping 8.8.8.8

# Remove the network from the namespace
sudo CNI_PATH=/opt/cni/bin \
  NETCONFPATH=/etc/cni/net.d \
  cnitool del mybridge /var/run/netns/testns

# Clean up
sudo ip netns del testns
```

## Using CNI with containerd

containerd uses CNI for container networking. Check your containerd CNI config:

```bash
# View containerd CNI configuration
cat /etc/containerd/config.toml | grep -A 10 "cni"
```

The default config typically looks for plugins in `/opt/cni/bin` and configurations in `/etc/cni/net.d`, which matches the standard locations.

## Debugging CNI Issues

```bash
# Enable debug logging in your CNI config
# Add to the JSON config:
# "debug": true

# Check what network namespaces exist
ip netns list

# Check the bridge and veth interfaces
ip link show type bridge
ip link show type veth

# Look at current IP allocations
cat /var/lib/cni/networks/mybridge/*

# Check kernel IP forwarding (required for container networking)
cat /proc/sys/net/ipv4/ip_forward
# Should be 1; if 0, enable it:
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/99-ip-forward.conf
```

CNI's plugin-based design means you can combine simple building blocks - a bridge plugin for network topology, an IPAM plugin for address management, portmap for port forwarding - to get exactly the networking model you need for your container workloads.
