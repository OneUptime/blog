# How to Configure IPv6 in VirtualBox

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, VirtualBox, Virtualization, Desktop, NAT, Bridged Networking

Description: Configure IPv6 networking in Oracle VirtualBox virtual machines using NAT, bridged adapter, and host-only network modes, with VBoxManage commands and GUI configuration.

## Introduction

VirtualBox supports IPv6 for virtual machine networking in bridged, NAT, NAT Network, and Host-Only adapter modes. Bridged mode is the simplest for IPv6 - the VM appears directly on the physical network and receives SLAAC or DHCPv6 addresses. NAT mode supports IPv6 but requires the host to have IPv6 connectivity. Configuration is done via the VirtualBox GUI or VBoxManage command-line tool.

## Bridged Adapter (Full IPv6)

```bash
# VBoxManage: Set VM to use bridged adapter on physical NIC

VBoxManage modifyvm "MyVM" \
    --nic1 bridged \
    --bridgeadapter1 eth0

# Start the VM
VBoxManage startvm "MyVM" --type headless

# Inside the VM, IPv6 is received via SLAAC from physical router
# or can be configured statically
```

```sql
# VirtualBox GUI:
# 1. VM Settings → Network → Adapter 1
# 2. Attached to: Bridged Adapter
# 3. Name: Select your physical Ethernet adapter (eth0 or similar)
# 4. OK → Start VM
# VM will get IPv6 from SLAAC or DHCPv6 on the physical network
```

## NAT Adapter with IPv6

```bash
# VBoxManage: Enable NAT adapter with IPv6
VBoxManage modifyvm "MyVM" \
    --nic1 nat \
    --nat-pf1 "ssh,tcp,,2222,,22"   # Port forward IPv4

# For IPv6 NAT (requires host IPv6):
# VirtualBox NAT automatically enables IPv6 if the host has IPv6
# The VM gets a link-local address and can reach the host network

# Check if VM can ping IPv6 (from inside VM)
# ping6 2001:4860:4860::8888   (Google DNS)
```

## NAT Network with IPv6

```bash
# Create a NAT Network with IPv6 support
VBoxManage natnetwork add \
    --netname "IPv6NatNet" \
    --network "192.168.50.0/24" \
    --ipv6 on \
    --enable

# List NAT networks
VBoxManage natnetwork list

# Attach VM to NAT Network
VBoxManage modifyvm "MyVM" \
    --nic1 natnetwork \
    --nat-network1 "IPv6NatNet"

# Inside the VM, the NAT Network provides both DHCPv4 and IPv6
# The VM gets an IPv6 address from the NAT Network range
```

## Host-Only Network with IPv6

```bash
# Create a Host-Only adapter with IPv6
VBoxManage hostonlyif create
# Returns: "Interface 'vboxnet0' was successfully created"

# Configure IPv4 on the host-only interface
VBoxManage hostonlyif ipconfig vboxnet0 \
    --ip 192.168.99.1 \
    --netmask 255.255.255.0

# Configure IPv6 on the host-only interface
VBoxManage hostonlyif ipconfig vboxnet0 \
    --ipv6 fd00:abcd::1 \
    --netmasklengthv6 64

# List host-only interfaces
VBoxManage list hostonlyifs

# Attach VM to host-only network
VBoxManage modifyvm "MyVM" \
    --nic2 hostonly \
    --hostonlyadapter2 vboxnet0
```

## Configure IPv6 Inside the VM (Linux Guest)

```bash
# Inside the VirtualBox VM (Linux)

# Check current IPv6 address
ip -6 addr show

# If bridged or NAT: SLAAC address should appear automatically
# If host-only: configure statically

# Static IPv6 for host-only network (Ubuntu/Netplan)
cat > /etc/netplan/02-hostonly.yaml << 'EOF'
network:
  version: 2
  ethernets:
    enp0s8:                          # Second adapter (host-only)
      addresses:
        - fd00:abcd::10/64
      gateway6: fd00:abcd::1
EOF
netplan apply

# Test: ping host from VM
ping6 fd00:abcd::1
# ping host: ssh -6 fd00:abcd::10
```

## Configure IPv6 Inside the VM (Windows Guest)

```powershell
# Inside Windows VM

# Check IPv6 addresses
Get-NetIPAddress -AddressFamily IPv6

# Set static IPv6 for host-only adapter
New-NetIPAddress `
    -InterfaceAlias "Ethernet 2" `
    -IPAddress "fd00:abcd::10" `
    -PrefixLength 64 `
    -DefaultGateway "fd00:abcd::1"

# Test connectivity
ping -6 fd00:abcd::1
```

## Port Forwarding for IPv6 (NAT Mode)

```bash
# VirtualBox NAT IPv6 port forwarding
# Note: IPv6 port forwarding in NAT mode has limited support
# Bridged or NAT Network is recommended for full IPv6

# For NAT Network, add IPv6 port forward
VBoxManage natnetwork modify \
    --netname "IPv6NatNet" \
    --port-forward-6 "ssh6:tcp:[]:2222:[fd00::100]:22"

# Test:
ssh -p 2222 -6 "::1"   # Connect via IPv6 loopback
```

## Verify IPv6 Connectivity

```bash
# From host: ping VM over IPv6 (host-only)
ping6 fd00:abcd::10

# From VM: ping host over IPv6
ping6 fd00:abcd::1

# From VM: test external IPv6 (bridged/NAT)
ping6 2001:4860:4860::8888

# Check VM's IPv6 routing table
ip -6 route show

# VBoxManage: check VM network configuration
VBoxManage showvminfo "MyVM" | grep -A5 "NIC 1"
```

## Conclusion

VirtualBox supports IPv6 across all network adapter modes. Bridged mode provides the most transparent IPv6 experience - VMs appear directly on the physical network and receive SLAAC addresses automatically. NAT Network mode supports IPv6 with built-in DHCPv6. Host-Only networks require manual IPv6 configuration on both the `vboxnet` interface (via `VBoxManage hostonlyif ipconfig --ipv6`) and inside the VM. For development environments, Host-Only IPv6 networks using ULA prefixes (`fd00::/8`) are convenient for host-VM communication without requiring physical network IPv6 connectivity.
