# How to Configure IPv6 NAT Networking in VirtualBox

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, VirtualBox, NAT, NPTv6, Virtual Networking, Desktop Virtualization

Description: Configure IPv6 NAT and NAT Network modes in VirtualBox to provide IPv6 connectivity to virtual machines when using ULA prefixes, including NPTv6 translation and port forwarding.

## Introduction

VirtualBox's NAT and NAT Network modes can provide IPv6 connectivity to VMs when bridged networking is not available or desired. In current VirtualBox releases, NAT mode includes IPv6 support in the NAT engine. NAT Network mode can use an IPv6 ULA prefix and router advertisements for SLAAC, allowing multiple VMs on the same NAT Network to communicate with each other and, when a default IPv6 route is advertised, with the outside world.

## VirtualBox NAT Mode with IPv6

```bash
# NAT mode (default VirtualBox network) - single VM

# Check the VM's first adapter

VBoxManage showvminfo "MyVM" | grep -E "NIC 1|NAT"

# Attach adapter 1 to NAT
VBoxManage modifyvm "MyVM" \
    --nic1 nat

# VirtualBox 7.1 and later add IPv6 support to the NAT engine.
# Verify IPv6 inside the guest with:
# ip -6 addr show
# ip -6 route show

# Port forwarding with NAT mode
VBoxManage modifyvm "MyVM" \
    --nat-pf1 "ssh,tcp,127.0.0.1,2222,,22"
# Connect: ssh -p 2222 127.0.0.1
```

## NAT Network with IPv6

```bash
# Create NAT Network with IPv6 enabled
VBoxManage natnetwork add \
    --netname NatNet1 \
    --network "10.0.2.0/24" \
    --dhcp on \
    --ipv6 on \
    --ipv6-prefix "fd17:625c:f037:cafe::/64" \
    --ipv6-default on \
    --enable

# Verify the NAT Network
VBoxManage natnetwork list

# Start the NAT Network
VBoxManage natnetwork start --netname NatNet1

# Attach VM to NAT Network
VBoxManage modifyvm "MyVM" \
    --nic1 natnetwork \
    --nat-network1 "NatNet1"

VBoxManage startvm "MyVM" --type headless
```

## Inside the VM: Verify IPv6 from NAT Network

```bash
# Inside the VM (connected to NAT Network)

# Check IPv6 address learned via router advertisements (SLAAC)
ip -6 addr show
# Expected:
# a global address from fd17:625c:f037:cafe::/64

# Check default route
ip -6 route show
# Expected:
# a default IPv6 route via the NAT gateway

# Test IPv6 connectivity
ping6 fd17:625c:f037:cafe::1    # Gateway
ping6 2001:4860:4860::8888      # External IPv6 (if host has IPv6 and --ipv6-default on)
```

## Host-Side NAT66 for IPv6-to-IPv6 Translation

```bash
# On the host: configure stateful NAT66 to translate the VirtualBox NAT Network
# ULA prefix to a public IPv6 address

# Enable IPv6 forwarding on host
sysctl -w net.ipv6.conf.all.forwarding=1

# Using nftables (stateful NAT66)
# Replace fd17:625c:f037:cafe::100 with the VM's actual IPv6 address.
cat > /etc/nftables.d/ipv6-nat.nft << 'EOF'
table ip6 nat {
    chain PREROUTING {
        type nat hook prerouting priority -100;
        # Translate incoming public IPv6 to the VM
        ip6 daddr 2001:db8::100/128 dnat to fd17:625c:f037:cafe::100
    }
    chain POSTROUTING {
        type nat hook postrouting priority 100;
        # Translate the VM's ULA source address to a public IPv6 address
        ip6 saddr fd17:625c:f037:cafe::/64 oifname "eth0" snat to 2001:db8::100
    }
}
EOF
nft -f /etc/nftables.d/ipv6-nat.nft
```

## Host-Only Network with IPv6 (No NAT)

```bash
# For VM-to-host and VM-to-VM IPv6 without NAT:
# Use Host-Only adapter with IPv6

# Create host-only interface
VBoxManage hostonlyif create
# Returns: Interface 'vboxnet0' was successfully created

# On Linux, macOS, and Solaris, allow the ULA range first:
# printf '* fd00:1234::/64\n' | sudo tee /etc/vbox/networks.conf

# Configure IPv6 on host-only interface
VBoxManage hostonlyif ipconfig vboxnet0 \
    --ipv6 "fd00:1234::1" \
    --netmasklengthv6 64

# Verify
VBoxManage list hostonlyifs | grep -A10 "vboxnet0"

# Attach VM to host-only
VBoxManage modifyvm "MyVM" \
    --nic2 hostonly \
    --hostonlyadapter2 vboxnet0

# Inside VM: configure static IPv6 on second adapter
# ip -6 addr add fd00:1234::10/64 dev eth1
```

## VirtualBox VM with Multiple IPv6 Networks

```bash
# VM with NAT (IPv4 internet + IPv6 if host has it)
# plus Host-Only (IPv6 management)

VBoxManage modifyvm "MyVM" \
    --nic1 nat                          # Internet (NAT)
    --nic2 hostonly \
    --hostonlyadapter2 vboxnet0         # Management (host-only IPv6)

# NIC1: NAT
# NIC2: Static IPv6 fd00:1234::10/64 - direct host access
```

## Testing IPv6 NAT Connectivity

```bash
# From host: inspect NAT Network configuration
VBoxManage list natnetworks

# From VM: test external IPv6 through NAT
# (only works if host has IPv6 internet and the NAT Network advertises a default IPv6 route)
curl -6 https://www.google.com/

# Add IPv6 port forwarding after identifying the guest's IPv6 address
# Replace fd17:625c:f037:cafe::100 with the guest's actual IPv6 address.
VBoxManage natnetwork modify --netname NatNet1 \
    --port-forward-6 "ssh6:tcp:[]:2222:[fd17:625c:f037:cafe::100]:22"

# Port forward test
ssh -p 2222 -6 "::1"   # Connect to VM's SSH via IPv6 loop

# Check the VM's IPv4 DHCP lease on the NAT Network
VBoxManage dhcpserver findlease \
    --network=NatNet1 \
    --mac-address=08:00:27:aa:bb:cc
```

## Conclusion

VirtualBox provides IPv6 through NAT mode and NAT Network mode. The NAT Network mode with `--ipv6 on`, `--ipv6-prefix`, and `--ipv6-default on` creates a complete IPv6 subnet for VMs and uses router advertisements for SLAAC. Host-Only networking with IPv6 is a simple option for host-VM communication, though on Linux, macOS, and Solaris custom IPv6 ranges for host-only adapters require `/etc/vbox/networks.conf`. For full public IPv6 access, bridged networking is preferred over NAT, as it connects VMs directly to the physical IPv6 network. If you need host-side IPv6 address translation for a NAT Network, configure NAT66 rules on the host.
