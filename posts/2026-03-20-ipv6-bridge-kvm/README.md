# How to Configure IPv6 Bridge Networking in KVM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, KVM, Bridge Networking, Linux, Virtualization, Network Bridge

Description: Configure Linux bridge networking for KVM virtual machines with IPv6, enabling VMs to appear directly on the physical IPv6 network and receive SLAAC or static IPv6 addresses.

## Introduction

Bridge networking in KVM connects virtual machine network interfaces directly to the physical network through a Linux bridge, making VMs appear as first-class network citizens. IPv6 works transparently through Linux bridges - Router Advertisements, NDP messages, and DHCPv6 all pass through the bridge without special configuration, enabling VMs to receive IPv6 addresses from the physical network.

## Create Linux Bridge for KVM IPv6

```bash
# Method 1: Using ip commands (temporary, for testing)

ip link add name br0 type bridge
ip link set br0 up
ip link set eth0 master br0
ip link set eth0 up

# Move IPv6 address from eth0 to bridge
ip -6 addr flush dev eth0
ip -6 addr add 2001:db8::10/64 dev br0
ip -6 route add default via 2001:db8::1 dev br0

# Verify
bridge link show
ip -6 addr show br0
```

## Persistent Bridge with systemd-networkd

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
Bridge=br0

# /etc/systemd/network/20-br0.netdev
[NetDev]
Name=br0
Kind=bridge

# /etc/systemd/network/20-br0.network
[Match]
Name=br0

[Network]
# DHCPv4
DHCP=ipv4

# Static IPv6 for the host (bridge gets the address)
Address=2001:db8::10/64
Gateway=2001:db8::1
# Optional: accept RAs if you also want RA-learned routes or SLAAC addresses
IPv6AcceptRA=yes
```

```bash
# Apply changes
systemctl restart systemd-networkd
```

## Persistent Bridge with /etc/network/interfaces

```bash
# /etc/network/interfaces (Debian/Ubuntu)

auto br0
iface br0 inet static
    address 192.168.1.10/24
    gateway 192.168.1.1
    bridge_ports eth0
    bridge_stp off
    bridge_fd 0
    up ip -6 addr add 2001:db8::10/64 dev br0
    up ip -6 route add default via 2001:db8::1 dev br0
    down ip -6 route del default via 2001:db8::1 dev br0 || true
    down ip -6 addr del 2001:db8::10/64 dev br0 || true

# eth0 is added to the bridge by bridge_ports; do not configure it separately
```

## KVM VM with Bridge in libvirt XML

```xml
<!-- VM network interface using the bridge -->
<interface type='bridge'>
  <mac address='52:54:00:ab:cd:01'/>
  <source bridge='br0'/>
  <model type='virtio'/>
  <driver name='vhost'/>
</interface>
```

```bash
# Attach bridge to running VM
virsh attach-interface myvm bridge br0 \
    --model virtio \
    --mac 52:54:00:ab:cd:01 \
    --live --persistent
```

## IPv6 Behavior in Linux Bridges

```bash
# A plain Linux bridge forwards IPv6 unicast and multicast at L2, including:
# - IPv6 multicast (ff02::/16) - RAs, NDP, MLD
# - Unicast IPv6 frames

# Inspect the bridge multicast database
bridge mdb show dev br0
# You may see IPv6 multicast groups here if snooping has learned listeners

# Check bridge netfilter settings
sysctl net.bridge.bridge-nf-call-ip6tables
# If set to 1, bridged IPv6 traffic traverses ip6tables and NDP may need explicit allow rules

# Disable bridge netfilter for IPv6 if you want pure L2 bridging
echo "net.bridge.bridge-nf-call-ip6tables = 0" >> /etc/sysctl.conf
sysctl -p
```

## TAP Interface Management for KVM

```bash
# Create TAP interfaces manually (libvirt does this automatically)
ip tuntap add dev tap0 mode tap user root
ip link set tap0 master br0
ip link set tap0 up

# Start QEMU with TAP interface
qemu-system-x86_64 \
    -netdev tap,id=net0,ifname=tap0,script=no,downscript=no \
    -device virtio-net-pci,netdev=net0,mac=52:54:00:ab:cd:01 \
    -m 2048 \
    -drive file=vm.qcow2,format=qcow2 \
    -nographic

# TAP interface appears as a bridge port
ip link show master br0
# Should show tap0 enslaved to br0
```

## IPv6 Inside KVM Guest Receives from Bridge

```bash
# Inside the KVM VM (SLAAC from physical router via bridge)
ip -6 addr show
# Expected: inet6 2001:db8::xxxx/64 scope global dynamic noprefixroute

# Verify default route
ip -6 route show
# Expected: default via fe80::... dev eth0 proto ra

# Test external IPv6 connectivity
ping -6 2001:4860:4860::8888

# If no SLAAC address: check if RAs are reaching the VM
tcpdump -i eth0 -n "icmp6 and icmp6[0] == 134"  # Inside VM
# Type 134 = Router Advertisement
```

## NDP Proxy for Bridged VMs

```bash
# Not needed for a true same-L2 bridge. Use NDP proxy only if the VM is not
# actually on the upstream L2 segment but you still want to use an address from that /64

# Enable NDP proxy on the upstream interface
sysctl -w net.ipv6.conf.eth0.proxy_ndp=1

# Add NDP proxy entry for each VM IP
ip -6 neigh add proxy 2001:db8::100 dev eth0   # Proxy for VM at ::100

# Or use ndppd for automatic NDP proxying
apt-get install -y ndppd
# /etc/ndppd.conf
# proxy eth0 {
#   rule 2001:db8::/64 {}
# }
```

## Conclusion

Linux bridge networking for KVM VMs provides transparent IPv6 connectivity - all IPv6 traffic including Router Advertisements, NDP, and DHCPv6 passes through the bridge without modification. The key configuration is creating a bridge (`br0`), setting the physical NIC as a bridge port, and assigning the host's IPv6 address to the bridge. KVM VMs connected to this bridge receive SLAAC addresses from the physical router as if they were directly connected. If you want bridged IPv6 traffic to bypass ip6tables and behave as a pure L2 bridge, set `net.bridge.bridge-nf-call-ip6tables=0`. For VMs needing static IPv6 addresses, configure them inside the guest OS independently of the bridge configuration.
