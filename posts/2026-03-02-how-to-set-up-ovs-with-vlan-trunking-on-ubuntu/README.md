# How to Set Up OVS with VLAN Trunking on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Open vSwitch, VLAN, SDN

Description: Configure VLAN trunking with Open vSwitch on Ubuntu, including access ports, trunk ports, VLAN tagging, and integration with physical switch infrastructure.

---

VLAN trunking with OVS allows you to carry multiple VLANs across single links, separate traffic between tenant networks, and integrate your OVS deployment with existing physical switch VLAN infrastructure. OVS handles VLAN tagging natively and gives you fine-grained control over which VLANs each port participates in. This guide covers the essential VLAN configurations you will encounter in real deployments.

## VLAN Concepts in OVS

OVS models VLAN membership at the port level:

- **Access port** - strips and adds a single VLAN tag. VMs/hosts connected here are in one VLAN and are unaware of tagging.
- **Trunk port** - passes multiple VLANs. The connected device must handle VLAN tagging itself.
- **Native VLAN** - the VLAN used for untagged traffic arriving on a trunk port.

## Setting Up the Base Bridge

```bash
# Install OVS if needed
sudo apt install openvswitch-switch

# Create a bridge for the VLAN infrastructure
sudo ovs-vsctl add-br br-vlan

# Verify
sudo ovs-vsctl show
```

## Configuring Access Ports

Access ports assign incoming traffic to a specific VLAN. The connected device sends untagged frames.

```bash
# Add an internal port as a VLAN 100 access port
sudo ovs-vsctl add-port br-vlan vm-vlan100 \
  tag=100 \
  -- set interface vm-vlan100 type=internal

# Add another access port on VLAN 200
sudo ovs-vsctl add-port br-vlan vm-vlan200 \
  tag=200 \
  -- set interface vm-vlan200 type=internal

# Bring up the interfaces and assign addresses
sudo ip link set vm-vlan100 up
sudo ip addr add 10.100.0.1/24 dev vm-vlan100

sudo ip link set vm-vlan200 up
sudo ip addr add 10.200.0.1/24 dev vm-vlan200

# Verify port VLAN assignments
sudo ovs-vsctl list port vm-vlan100
# Look for: tag: 100
```

## Configuring Trunk Ports

Trunk ports carry multiple VLANs. Use this for uplinks to physical switches and for connecting devices that handle their own VLAN tagging.

```bash
# Add a trunk port that carries VLANs 100, 200, and 300
sudo ovs-vsctl add-port br-vlan eth0 trunks=100,200,300

# Verify the trunk configuration
sudo ovs-vsctl list port eth0
# Look for: trunks: [100, 200, 300]

# Show all port configurations
sudo ovs-vsctl show
```

A port with no `tag` and no `trunks` setting is a trunk that carries ALL VLANs - this is the OVS default for a new port.

## Restricting VLANs on a Trunk Port

```bash
# Change an existing port to only carry specific VLANs
sudo ovs-vsctl set port eth0 trunks=100,200

# Allow all VLANs (default behavior)
sudo ovs-vsctl clear port eth0 trunks

# Add a specific VLAN to an existing trunk
sudo ovs-vsctl set port eth0 trunks=100,200,300
# Note: you must specify the full list each time

# Remove trunks restriction (allow all VLANs)
sudo ovs-vsctl remove port eth0 trunks 200
# This removes VLAN 200 from the trunks list
```

## Setting Native VLAN on Trunk Ports

The native VLAN handles untagged traffic arriving on a trunk port.

```bash
# Set native VLAN to 1 for untagged traffic on eth0
sudo ovs-vsctl set port eth0 tag=1 trunks=100,200,300

# Or configure the native VLAN without tagging outbound traffic
# This is done via vlan_mode
sudo ovs-vsctl set port eth0 vlan_mode=native-untagged

# Available vlan_mode values:
# trunk         - pass only tagged frames in trunks list
# access        - access port behavior
# native-tagged - like trunk but native VLAN traffic is tagged
# native-untagged - like trunk but native VLAN traffic is untagged (802.1Q native)
```

## Connecting to a Physical Switch Trunk

When connecting an OVS port to a physical switch configured as a trunk:

