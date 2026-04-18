# How to Configure VLAN Filtering on a Linux Bridge

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Bridge, VLAN Filtering, 802.1Q, Bridge, Networking, Virtualization

Description: Enable VLAN filtering on a Linux bridge to assign specific VLANs to bridge ports, creating trunk and access port behavior in a software bridge.

## Introduction

VLAN-aware bridges support 802.1Q VLAN filtering, allowing you to assign VLANs to individual bridge ports as either tagged (trunk) or untagged (access) ports. This replaces the need to create per-VLAN bridge instances and is more scalable for multi-VLAN environments.

## Enable VLAN Filtering on the Bridge

```bash
# Create bridge with VLAN filtering enabled

ip link add br0 type bridge vlan_filtering 1
ip link set br0 up

# Or enable on an existing bridge
ip link set br0 type bridge vlan_filtering 1
```

## Add Interfaces to the Bridge

```bash
# Add trunk port (carries all VLANs)
ip link set eth0 master br0
ip link set eth0 up

# Add access port (VM tap interface)
ip link set tap0 master br0
ip link set tap0 up
```

## Configure Trunk Port (Tagged)

```bash
# Allow VLAN 10 and 20 as tagged on eth0 (trunk port)
# Tagged is the default egress behavior when neither "untagged" nor "pvid" is set
bridge vlan add dev eth0 vid 10
bridge vlan add dev eth0 vid 20

# Remove the default VLAN 1 from trunk port (optional)
bridge vlan del dev eth0 vid 1
```

## Configure Access Port (Untagged/PVID)

```bash
# Assign tap0 (VM interface) to VLAN 10 as untagged access port
# pvid: this VLAN is the port VLAN ID for untagged ingress frames
# untagged: egress frames are stripped of VLAN tag
bridge vlan add dev tap0 vid 10 pvid untagged

# Remove default VLAN 1
bridge vlan del dev tap0 vid 1
```

## Configure Bridge's Own Port

The bridge itself also needs VLAN assignment if the host needs IP access:

```bash
# Allow the bridge host to participate in VLAN 10
bridge vlan add dev br0 vid 10 self

# Assign IP to a VLAN interface on the bridge
ip link add br0.10 type vlan link br0 id 10
ip addr add 10.10.0.1/24 dev br0.10
ip link set br0.10 up
```

## Verify VLAN Configuration

```bash
# Show VLAN assignments for all ports
bridge vlan show

# Output example:
# port  vlan ids
# eth0   10
#        20
# tap0   10 PVID Egress Untagged
# br0    10
```

## Full Multi-VLAN Bridge Example

```bash
#!/bin/bash
# setup-vlan-bridge.sh

# Create VLAN-aware bridge
ip link add br0 type bridge vlan_filtering 1
ip link set br0 up

# Add trunk uplink (eth0)
ip link set eth0 master br0
ip link set eth0 up
bridge vlan add dev eth0 vid 10
bridge vlan add dev eth0 vid 20
bridge vlan del dev eth0 vid 1

# Add VM1 tap (VLAN 10 access)
ip link set tap0 master br0
ip link set tap0 up
bridge vlan add dev tap0 vid 10 pvid untagged
bridge vlan del dev tap0 vid 1

# Add VM2 tap (VLAN 20 access)
ip link set tap1 master br0
ip link set tap1 up
bridge vlan add dev tap1 vid 20 pvid untagged
bridge vlan del dev tap1 vid 1

echo "VLAN bridge configured:"
bridge vlan show
```

## Conclusion

VLAN filtering on Linux bridges enables trunk and access port behavior within a single bridge instance. Enable `vlan_filtering 1` on the bridge, then use `bridge vlan add` to assign VLANs to ports as tagged (trunk, the default) or `pvid untagged` (access). This scales well for KVM hypervisors with many VMs across multiple VLANs.
