# How to Configure IPVLAN Interfaces on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, IPvlan, Virtual Interfaces

Description: Configure IPVLAN interfaces on Ubuntu with step-by-step instructions covering L2 and L3 modes, use cases compared to MacVLAN, and persistent configuration methods.

---

IPVLAN is a Linux virtual network driver similar to MacVLAN but with a key difference: all IPVLAN interfaces share the same MAC address as the parent interface. Instead of MAC-based multiplexing, IPVLAN uses IP address multiplexing. This makes it a better fit for environments with MAC address limitations, like some cloud providers that restrict the number of MAC addresses per instance.

## IPVLAN vs MacVLAN

The key differences:

| Feature | IPVLAN | MacVLAN |
|---|---|---|
| MAC addresses | All share parent MAC | Each has unique MAC |
| DHCP support | Tricky (same MAC) | Natural (unique MACs) |
| Promiscuous mode | Not required | Usually not required, except passthru mode |
| Cloud-friendly | Better | Worse (MAC limits) |
| Host communication | Use routed L3 or a separate host-side path | Generally not possible through the parent |

IPVLAN works well when:
- Your switch or cloud provider limits MAC addresses per port
- You want L3 routing between namespaces and the host
- You don't need each interface to be individually addressable via MAC

## IPVLAN Modes

IPVLAN has two primary modes plus an L3S variant:

**L2 mode**: IPVLAN operates at layer 2. The parent interface receives frames and IPVLAN dispatches based on IP address. It behaves similarly to a bridge for the virtual endpoints while still sharing the parent's MAC address. The host still can't communicate with IPVLAN interfaces through the parent in L2 mode.

**L3 mode**: IPVLAN operates at layer 3. The parent namespace routes traffic for the IPVLAN interfaces, and the IPVLAN interfaces do not receive or send broadcast and multicast traffic. Use a non-overlapping subnet and routes pointing to the parent interface for L3 container networks.

**L3S mode**: Like L3 but with symmetric netfilter handling, allowing host namespace iptables and nftables rules to see both ingress and egress traffic for the sub-interfaces.

## Creating IPVLAN Interfaces Manually

```bash
# Create an IPVLAN interface in L2 mode

# Parent: eth0, new interface: ipvlan0
sudo ip link add ipvlan0 link eth0 type ipvlan mode l2

# Assign IP address
sudo ip addr add 192.168.1.200/24 dev ipvlan0

# Bring it up
sudo ip link set ipvlan0 up

# Verify - notice MAC matches parent
ip link show eth0 | grep link/ether
ip link show ipvlan0 | grep link/ether
# Both will show the same MAC address
```

For L3 mode:

```bash
# Create IPVLAN in L3 mode
sudo ip link add ipvlan0 link eth0 type ipvlan mode l3

# In L3 mode, the IP should be in a different subnet for routing to work
sudo ip addr add 10.100.0.2/24 dev ipvlan0

sudo ip link set ipvlan0 up

# Add route for traffic to reach the ipvlan network
sudo ip route add 10.100.0.0/24 dev ipvlan0
```

## Using IPVLAN with Network Namespaces

IPVLAN with network namespaces is a common container networking pattern:

```bash
# Create a namespace
sudo ip netns add container1

# Create IPVLAN interface
sudo ip link add ipvl-c1 link eth0 type ipvlan mode l2

# Move it into the namespace
sudo ip link set ipvl-c1 netns container1

# Configure inside the namespace
sudo ip netns exec container1 ip addr add 192.168.1.201/24 dev ipvl-c1
sudo ip netns exec container1 ip link set ipvl-c1 up
sudo ip netns exec container1 ip link set lo up
sudo ip netns exec container1 ip route add default via 192.168.1.1

# Test from inside the namespace
sudo ip netns exec container1 ping 8.8.8.8
```

Multiple containers:

```bash
# Create several containers sharing the same parent MAC
sudo ip netns add container2
sudo ip netns add container3

sudo ip link add ipvl-c2 link eth0 type ipvlan mode l2
sudo ip link add ipvl-c3 link eth0 type ipvlan mode l2

sudo ip link set ipvl-c2 netns container2
sudo ip link set ipvl-c3 netns container3

sudo ip netns exec container2 ip addr add 192.168.1.202/24 dev ipvl-c2
sudo ip netns exec container2 ip link set ipvl-c2 up
sudo ip netns exec container2 ip route add default via 192.168.1.1

sudo ip netns exec container3 ip addr add 192.168.1.203/24 dev ipvl-c3
sudo ip netns exec container3 ip link set ipvl-c3 up
sudo ip netns exec container3 ip route add default via 192.168.1.1
```