```bash
# Scenario: eth0 is connected to a switch trunk port carrying VLANs 100,200,300
# Add eth0 as a trunk port carrying those VLANs
sudo ovs-vsctl add-port br-vlan eth0 trunks=100,200,300

# Internal ports for each VLAN (these become the default gateways for each VLAN)
sudo ovs-vsctl add-port br-vlan vlan100 tag=100 -- set interface vlan100 type=internal
sudo ovs-vsctl add-port br-vlan vlan200 tag=200 -- set interface vlan200 type=internal
sudo ovs-vsctl add-port br-vlan vlan300 tag=300 -- set interface vlan300 type=internal

# Assign addresses to VLAN interfaces
sudo ip link set vlan100 up && sudo ip addr add 10.100.0.1/24 dev vlan100
sudo ip link set vlan200 up && sudo ip addr add 10.200.0.1/24 dev vlan200
sudo ip link set vlan300 up && sudo ip addr add 10.300.0.1/24 dev vlan300
```

## VLAN Trunking with Netplan

For a persistent VLAN configuration managed by Netplan:

```yaml
# /etc/netplan/01-ovs-vlan.yaml
network:
  version: 2
  renderer: openvswitch
  ethernets:
    eth0:
      dhcp4: false
  bridges:
    br-vlan:
      interfaces: [eth0]
      dhcp4: false
      openvswitch:
        fail-mode: standalone
  vlans:
    vlan100:
      id: 100
      link: br-vlan
      addresses: [10.100.0.1/24]
    vlan200:
      id: 200
      link: br-vlan
      addresses: [10.200.0.1/24]
```

```bash
sudo netplan apply
```

## Testing VLAN Isolation

Verify that traffic on different VLANs stays isolated.

```bash
# Create test namespaces, each on a different VLAN
sudo ip netns add ns100
sudo ip netns add ns200

# Create internal ports
sudo ovs-vsctl add-port br-vlan port-ns100 tag=100 -- set interface port-ns100 type=internal
sudo ovs-vsctl add-port br-vlan port-ns200 tag=200 -- set interface port-ns200 type=internal

# Move ports to namespaces
sudo ip link set port-ns100 netns ns100
sudo ip link set port-ns200 netns ns200

# Configure addresses
sudo ip netns exec ns100 ip addr add 10.100.0.10/24 dev port-ns100
sudo ip netns exec ns100 ip link set port-ns100 up

sudo ip netns exec ns200 ip addr add 10.200.0.10/24 dev port-ns200
sudo ip netns exec ns200 ip link set port-ns200 up

# Test: ping within VLAN 100 (should work)
sudo ip netns exec ns100 ping -c 3 10.100.0.1

# Test: ping across VLANs without routing (should fail - that is correct!)
sudo ip netns exec ns100 ping -c 3 10.200.0.10
# This should fail because VLANs are isolated at L2
```

## Viewing VLAN Traffic

```bash
# Watch what flows are being used
sudo ovs-ofctl dump-flows br-vlan

# Capture tagged traffic on the uplink
sudo tcpdump -i eth0 -n vlan

# Capture traffic on a specific VLAN
sudo tcpdump -i eth0 -n 'vlan 100'

# View the OVS MAC address table (which VLANs each MAC is in)
sudo ovs-appctl fdb/show br-vlan
```

## Removing VLAN Configuration

```bash
# Remove tag from a port (make it a plain trunk)
sudo ovs-vsctl clear port vm-vlan100 tag

# Remove trunk restriction (allow all VLANs)
sudo ovs-vsctl clear port eth0 trunks

# Remove a VLAN port entirely
sudo ovs-vsctl del-port br-vlan vm-vlan100

# View remaining configuration
sudo ovs-vsctl show
```

## Typical Production VLAN Layout

A common pattern for a hypervisor or network server is:

```bash
# One bridge for all traffic
sudo ovs-vsctl add-br br-main

# Uplink to physical switch (trunk carrying all VLANs)
sudo ovs-vsctl add-port br-main eth0 trunks=10,20,30,40

# Management VLAN (for host management traffic)
sudo ovs-vsctl add-port br-main mgmt tag=10 -- set interface mgmt type=internal
sudo ip link set mgmt up
sudo ip addr add 192.168.10.1/24 dev mgmt

# VM network VLANs - ports get assigned per-VM at provisioning time
# (VLAN 20 = production, VLAN 30 = staging, VLAN 40 = development)

# Verify the complete setup
sudo ovs-vsctl show
sudo ovs-appctl fdb/show br-main
```

OVS VLAN support is as capable as hardware switch VLAN implementations, and the combination of trunk/access ports with OpenFlow rules gives you fine-grained traffic control that hardware switches cannot match without specialized programming.
