# How to Create Virtual Switches with OVS on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Open vSwitch, Virtualization, SDN

Description: Build and manage virtual switches with Open vSwitch on Ubuntu, covering bridge creation, patch ports, VXLAN tunnels, and connecting VMs and containers.

---

Open vSwitch (OVS) virtual switches are more capable than standard Linux bridges. They support VLAN tagging, tunneling, OpenFlow-based flow control, and advanced features like port mirroring and QoS. This guide focuses on practical virtual switch configurations - creating switches, connecting them together, building tunnels between hosts, and integrating with KVM virtual machines.

## Prerequisites

```bash
# Ensure OVS is installed and running
sudo apt install openvswitch-switch
sudo systemctl status openvswitch-switch

# Verify OVS kernel module is loaded
lsmod | grep openvswitch
```

## Creating Multiple Virtual Switches

A common scenario is having multiple virtual switches, each serving different network segments.

```bash
# Create bridges for different purposes
sudo ovs-vsctl add-br br-public    # Bridge connected to the external network
sudo ovs-vsctl add-br br-private   # Bridge for internal VM traffic
sudo ovs-vsctl add-br br-storage   # Bridge for storage traffic

# Verify all bridges
sudo ovs-vsctl list-br

# Show the full configuration
sudo ovs-vsctl show
```

## Connecting Physical Interfaces to Switches

```bash
# Connect a physical NIC to the public bridge
sudo ovs-vsctl add-port br-public eth0

# Bring the bridge up with the external IP address
sudo ip addr flush dev eth0        # Remove IP from physical interface
sudo ip addr add 203.0.113.10/24 dev br-public
sudo ip link set br-public up
sudo ip route add default via 203.0.113.1

# Connect a second NIC to the internal bridge
sudo ovs-vsctl add-port br-private eth1
sudo ip addr flush dev eth1
sudo ip addr add 10.0.0.1/24 dev br-private
sudo ip link set br-private up
```

## Connecting Virtual Machines to OVS

When using KVM, you can connect VM tap interfaces directly to OVS bridges.

```bash
# Create a tap interface for a VM
sudo ip tuntap add mode tap vnet0
sudo ip link set vnet0 up

# Add the tap interface to an OVS bridge
sudo ovs-vsctl add-port br-private vnet0

# The VM should be configured to use vnet0 as its network interface
# In libvirt XML, use type='ethernet' with target dev='vnet0'
```

For libvirt-managed VMs, configure the network in the VM XML definition.

```xml
<!-- In VM XML definition -->
<interface type='bridge'>
  <source bridge='br-private'/>
  <virtualport type='openvswitch'/>
  <target dev='vnet0'/>
  <model type='virtio'/>
</interface>
```

## Using Patch Ports to Connect Two Bridges

Patch ports create a direct virtual connection between two OVS bridges on the same host.

```bash
# Create patch ports connecting br-public and br-private
sudo ovs-vsctl add-port br-public patch-to-private \
  -- set interface patch-to-private type=patch options:peer=patch-to-public

sudo ovs-vsctl add-port br-private patch-to-public \
  -- set interface patch-to-public type=patch options:peer=patch-to-private

# Verify the patch port configuration
sudo ovs-vsctl show
# You should see patch-to-private and patch-to-public linked
```

Patch ports are useful for routing between network segments on the same host without needing a physical or virtual router interface.

## Creating VXLAN Tunnels Between Hosts

VXLAN tunnels extend OVS bridges across physical hosts, creating an overlay network.

```bash
# Host 1 (IP: 192.168.1.10) - Create tunnel to Host 2
sudo ovs-vsctl add-port br-private vxlan-to-host2 \
  -- set interface vxlan-to-host2 \
  type=vxlan \
  options:remote_ip=192.168.1.11 \
  options:key=1000 \
  options:dst_port=4789

# Host 2 (IP: 192.168.1.11) - Create tunnel back to Host 1
sudo ovs-vsctl add-port br-private vxlan-to-host1 \
  -- set interface vxlan-to-host1 \
  type=vxlan \
  options:remote_ip=192.168.1.10 \
  options:key=1000 \
  options:dst_port=4789

# Allow VXLAN through the firewall
sudo ufw allow 4789/udp

# Verify tunnel is up
sudo ovs-vsctl show
ip link show vxlan-to-host2
```