## Host-to-Container Communication with L3 Mode

In L3 mode, the host routes traffic for IPVLAN interfaces, which is useful for routed container subnets:

```bash
# Create namespace and L3 ipvlan
sudo ip netns add app-ns

sudo ip link add ipvl-app link eth0 type ipvlan mode l3
sudo ip link set ipvl-app netns app-ns

# Use a non-overlapping subnet for L3
sudo ip netns exec app-ns ip addr add 10.200.0.2/24 dev ipvl-app
sudo ip netns exec app-ns ip link set ipvl-app up
sudo ip netns exec app-ns ip link set lo up

# Add route on the host to reach the container's network
sudo ip route add 10.200.0.0/24 dev eth0

# Add a route from the namespace back through its IPVLAN interface
sudo ip netns exec app-ns ip route add default dev ipvl-app

# Now the host can reach the container
ping 10.200.0.2
```

## Persistent Configuration with systemd-networkd

Create the netdev and network configuration files:

```bash
# Netdev file defining the IPVLAN interface
sudo tee /etc/systemd/network/30-ipvlan0.netdev << 'EOF'
[NetDev]
Name=ipvlan0
Kind=ipvlan

[IPVLAN]
Mode=L2
EOF

# Network file for the IPVLAN interface
sudo tee /etc/systemd/network/40-ipvlan0.network << 'EOF'
[Match]
Name=ipvlan0

[Network]
Address=192.168.1.200/24
Gateway=192.168.1.1
DNS=8.8.8.8
EOF

# Update the parent interface's network file to reference IPVLAN
sudo tee /etc/systemd/network/20-eth0.network << 'EOF'
[Match]
Name=eth0

[Network]
DHCP=yes
IPVLAN=ipvlan0
EOF

sudo systemctl restart systemd-networkd
```

## IPVLAN with Netplan

Netplan currently does not expose an IPVLAN device type in its YAML schema. The most reliable approach is to use systemd-networkd files alongside netplan, or use a post-up script:

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: true
```

Then create systemd-networkd files for IPVLAN as shown above. If netplan already generates a `.network` file for the parent interface, make sure the generated parent configuration includes the `IPVLAN=` attachment, or replace it with a matching networkd file that is applied first.

## Checking IPVLAN Status

```bash
# Show interface details
ip link show ipvlan0
ip addr show ipvlan0

# Verify it's a child of eth0
ip link show | grep -A1 "ipvlan"

# Check routing
ip route show dev ipvlan0

# Monitor traffic
sudo tcpdump -i ipvlan0 -n

# Check networkd status for persistent configs
networkctl status ipvlan0
```

## L3S Mode for Firewall Rules

L3S mode is like L3 but hooks into netfilter symmetrically, enabling iptables and nftables in the host namespace to filter traffic:

```bash
# Create in L3S mode
sudo ip link add ipvlan0 link eth0 type ipvlan mode l3s

# L3S mode with namespace
sudo ip netns add filtered-ns
sudo ip link add ipvl-filtered link eth0 type ipvlan mode l3s
sudo ip link set ipvl-filtered netns filtered-ns

# Now host namespace firewall rules can filter traffic
# going to/from the namespace. Match the actual interface
# names and directions used in your routing policy.
sudo iptables -A FORWARD -d 10.200.0.2 -j ACCEPT
sudo iptables -A FORWARD -s 10.200.0.2 -j ACCEPT
```

## Cleanup

```bash
# Remove manual IPVLAN interfaces
sudo ip link set ipvlan0 down
sudo ip link delete ipvlan0

# Remove namespaces (also removes interfaces inside them)
sudo ip netns delete container1
sudo ip netns delete app-ns

# Remove persistent systemd-networkd configs
sudo rm /etc/systemd/network/30-ipvlan0.netdev
sudo rm /etc/systemd/network/40-ipvlan0.network
sudo systemctl restart systemd-networkd
```

IPVLAN is particularly well-suited for cloud environments where you can't have multiple MAC addresses, and for L3 container networking where you want the host to be able to communicate directly with containers without complex routing workarounds.
