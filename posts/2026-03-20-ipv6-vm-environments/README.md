# How to Configure IPv6 in VM Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Virtual Machine, KVM, VirtualBox, VMware, Network Virtualization

Description: Configure IPv6 for virtual machines in KVM/QEMU, VirtualBox, and VMware environments, including bridged, NAT, and host-only networking modes.

## Introduction

Virtual machines present unique challenges for IPv6: the hypervisor network stack, virtual switches, and bridging all need to pass IPv6 traffic correctly. NDP (Neighbor Discovery) packets, Router Advertisements, and multicast traffic behave differently in virtualized environments. This guide covers IPv6 configuration for the most common hypervisors.

## KVM/QEMU with libvirt

```bash
# Create a network with IPv6 enabled

cat << 'EOF' > /tmp/ipv6-network.xml
<network>
  <name>ipv6-net</name>
  <forward mode='nat'>
    <nat ipv6='yes'/>
  </forward>
  <bridge name='virbr1' stp='on' delay='0'/>
  <ip address='192.168.100.1' netmask='255.255.255.0'>
    <dhcp>
      <range start='192.168.100.2' end='192.168.100.254'/>
    </dhcp>
  </ip>
  <ip family='ipv6' address='fd00:cafe::1' prefix='64'>
    <dhcp>
      <range start='fd00:cafe::2' end='fd00:cafe::ff'/>
    </dhcp>
  </ip>
</network>
EOF

sudo virsh net-define /tmp/ipv6-network.xml
sudo virsh net-start ipv6-net
sudo virsh net-autostart ipv6-net

# Verify the bridge address that libvirt assigned from the network XML
ip -6 addr show dev virbr1
```

## KVM/QEMU Bridged Networking for IPv6

```bash
# For bridged networking, the VM gets IPv6 from your physical network
# Configure bridge to pass IPv6 (should work by default)

# Create bridge
sudo ip link add br0 type bridge
sudo ip link set eth0 master br0
sudo ip link set eth0 up
sudo ip link set br0 up

# Move the host's IP configuration from eth0 to br0 using your distro's
# persistent network configuration tooling before relying on the bridge.
sudo sysctl -w net.ipv6.conf.br0.disable_ipv6=0

# If the host itself should accept RAs on br0 while IPv6 forwarding is enabled:
sudo sysctl -w net.ipv6.conf.br0.accept_ra=2

# Check if bridge passes NDP/RA
sudo tcpdump -i br0 "ip6 proto 58" &
# Start VM and check if it gets an IPv6 address
```

## VirtualBox IPv6 Configuration

```bash
# VirtualBox: Enable IPv6 on a host-only network
# GUI: Tools → Network → Host-Only Networks
# Or use VBoxManage:

# On Linux, macOS, and Solaris hosts, allow the IPv6 range first because
# VirtualBox only permits link-local IPv6 on host-only adapters by default.
sudo install -d /etc/vbox
sudo tee /etc/vbox/networks.conf > /dev/null << 'EOF'
* 192.168.56.0/21
* fd56:1234:1::/64
EOF

# Create host-only network with IPv6
VBoxManage hostonlyif create  # Creates vboxnet0
VBoxManage hostonlyif ipconfig vboxnet0 \
    --ip=192.168.56.1 --netmask=255.255.255.0

# Enable IPv6 on the host-only adapter
VBoxManage hostonlyif ipconfig vboxnet0 \
    --ipv6=fd56:1234:1::1 --netmasklengthv6=64

# For NAT networks with IPv6:
VBoxManage natnetwork add \
    --netname "NATNetworkv6" \
    --network "192.168.15.0/24" \
    --enable --ipv6=on

# Or enable IPv6 later on an existing NAT network
VBoxManage natnetwork modify \
    --netname "NATNetworkv6" \
    --ipv6=on
```

## VMware IPv6 Configuration

```bash
# VMware Workstation/Fusion: bridged mode is the simplest way to use IPv6.
# The guest receives Router Advertisements and DHCPv6 directly from the
# upstream network, and VMware manages the default host-only (vmnet1)
# and NAT (vmnet8) networks.

# On Linux hosts, ensure IPv6 is enabled on the VMware host-side adapters
sudo sysctl -w net.ipv6.conf.vmnet0.disable_ipv6=0
sudo sysctl -w net.ipv6.conf.vmnet8.disable_ipv6=0

# On Linux hosts, capture Router Advertisements or other ICMPv6 traffic
# on the bridged network
sudo tcpdump -i vmnet0 "ip6 proto 58" -v

# For vmnet1/vmnet8 subnet changes, use VMware's Network Editor/Preferences
# instead of editing dhcpd.conf directly.
```

## In-VM IPv6 Troubleshooting

```bash
# Inside the VM, diagnose IPv6 issues
# Check if interface received RA from host
rdisc6 eth0

# Check if hypervisor is blocking NDP
# On the host, capture NDP traffic on the bridge/vmnet interface:
sudo tcpdump -i virbr1 "ip6 proto 58" -v

# Ensure multicast works for NDP
# On Linux bridges, 1 means snooping is enabled (the default), 0 means disabled
cat /sys/class/net/virbr1/bridge/multicast_snooping

# Disable multicast snooping temporarily only as a diagnostic if multicast
# forwarding for ICMPv6/NDP appears to be malfunctioning
echo 0 | sudo tee /sys/class/net/virbr1/bridge/multicast_snooping
```

## Enabling IPv6 on VM Network Bridge (Linux)

```bash
# If the host is routing IPv6 between interfaces, enable forwarding
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Proxy NDP is only needed when the host must answer NDP on behalf of guests
sudo sysctl net.ipv6.conf.all.proxy_ndp

# If using ebtables, ensure IPv6/NDP is not filtered
sudo ebtables -L | grep "ipv6\|ip6"
# Should not have DROP rules for IPv6 or ICMPv6/NDP

# For LXC/LXD containers with IPv6:
lxc network set lxdbr0 ipv6.address=fd42:4242:4242::1/64
lxc network set lxdbr0 ipv6.nat=true
```

## Conclusion

IPv6 in VM environments requires IPv6 support at the hypervisor network layer, not just inside the VM. For bridged networking, IPv6 typically works automatically if the physical network provides RAs. For NAT/host-only networks, use the hypervisor's built-in IPv6-aware network services when available, or run an RA/DHCPv6 service yourself when you are building a plain Linux bridge. Key troubleshooting steps: verify that RAs are reaching the guest, check bridge multicast behavior if ICMPv6 multicast forwarding looks wrong, and capture NDP traffic on the relevant bridge or vmnet interface.
