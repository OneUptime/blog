# How to Set Up Open vSwitch Tunnels on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Open vSwitch, Virtualization, SDN

Description: A hands-on guide to creating VXLAN and GRE overlay tunnels with Open vSwitch on Ubuntu for connecting virtualized networks across physical hosts.

---

Open vSwitch (OVS) is a production-quality virtual switch designed for virtualized server environments. It supports standard management interfaces, and provides overlay networking capabilities like VXLAN and GRE tunnels that let you extend layer-2 networks across layer-3 boundaries. This is the same technology that OpenStack Neutron, oVirt, and many SDN controllers use under the hood.

This guide sets up OVS on Ubuntu, creates a bridge, and configures VXLAN tunnels between two hosts.

## Architecture

We use two Ubuntu hosts:
- **Host A**: `192.168.1.10`
- **Host B**: `192.168.1.20`

We create a VXLAN tunnel between them so that VMs or containers on each host can communicate as if they are on the same layer-2 network, even though they are on different physical machines.

```
Host A                              Host B
+------------------+                +------------------+
|  VM1             |                |  VM2             |
|  10.0.0.1/24     |                |  10.0.0.2/24     |
|       |          |                |       |          |
|  [br-int]        |                |  [br-int]        |
|       |          |                |       |          |
|  [vxlan0]--------|----------------|--[vxlan0]        |
|   VNI: 100       |   UDP 4789     |   VNI: 100       |
+-----|------------+                +-----|------------+
      |                                  |
   192.168.1.10                      192.168.1.20
   (physical NIC)                   (physical NIC)
```

## Installing Open vSwitch

On both hosts:

```bash
sudo apt update
sudo apt install openvswitch-switch openvswitch-common -y

# Verify OVS is running
sudo systemctl status openvswitch-switch

# Check OVS version
ovs-vsctl --version
```

## Creating an OVS Bridge

On both hosts, create the internal bridge:

```bash
# Create a bridge named br-int (internal bridge)
sudo ovs-vsctl add-br br-int

# Verify the bridge was created
sudo ovs-vsctl show

# Bring the bridge up
sudo ip link set br-int up

# Assign an IP to the bridge (for testing connectivity)
sudo ip addr add 10.0.0.254/24 dev br-int  # on Host A
# sudo ip addr add 10.0.0.253/24 dev br-int  # on Host B
```

## Configuring VXLAN Tunnels

VXLAN (Virtual Extensible LAN) encapsulates layer-2 frames in UDP packets. The VNI (VXLAN Network Identifier) isolates different overlay networks.

**On Host A (192.168.1.10):**

```bash
# Add a VXLAN port pointing to Host B
sudo ovs-vsctl add-port br-int vxlan0 -- \
  set interface vxlan0 type=vxlan \
  options:remote_ip=192.168.1.20 \
  options:key=100 \
  options:dst_port=4789

# Verify the port was added
sudo ovs-vsctl show
```

**On Host B (192.168.1.20):**

```bash
# Add a VXLAN port pointing back to Host A
sudo ovs-vsctl add-port br-int vxlan0 -- \
  set interface vxlan0 type=vxlan \
  options:remote_ip=192.168.1.10 \
  options:key=100 \
  options:dst_port=4789
```

## Testing the Tunnel

From Host A, ping the bridge IP on Host B through the tunnel:

```bash
ping -c 4 10.0.0.253
```

Capture VXLAN traffic on the physical interface to verify encapsulation:

```bash
# On either host, capture UDP 4789 traffic
sudo tcpdump -i eth0 -n udp port 4789 -v
```

You should see packets with outer UDP headers (port 4789) containing the inner Ethernet frames.

## Firewall Configuration

Allow VXLAN traffic between hosts:

```bash
# On both hosts
sudo ufw allow from 192.168.1.0/24 to any port 4789 proto udp
```

## Connecting Virtual Machines

To connect a VM or container to the overlay network, add its virtual NIC to the OVS bridge.

For a QEMU/KVM VM, specify the OVS bridge in the network configuration:

```xml
<!-- In the VM's XML definition -->
<interface type='bridge'>
  <source bridge='br-int'/>
  <virtualport type='openvswitch'/>
</interface>
```

For a network namespace (simulating a VM for testing):

