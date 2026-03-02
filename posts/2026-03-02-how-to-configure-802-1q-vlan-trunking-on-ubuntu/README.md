# How to Configure 802.1Q VLAN Trunking on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VLAN, Networking, 802.1Q, Netplan

Description: Configure 802.1Q VLAN trunking on Ubuntu servers using the kernel VLAN module, with Netplan and legacy ifupdown examples for trunk and access port setups.

---

802.1Q VLAN tagging lets a single physical network interface carry traffic for multiple VLANs simultaneously - this is called a trunk. On Ubuntu servers, VLAN sub-interfaces appear as `eth0.10`, `eth0.20`, and so on, each operating as a fully independent network interface with its own IP address and routing.

This is useful when a server connects to a switch configured for trunking, or when you need network isolation between different services running on the same host.

## Checking Kernel Module Support

```bash
# Verify the 8021q kernel module is available
modinfo 8021q

# Load it if it isn't already loaded
sudo modprobe 8021q

# Confirm it's loaded
lsmod | grep 8021q

# Make it load at boot
echo "8021q" | sudo tee -a /etc/modules
```

## Quick Setup with ip Commands

Before configuring persistent VLAN interfaces, it helps to understand the raw kernel operations:

```bash
# Create a VLAN 10 sub-interface on eth0
sudo ip link add link eth0 name eth0.10 type vlan id 10

# Create a VLAN 20 sub-interface on eth0
sudo ip link add link eth0 name eth0.20 type vlan id 20

# Bring both up
sudo ip link set eth0 up
sudo ip link set eth0.10 up
sudo ip link set eth0.20 up

# Assign IP addresses
sudo ip addr add 192.168.10.1/24 dev eth0.10
sudo ip addr add 192.168.20.1/24 dev eth0.20

# Verify the sub-interfaces
ip -d link show eth0.10
ip addr show eth0.10
```

These changes are not persistent. The sections below cover persistent configuration.

## Persistent Configuration with Netplan

Ubuntu 20.04 and later use Netplan by default. Netplan supports VLAN interfaces natively.

### Trunk Interface with Multiple VLANs

```yaml
# /etc/netplan/01-vlans.yaml
network:
  version: 2
  renderer: networkd

  ethernets:
    # The physical trunk interface
    # Typically has no IP address of its own on a pure trunk
    eth0:
      dhcp4: false
      dhcp6: false

  vlans:
    # VLAN 10 sub-interface: management network
    eth0.10:
      id: 10
      link: eth0
      addresses:
        - 192.168.10.10/24
      routes:
        - to: default
          via: 192.168.10.1
      nameservers:
        addresses:
          - 8.8.8.8

    # VLAN 20 sub-interface: application network
    eth0.20:
      id: 20
      link: eth0
      addresses:
        - 192.168.20.10/24

    # VLAN 30 sub-interface: storage network
    eth0.30:
      id: 30
      link: eth0
      addresses:
        - 10.10.30.10/24
```

```bash
# Apply the configuration
sudo netplan apply

# Verify the VLAN interfaces are up
ip addr show eth0.10
ip addr show eth0.20
ip addr show eth0.30
```

### DHCP on a VLAN Interface

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false

  vlans:
    eth0.100:
      id: 100
      link: eth0
      dhcp4: true
      dhcp6: false
```

## Legacy Configuration with /etc/network/interfaces

On older Ubuntu systems or systems using ifupdown:

```bash
# Install the vlan package for the vconfig utility (older systems)
sudo apt install -y vlan

# /etc/network/interfaces
sudo tee /etc/network/interfaces.d/vlans > /dev/null <<'EOF'
# Physical trunk interface - up but no IP
auto eth0
iface eth0 inet manual
    up ip link set $IFACE up
    down ip link set $IFACE down

# VLAN 10
auto eth0.10
iface eth0.10 inet static
    address 192.168.10.10
    netmask 255.255.255.0
    gateway 192.168.10.1
    vlan-raw-device eth0

# VLAN 20
auto eth0.20
iface eth0.20 inet static
    address 192.168.20.10
    netmask 255.255.255.0
    vlan-raw-device eth0
EOF

# Bring the interfaces up
sudo ifup eth0.10
sudo ifup eth0.20
```

## VLAN Filtering with Linux Bridges

When you combine VLAN trunking with a Linux bridge (for KVM/QEMU VMs or containers), VLAN filtering on the bridge is more efficient than separate VLAN sub-interfaces:

```bash
# Create a bridge with VLAN filtering enabled
sudo ip link add name br0 type bridge
sudo ip link set br0 type bridge vlan_filtering 1

# Add the physical interface as a trunk port
sudo ip link set eth0 master br0

# Allow VLANs 10 and 20 on the trunk port
sudo bridge vlan add dev eth0 vid 10
sudo bridge vlan add dev eth0 vid 20

# Add a VM's tap interface as an access port on VLAN 10
# (The VM sees untagged frames; the bridge handles tagging)
sudo bridge vlan add dev tap0 vid 10 pvid untagged

# Bring everything up
sudo ip link set eth0 up
sudo ip link set br0 up
sudo ip link set tap0 up

# View VLAN membership
bridge vlan show
```

## VLAN Configuration for KVM Hosts with Netplan

When Ubuntu runs as a KVM hypervisor with VLAN-separated VM networks:

```yaml
# /etc/netplan/01-kvm-vlans.yaml
network:
  version: 2
  renderer: networkd

  ethernets:
    # Physical NIC - trunk port from the switch
    eth0:
      dhcp4: false

  vlans:
    # Host management on VLAN 10
    eth0.10:
      id: 10
      link: eth0
      addresses:
        - 192.168.10.5/24
      routes:
        - to: default
          via: 192.168.10.1

    # VLAN 20 sub-interface for a VM bridge
    eth0.20:
      id: 20
      link: eth0
      dhcp4: false

  bridges:
    # Bridge for VMs on VLAN 20
    br20:
      interfaces:
        - eth0.20
      dhcp4: false
      addresses:
        - 192.168.20.5/24
```

## Troubleshooting VLAN Issues

```bash
# Verify VLAN sub-interfaces exist
ip -d link show type vlan

# Check that tagged frames are arriving on the physical interface
# Look for packets with the right VLAN ID
sudo tcpdump -i eth0 -e -n 'vlan 10'

# If the VLAN interface is up but you're not getting traffic:
# 1. Verify the switch port is configured as a trunk
# 2. Verify the VLAN is allowed on the trunk
# 3. Check that the VLAN ID matches on both ends

# Check VLAN sub-interface details
ip -d link show eth0.10

# View bridge VLAN table if using a bridge
bridge vlan show

# Check for dropped packets on the interface
ip -s link show eth0.10

# Verify routing is correct if VMs or containers can't communicate
ip route show
```

## VLAN Naming Conventions

By convention, VLAN sub-interfaces are named `<parent>.<vlan-id>`, but you can use any name:

```bash
# Create with a custom name instead of eth0.10
sudo ip link add link eth0 name mgmt type vlan id 10

# In Netplan, name the vlan block whatever you want
# The 'id' field is what matters, not the block name
```

Keeping the standard `eth0.10` naming makes it immediately obvious which VLAN an interface belongs to, which simplifies troubleshooting at 2am. Custom names only make sense when you have a specific organizational reason for them.
