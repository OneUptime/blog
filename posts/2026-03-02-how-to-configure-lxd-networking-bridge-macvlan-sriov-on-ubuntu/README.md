# How to Configure LXD Networking (Bridge, Macvlan, SR-IOV) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LXD, Networking, Container, Virtualization

Description: A detailed guide to configuring LXD network modes including bridge networking, macvlan, and SR-IOV for containers and VMs on Ubuntu.

---

LXD's networking layer is one of its strongest features, supporting several modes that let you choose the right tradeoff between isolation, performance, and network visibility. This guide covers the three most commonly used network types: bridge, macvlan, and SR-IOV.

## LXD Network Types Overview

LXD supports these network types:
- **bridge** - NAT-based or pure bridge, most common, easiest to set up
- **macvlan** - container/VM gets a MAC address on the host's physical network
- **sriov** - hardware-level NIC virtualization for near line-rate performance
- **ovn** - open virtual network overlay (for multi-host scenarios)
- **physical** - direct pass-through of a physical NIC

## Bridge Networking

The default mode. LXD creates a software bridge (`lxdbr0`) and attaches container vNICs to it. The bridge handles DHCP via dnsmasq and NAT for outbound connectivity.

### Viewing the Default Bridge

```bash
# List LXD networks
lxc network list

# Inspect the default bridge
lxc network show lxdbr0
```

### Creating a Custom Bridge

```bash
# Create a bridge with a specific subnet
lxc network create custombr0 \
  ipv4.address=10.100.0.1/24 \
  ipv4.nat=true \
  ipv4.dhcp=true \
  ipv4.dhcp.ranges=10.100.0.100-10.100.0.200 \
  ipv6.address=none \
  dns.domain=containers.local

# Verify
lxc network show custombr0
```

### Attaching a Container to a Specific Bridge

```bash
# Create a profile that uses the custom bridge
lxc profile create custnet
lxc profile device add custnet eth0 nic \
  nictype=bridged \
  parent=custombr0

# Launch a container using this profile
lxc launch ubuntu:24.04 mycontainer --profile default --profile custnet

# Or add the NIC directly to an existing container
lxc config device add mycontainer eth0 nic \
  nictype=bridged \
  parent=custombr0
```

### Static IP Assignment

```bash
# Assign a static IP via DHCP reservation (uses MAC address)
lxc config device set mycontainer eth0 ipv4.address=10.100.0.50
lxc restart mycontainer

# Verify inside container
lxc exec mycontainer -- ip addr show eth0
```

### Bridging to a Physical Interface (No NAT)

For containers to appear directly on the physical network:

```bash
# Create a bridge backed by a physical NIC
# Note: this takes the NIC off the host's routing - you need another NIC for host access
lxc network create physicalbr \
  bridge.driver=native \
  parent=enp3s0 \
  ipv4.address=none \
  ipv6.address=none

# Attach container
lxc config device add mycontainer eth0 nic \
  nictype=bridged \
  parent=physicalbr
```

## Macvlan Networking

Macvlan gives each container or VM its own MAC address on the physical network, so it appears as a physical device on the LAN. This bypasses NAT entirely.

### When to Use Macvlan

Use macvlan when you need:
- Containers to have routable IPs on your LAN
- No NAT (better for server-style workloads)
- Direct access to the container's IP from other machines on the LAN

The limitation: the host cannot communicate with macvlan interfaces attached to it directly (a kernel restriction). Containers can reach the outside, but the host cannot reach them by their macvlan IP.

### Configuring Macvlan

```bash
# Create a macvlan network attached to enp3s0
lxc network create macvlan0 \
  --type=macvlan \
  parent=enp3s0

# View the network
lxc network show macvlan0
```

### Using Macvlan with a Container

```bash
# Add macvlan NIC to a container
lxc config device add mycontainer eth0 nic \
  nictype=macvlan \
  parent=enp3s0

# Start the container - it will get an IP from your LAN DHCP
lxc start mycontainer
lxc exec mycontainer -- ip addr show eth0

# The IP is a real LAN IP, reachable from other hosts on the network
```

### Macvlan with Static IP