```bash
# Create a namespace and a veth pair
sudo ip netns add ns1
sudo ip link add veth0 type veth peer name veth1

# Move one end into the namespace
sudo ip link set veth1 netns ns1

# Add the veth to OVS bridge
sudo ovs-vsctl add-port br-int veth0
sudo ip link set veth0 up

# Configure the namespace interface
sudo ip netns exec ns1 ip link set veth1 up
sudo ip netns exec ns1 ip addr add 10.0.0.1/24 dev veth1

# Test connectivity through the tunnel from the namespace
sudo ip netns exec ns1 ping -c 4 10.0.0.2
```

## Setting Up GRE Tunnels with OVS

GRE is an alternative to VXLAN. It uses IP protocol 47 instead of UDP:

```bash
# On Host A: add a GRE tunnel port
sudo ovs-vsctl add-port br-int gre0 -- \
  set interface gre0 type=gre \
  options:remote_ip=192.168.1.20 \
  options:key=100

# On Host B: add a GRE tunnel port
sudo ovs-vsctl add-port br-int gre0 -- \
  set interface gre0 type=gre \
  options:remote_ip=192.168.1.10 \
  options:key=100
```

GRE has slightly less overhead than VXLAN (no UDP header) but fewer features and less hardware offload support.

## Flow Tables and OpenFlow

OVS uses OpenFlow flow tables to control packet forwarding. View the current flow table:

```bash
sudo ovs-ofctl dump-flows br-int
```

Add a flow rule to forward traffic from a specific MAC address to a specific port:

```bash
# Forward traffic with destination MAC aa:bb:cc:dd:ee:ff to port 2
sudo ovs-ofctl add-flow br-int \
  "dl_dst=aa:bb:cc:dd:ee:ff,actions=output:2"

# Drop all traffic from a specific MAC (simple ACL)
sudo ovs-ofctl add-flow br-int \
  "dl_src=de:ad:be:ef:00:01,actions=drop"
```

## VLAN Tagging

OVS supports 802.1Q VLAN tagging. To place a port in a specific VLAN:

```bash
# Tag port veth0 with VLAN 100
sudo ovs-vsctl set port veth0 tag=100

# Trunk port (carries multiple VLANs)
sudo ovs-vsctl set port eth0 trunks=100,200,300
```

## Monitoring OVS

Check interface statistics:

```bash
# Show port statistics
sudo ovs-vsctl list interface vxlan0

# More detailed stats
sudo ovs-ofctl dump-ports br-int

# Check tunnel status
sudo ovs-vsctl list interface vxlan0 | grep -A 5 "tunnel"
```

For continuous monitoring:

```bash
# Watch OVS events
sudo ovs-vsctl --db=unix:/var/run/openvswitch/db.sock monitor
```

## Persistence Across Reboots

OVS configuration is stored in its own database (`/etc/openvswitch/conf.db`) and persists across reboots automatically. The systemd service restores all bridges and ports on startup.

Verify persistence:

```bash
# Show current config
sudo ovs-vsctl show

# After reboot, run the same command - config should be identical
sudo reboot
# After boot:
sudo ovs-vsctl show
```

## Removing Tunnels and Bridges

```bash
# Remove a port from a bridge
sudo ovs-vsctl del-port br-int vxlan0

# Remove an entire bridge (and all its ports)
sudo ovs-vsctl del-br br-int
```

## Troubleshooting

**Tunnel port shows "No such device":**
```bash
# Check OVS kernel modules are loaded
lsmod | grep openvswitch
sudo modprobe openvswitch

# Restart OVS
sudo systemctl restart openvswitch-switch
```

**Ping works on one host but not the other:**
```bash
# Check tunnel config on both hosts
sudo ovs-vsctl list interface vxlan0 | grep options

# Verify the remote_ip points to the correct host
# Check firewall rules allow UDP 4789
sudo ufw status verbose | grep 4789
```

**Traffic not flowing despite tunnel being up:**
```bash
# Check flow table for any DROP rules
sudo ovs-ofctl dump-flows br-int | grep drop

# Verify the MAC addresses are in the forwarding table
sudo ovs-appctl fdb/show br-int
```

Open vSwitch is considerably more complex than simpler tunneling tools, but it pays off in environments where you need fine-grained control over packet flow, VLAN handling, and integration with SDN controllers. Once you understand the bridge-port-interface hierarchy and flow tables, the rest follows naturally.
