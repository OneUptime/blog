# How to Use VXLAN with Open vSwitch on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, VXLAN, Open vSwitch, OVS, SDN, Overlay Network, Networking

Description: Configure VXLAN tunnels using Open vSwitch to create software-defined overlay networks with advanced flow control and OpenFlow integration.

## Introduction

Open vSwitch (OVS) provides a more feature-rich alternative to the native Linux bridge for VXLAN. OVS supports OpenFlow, OVSDB, LACP, and fine-grained flow tables. It is the dataplane used by OpenStack Neutron, Kubernetes OVN, and many other SDN solutions.

## Prerequisites

```bash
# Install Open vSwitch

apt install openvswitch-switch   # Ubuntu/Debian
yum install openvswitch          # RHEL/CentOS

# Start OVS (starts both ovsdb-server and ovs-vswitchd)
systemctl enable --now openvswitch-switch   # Ubuntu/Debian
# systemctl enable --now openvswitch        # RHEL/CentOS
```

## Create an OVS Bridge with VXLAN

```bash
# Create an OVS bridge
ovs-vsctl add-br br-vxlan

# Add a VXLAN tunnel port to the bridge
ovs-vsctl add-port br-vxlan vxlan0 \
    -- set interface vxlan0 \
    type=vxlan \
    options:remote_ip=10.0.0.2 \
    options:key=100 \
    options:dst_port=4789

# Assign management IP to the bridge
ip addr add 10.200.0.1/24 dev br-vxlan
ip link set br-vxlan up
```

## Verify OVS Bridge Configuration

```bash
# Show all OVS bridges
ovs-vsctl show

# Show bridge ports
ovs-vsctl list-ports br-vxlan

# Show detailed VXLAN port configuration
ovs-vsctl list interface vxlan0
```

## Add a Physical Interface to the OVS Bridge

```bash
# Add eth1 as an uplink for VM traffic
ovs-vsctl add-port br-vxlan eth1
```

## Multiple VXLAN Tunnels

```bash
# Add VXLAN tunnel to second remote host
ovs-vsctl add-port br-vxlan vxlan1 \
    -- set interface vxlan1 \
    type=vxlan \
    options:remote_ip=10.0.0.3 \
    options:key=100 \
    options:dst_port=4789
```

## OVS Flow Table (Advanced)

OVS supports custom OpenFlow rules for fine-grained control:

```bash
# Show current flows
ovs-ofctl dump-flows br-vxlan

# Add a simple forwarding flow
ovs-ofctl add-flow br-vxlan "in_port=vxlan0,actions=output:NORMAL"

# Block specific IP traffic through VXLAN
ovs-ofctl add-flow br-vxlan \
    "priority=100,in_port=vxlan0,ip,nw_src=10.200.0.99,actions=drop"
```

## Monitor OVS Statistics

```bash
# Show port statistics
ovs-vsctl get interface vxlan0 statistics

# Or use ovs-ofctl
ovs-ofctl dump-ports br-vxlan

# Watch traffic rates
watch -n 2 "ovs-ofctl dump-ports br-vxlan | grep -A 3 vxlan0"
```

## Remove OVS VXLAN Configuration

```bash
# Remove the VXLAN port
ovs-vsctl del-port br-vxlan vxlan0

# Remove the bridge
ovs-vsctl del-br br-vxlan
```

## Conclusion

Open vSwitch provides advanced VXLAN functionality beyond native Linux bridges, including OpenFlow flow tables, OVSDB-based remote management, and seamless integration with SDN controllers. Use OVS when you need programmable flow control, OpenStack/OVN integration, or centralized network management. For simple deployments, native Linux VXLAN with `ip link` is simpler and has less overhead.
