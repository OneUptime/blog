# How to Create a VLAN Interface Inside a Network Namespace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VLAN, Network Namespaces, Linux, Netns, 802.1Q, IPv4, Isolation

Description: Learn how to create 802.1Q VLAN interfaces inside Linux network namespaces for isolated VLAN-based networking in testing, containers, and multi-tenant scenarios.

---

VLAN interfaces inside network namespaces allow per-namespace VLAN segmentation - useful for testing VLAN configurations, simulating multi-tenant environments, and container networking.

## Setup: Move a Physical Interface into a Namespace

```bash
# Create namespace

ip netns add vlan-test

# Create veth pair (we cannot move physical NICs without losing host connectivity)
ip link add veth-host type veth peer name veth-ns

# Move veth-ns into the namespace
ip link set veth-ns netns vlan-test

# Bring up host side
ip link set veth-host up
```

## Create a VLAN Interface Inside the Namespace

```bash
# Create VLAN 10 interface inside the namespace (on top of veth-ns)
ip netns exec vlan-test ip link add link veth-ns name veth-ns.10 type vlan id 10
ip netns exec vlan-test ip link add link veth-ns name veth-ns.20 type vlan id 20

# Assign IPs to VLAN interfaces
ip netns exec vlan-test ip addr add 192.168.10.1/24 dev veth-ns.10
ip netns exec vlan-test ip addr add 192.168.20.1/24 dev veth-ns.20

# Bring up all interfaces
ip netns exec vlan-test ip link set veth-ns up
ip netns exec vlan-test ip link set veth-ns.10 up
ip netns exec vlan-test ip link set veth-ns.20 up
ip netns exec vlan-test ip link set lo up
```

## Verifying VLAN Interface in Namespace

```bash
# List interfaces in namespace
ip netns exec vlan-test ip -d link show

# Output shows VLAN parent and ID:
# veth-ns.10@veth-ns: <BROADCAST,MULTICAST,UP,LOWER_UP>
#     vlan protocol 802.1Q id 10 <REORDER_HDR>

# Check addresses
ip netns exec vlan-test ip addr show
```

## Using a Linux Bridge on the Host Side

```bash
# Create trunk bridge on host to carry 802.1Q traffic
ip link add br0 type bridge
ip link set veth-host master br0
ip link set br0 up

# Allow VLAN traffic through the bridge (VLAN-aware bridge)
ip link set br0 type bridge vlan_filtering 1
bridge vlan add dev veth-host vid 10 tagged
bridge vlan add dev veth-host vid 20 tagged
```

## Complete Test: Two Namespaces on the Same VLAN

```bash
# Namespace A: VLAN 10
ip netns add ns-a
ip link add veth-a type veth peer name veth-a-br
ip link set veth-a netns ns-a
ip link set veth-a-br master br0
ip link set veth-a-br up
bridge vlan add dev veth-a-br vid 10 tagged
ip netns exec ns-a ip link add link veth-a name veth-a.10 type vlan id 10
ip netns exec ns-a ip addr add 192.168.10.2/24 dev veth-a.10
ip netns exec ns-a ip link set veth-a up && ip netns exec ns-a ip link set veth-a.10 up

# Namespace B: VLAN 10 (same VLAN, should communicate)
ip netns add ns-b
ip link add veth-b type veth peer name veth-b-br
ip link set veth-b netns ns-b
ip link set veth-b-br master br0
ip link set veth-b-br up
bridge vlan add dev veth-b-br vid 10 tagged
ip netns exec ns-b ip link add link veth-b name veth-b.10 type vlan id 10
ip netns exec ns-b ip addr add 192.168.10.3/24 dev veth-b.10
ip netns exec ns-b ip link set veth-b up && ip netns exec ns-b ip link set veth-b.10 up
```

## Key Takeaways

- VLAN interfaces inside namespaces are created with `ip link add link <parent> name <parent>.<vid> type vlan id <vid>`.
- Use veth pairs to connect namespaces to the host bridge; physical interfaces cannot be moved to namespaces safely.
- Enable `vlan_filtering 1` on Linux bridges to allow 802.1Q VLAN separation across bridge ports.
- Namespace VLAN configurations are ephemeral; use systemd-networkd or netplan for persistent setup.
