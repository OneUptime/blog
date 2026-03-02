# How to Install and Configure Open vSwitch on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Open vSwitch, Virtualization, SDN

Description: Install and configure Open vSwitch (OVS) on Ubuntu for software-defined networking, including bridge creation, port management, and basic flow control.

---

Open vSwitch (OVS) is a production-grade, multilayer virtual switch that runs in the Linux kernel and userspace. It supports standard management protocols like NetFlow, sFlow, SPAN, RSPAN, CLI, LACP, and 802.1ag. Originally developed for use with hypervisors, it has become a cornerstone component in OpenStack, Kubernetes networking (via OVN), and SDN (Software Defined Networking) environments. This guide covers the basics of getting OVS running on Ubuntu and performing common configuration tasks.

## Installing Open vSwitch

```bash
# Update and install OVS packages
sudo apt update
sudo apt install openvswitch-switch openvswitch-common

# For DPDK (Data Plane Development Kit) acceleration (optional)
sudo apt install openvswitch-switch-dpdk

# Verify installation
sudo systemctl status openvswitch-switch

# Check OVS version
ovs-vsctl --version
```

## Core OVS Concepts

- **Bridge** - the virtual switch itself (equivalent to a physical switch)
- **Port** - a connection point on the bridge (can be a physical NIC, tunnel, or internal port)
- **Interface** - the network interface attached to a port
- **Controller** - an OpenFlow controller that programs the switch's flow table
- **Flow** - a matching rule and action set in the switch's forwarding table

## Creating Your First OVS Bridge

```bash
# Create a new OVS bridge
sudo ovs-vsctl add-br br0

# Verify the bridge was created
sudo ovs-vsctl show

# List all bridges
sudo ovs-vsctl list-br

# Check that the bridge interface appears in the OS
ip link show br0
```

## Adding Ports to the Bridge

```bash
# Add a physical network interface to the bridge
sudo ovs-vsctl add-port br0 eth1

# Verify the port was added
sudo ovs-vsctl list-ports br0

# Show detailed bridge information
sudo ovs-vsctl show

# The physical interface should now be part of the bridge
# Traffic from eth1 will be forwarded by OVS
```

## Assigning an IP Address to the Bridge

When using OVS as the main switch, assign the IP address to the bridge, not the physical interface.

```bash
# Remove IP from physical interface (it is now just a bridge port)
sudo ip addr flush dev eth1

# Assign IP to the bridge
sudo ip addr add 192.168.1.10/24 dev br0
sudo ip link set br0 up

# Set the default route via the bridge
sudo ip route add default via 192.168.1.1 dev br0

# Make this persistent with Netplan (Ubuntu 18.04+)
sudo nano /etc/netplan/01-ovs.yaml
```

```yaml
# /etc/netplan/01-ovs.yaml
network:
  version: 2
  renderer: openvswitch
  ethernets:
    eth1:
      dhcp4: false
  bridges:
    br0:
      interfaces: [eth1]
      dhcp4: true
      openvswitch: {}
```

```bash
sudo netplan apply
```

## Configuring OVS with Netplan

Netplan has native OVS support in Ubuntu 20.04 and later.

```yaml
# /etc/netplan/01-ovs.yaml
network:
  version: 2
  renderer: openvswitch
  ethernets:
    eth0:
      dhcp4: false
    eth1:
      dhcp4: false
  bridges:
    br-uplink:
      interfaces: [eth0]
      dhcp4: true
      openvswitch:
        fail-mode: standalone
        protocols: [OpenFlow13]
    br-internal:
      interfaces: [eth1]
      addresses: [10.0.0.1/24]
      openvswitch: {}
```

## Creating Internal Ports for Virtual Machines

Internal ports are virtual interfaces on the bridge, useful for connecting VMs or containers.

```bash
# Create an internal port (appears as a network interface)
sudo ovs-vsctl add-port br0 veth-vm1 -- set interface veth-vm1 type=internal

# Bring the interface up and assign an address
sudo ip link set veth-vm1 up
sudo ip addr add 10.0.0.2/24 dev veth-vm1

# Move a process into a namespace and connect to OVS
# (used in container networking scenarios)
sudo ip netns add vm1-ns
sudo ip link set veth-vm1 netns vm1-ns
sudo ip netns exec vm1-ns ip addr add 10.0.0.2/24 dev veth-vm1
sudo ip netns exec vm1-ns ip link set veth-vm1 up
```

## Configuring Basic OVS Settings

```bash
# Set a human-readable name for the switch
sudo ovs-vsctl set bridge br0 other-config:hwaddr=02:00:00:00:00:01

# Configure the bridge to use standalone mode (acts as a normal L2 switch)
sudo ovs-vsctl set-fail-mode br0 standalone

# Configure secure mode (drops traffic if no controller is connected)
sudo ovs-vsctl set-fail-mode br0 secure

# Set supported OpenFlow versions
sudo ovs-vsctl set bridge br0 protocols=OpenFlow13,OpenFlow14

# View all bridge configuration
sudo ovs-vsctl list bridge br0
```

## Viewing OVS Configuration

```bash
# Show complete OVS configuration
sudo ovs-vsctl show

# List all tables in the OVS database
sudo ovs-vsctl list open-vswitch

# List all bridges
sudo ovs-vsctl list bridge

# List all ports
sudo ovs-vsctl list port

# List all interfaces
sudo ovs-vsctl list interface

# Show MAC table (what OVS has learned)
sudo ovs-appctl fdb/show br0
```

## Monitoring with ovs-ofctl

`ovs-ofctl` manages the OpenFlow aspects of OVS - the flow tables that determine forwarding decisions.

```bash
# Show all flows in the bridge
sudo ovs-ofctl dump-flows br0

# Show port statistics
sudo ovs-ofctl dump-ports br0

# Show port statistics in detail
sudo ovs-ofctl dump-ports-desc br0
```

## Deleting Bridges and Ports

```bash
# Remove a port from a bridge
sudo ovs-vsctl del-port br0 eth1

# Remove an entire bridge
sudo ovs-vsctl del-br br0

# Verify removal
sudo ovs-vsctl show
```

## Persisting OVS Configuration

OVS configuration is stored in `/etc/openvswitch/conf.db` and persists across reboots. However, IP addresses and routes configured with `ip` commands do not persist - use Netplan or `/etc/network/interfaces` for those.

```bash
# View the OVS configuration database
sudo ovs-vsctl list open-vswitch

# The database file is automatically managed by OVS
ls -la /etc/openvswitch/conf.db

# Back up OVS configuration
sudo ovsdb-client backup > /tmp/ovs-backup.db

# Restore from backup (careful - replaces all current config)
sudo ovsdb-client restore < /tmp/ovs-backup.db
```

## Troubleshooting

```bash
# Check OVS service logs
sudo journalctl -u openvswitch-switch -f

# Check for OVS kernel module
lsmod | grep openvswitch

# Load OVS kernel module if missing
sudo modprobe openvswitch

# Check OVS datapath
sudo ovs-dpctl show

# List all OVS log files
ls /var/log/openvswitch/

# View the main OVS log
sudo tail -f /var/log/openvswitch/ovs-vswitchd.log
```

Open vSwitch is a powerful tool with a learning curve, but even simple configurations like a bridged setup with a couple of ports provide significant flexibility over standard Linux bridging. The real power comes with VLAN support, bonding, tunnels (VXLAN, GRE), and OpenFlow-based flow control, which are covered in separate guides.