```bash
# Assign a static IP to the macvlan interface inside the container
lxc exec mycontainer -- bash -c "
  ip addr flush dev eth0
  ip addr add 192.168.1.50/24 dev eth0
  ip route add default via 192.168.1.1
  echo 'nameserver 8.8.8.8' > /etc/resolv.conf
"

# For persistence, use netplan inside the container
lxc exec mycontainer -- bash -c "
cat > /etc/netplan/50-cloud-init.yaml << 'NETPLAN'
network:
  ethernets:
    eth0:
      addresses:
        - 192.168.1.50/24
      routes:
        - to: 0.0.0.0/0
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
  version: 2
NETPLAN
netplan apply
"
```

## SR-IOV Networking

SR-IOV (Single Root I/O Virtualization) allows a single physical NIC to present multiple virtual functions (VFs) that are passed directly to containers or VMs. This delivers near line-rate performance because the VF bypasses the host network stack entirely.

### SR-IOV Requirements

1. A NIC that supports SR-IOV (Intel X520, X710, Mellanox ConnectX-series, etc.)
2. IOMMU enabled in BIOS/UEFI
3. IOMMU enabled in kernel (`intel_iommu=on` or `amd_iommu=on` in GRUB)

```bash
# Check if IOMMU is enabled
dmesg | grep -i iommu

# Check if your NIC supports SR-IOV
ethtool -i enp5s0f0 | grep driver
# Common SR-IOV capable drivers: i40e, ixgbe, mlx5_core

# Check maximum VFs supported
cat /sys/class/net/enp5s0f0/device/sriov_totalvfs
```

### Enabling SR-IOV VFs

```bash
# Create VFs (example: create 4 VFs on enp5s0f0)
echo 4 | sudo tee /sys/class/net/enp5s0f0/device/sriov_numvfs

# Verify VFs were created
ip link show enp5s0f0
# You'll see VF entries in the output

# Make VF count persistent
cat > /etc/udev/rules.d/99-sriov.rules <<'EOF'
ACTION=="add", KERNEL=="enp5s0f0", SUBSYSTEM=="net", RUN+="/bin/sh -c 'echo 4 > /sys/class/net/enp5s0f0/device/sriov_numvfs'"
EOF
```

### Using SR-IOV with LXD

```bash
# Create an SR-IOV network in LXD
lxc network create sriov0 \
  --type=sriov \
  parent=enp5s0f0

# Attach a VF to a container
lxc config device add mycontainer eth0 nic \
  nictype=sriov \
  parent=enp5s0f0

# LXD automatically assigns an available VF to the container
lxc start mycontainer
lxc exec mycontainer -- ip link show
```

### SR-IOV Performance Verification

```bash
# Inside the container, check the interface type
lxc exec mycontainer -- ethtool -i eth0
# driver: virtchnl (VF driver) indicates SR-IOV is working

# Test network throughput (requires iperf3 on both ends)
# On another host:
iperf3 -s

# Inside the container:
lxc exec mycontainer -- iperf3 -c <other-host-ip> -t 30
```

## Configuring Multiple NICs

Containers can have multiple network interfaces for different traffic types:

```bash
# Add management NIC (bridge, NAT)
lxc config device add mycontainer mgmt nic \
  nictype=bridged \
  parent=lxdbr0

# Add data NIC (macvlan, direct LAN access)
lxc config device add mycontainer data nic \
  nictype=macvlan \
  parent=enp3s0

# Verify inside container
lxc exec mycontainer -- ip addr
```

## Firewall and Network Policies

LXD uses `iptables` (or `nftables`) rules to implement network policies:

```bash
# Check LXD-managed iptables rules
sudo iptables -L -n -v | grep -A5 lxd

# Disable LXD-managed firewall rules (if you manage them yourself)
lxc network set lxdbr0 ipv4.firewall=false
lxc network set lxdbr0 ipv6.firewall=false
```

## DNS Configuration

LXD bridge networks include dnsmasq for DNS:

```bash
# Set the DNS domain for the bridge
lxc network set lxdbr0 dns.domain=mycontainers.local

# Enable DNS lookups of container names
lxc network set lxdbr0 dns.mode=managed

# Containers are then reachable by name:
# mycontainer.mycontainers.local
ping mycontainer.mycontainers.local
```

Understanding LXD's networking options lets you design the right connectivity model for your workloads. Use bridge+NAT for isolated dev environments, macvlan for server workloads that need LAN-reachable IPs, and SR-IOV for high-throughput production deployments.