With this configuration, VMs on both hosts are on the same L2 segment, even though they are on different physical machines.

## Creating GRE Tunnels

GRE is another tunnel type supported by OVS, useful for connecting to older systems or when VXLAN is not available.

```bash
# Add a GRE tunnel
sudo ovs-vsctl add-port br-private gre-to-host2 \
  -- set interface gre-to-host2 \
  type=gre \
  options:remote_ip=192.168.1.11 \
  options:key=100
```

## Port Mirroring for Traffic Inspection

Port mirroring copies traffic from one or more ports to a monitoring port, useful for IDS, packet capture, or troubleshooting.

```bash
# Create a mirror: copy all traffic from vnet0 to vnet-monitor
sudo ovs-vsctl -- set bridge br-private mirrors=@m \
  -- --id=@vnet0 get port vnet0 \
  -- --id=@monitor get port vnet-monitor \
  -- --id=@m create mirror name=monitor select-dst-port=@vnet0 select-src-port=@vnet0 output-port=@monitor

# View the mirror configuration
sudo ovs-vsctl list mirror

# Run tcpdump on the monitor port
sudo tcpdump -i vnet-monitor -n
```

## Adding VLAN Tags to Ports

```bash
# Add a port as an access port on VLAN 100
# (traffic entering this port is tagged with VLAN 100)
sudo ovs-vsctl add-port br-private vnet1 tag=100

# Add a port as a trunk port (carries multiple VLANs)
sudo ovs-vsctl add-port br-private vnet2 trunks=100,200,300

# View VLAN configuration on a port
sudo ovs-vsctl list port vnet1
```

## Configuring Port Quality of Service (QoS)

```bash
# Limit a VM's bandwidth to 100Mbps
sudo ovs-vsctl set interface vnet0 ingress_policing_rate=100000
sudo ovs-vsctl set interface vnet0 ingress_policing_burst=10000

# Remove QoS limits
sudo ovs-vsctl set interface vnet0 ingress_policing_rate=0
sudo ovs-vsctl set interface vnet0 ingress_policing_burst=0
```

## Viewing Bridge and Port Statistics

```bash
# Show all flows currently active on a bridge
sudo ovs-ofctl dump-flows br-private

# Show port statistics (bytes and packets)
sudo ovs-ofctl dump-ports br-private

# Show port descriptions
sudo ovs-ofctl dump-ports-desc br-private

# Show the current MAC learning table
sudo ovs-appctl fdb/show br-private
```

## Deleting Tunnels and Ports

```bash
# Remove a tunnel
sudo ovs-vsctl del-port br-private vxlan-to-host2

# Remove all ports from a bridge and delete it
sudo ovs-vsctl del-br br-private

# Remove a specific port while keeping the bridge
sudo ovs-vsctl del-port br-private vnet0
```

## Debugging Connectivity

```bash
# Test reachability between namespaces connected to OVS
# Create two namespaces
sudo ip netns add ns1
sudo ip netns add ns2

# Create internal OVS ports
sudo ovs-vsctl add-port br-private ns1-port -- set interface ns1-port type=internal
sudo ovs-vsctl add-port br-private ns2-port -- set interface ns2-port type=internal

# Move ports to namespaces
sudo ip link set ns1-port netns ns1
sudo ip link set ns2-port netns ns2

# Assign addresses
sudo ip netns exec ns1 ip addr add 10.0.0.1/24 dev ns1-port
sudo ip netns exec ns1 ip link set ns1-port up
sudo ip netns exec ns2 ip addr add 10.0.0.2/24 dev ns2-port
sudo ip netns exec ns2 ip link set ns2-port up

# Test connectivity
sudo ip netns exec ns1 ping 10.0.0.2

# Check why traffic may not be flowing
sudo ovs-appctl ofproto/trace br-private in_port=ns1-port,dl_dst=ff:ff:ff:ff:ff:ff
```

OVS virtual switches handle production-level VM networking workloads at high performance. The combination of VXLAN tunneling and OpenFlow-based flow control makes it a solid foundation for any software-defined networking deployment on Ubuntu.
