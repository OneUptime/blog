# How to Configure IPv6 in VMware vSphere/ESXi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, VMware, vSphere, ESXi, Virtualization, Virtual Networking

Description: Configure IPv6 on VMware vSphere ESXi hosts, including management network IPv6 addressing, virtual machine network IPv6, and vCenter connectivity over IPv6.

## Introduction

VMware vSphere supports IPv6 for ESXi host management interfaces, vCenter Server connectivity, vMotion, and virtual machine networks. IPv6 can be configured via the ESXi DCUI (Direct Console User Interface), vSphere Client, or esxcli commands. Virtual machines receive IPv6 addresses through SLAAC, DHCPv6, or static assignment in their guest OS.

## Configure ESXi Management Network for IPv6

```bash
# Via esxcli (SSH to ESXi host)

# Enable IPv6 on the ESXi host

esxcli network ip set --ipv6-enabled=true

# List current IPv6 addresses
esxcli network ip interface ipv6 address list

# Add a static IPv6 address to vmk0 (management interface)
esxcli network ip interface ipv6 address add \
    --interface-name vmk0 \
    --ipv6 2001:db8::10/64

# Set IPv6 default gateway
esxcli network ip route ipv6 add \
    --gateway 2001:db8::1 \
    --network ::/0

# Verify IPv6 configuration
esxcli network ip interface list
esxcli network ip interface ipv6 address list
```

## vSphere Client: Enable IPv6 on ESXi Host

```text
1. Connect to ESXi host in vSphere Client
2. Navigate to: Host → Configure → Networking → VMkernel Adapters
3. Select vmk0 (Management Network)
4. Click "Edit"
5. Select "IPv6 Settings" tab
6. Enable "IPv6 (Required to use IPv6 on this host)"
7. Add static IPv6 address or enable DHCPv6/SLAAC
8. Click "OK"
9. Reboot the host for IPv6 changes to take effect
```

## Configure IPv6 for vMotion and Management Traffic

```bash
# Create a separate VMkernel interface for vMotion over IPv6
esxcli network ip interface add \
    --interface-name vmk1 \
    --portgroup-name "vMotion Network"

esxcli network ip interface ipv6 address add \
    --interface-name vmk1 \
    --ipv6 2001:db8:1::10/64

# Enable vMotion on vmk1
vim-cmd hostsvc/net/vnic_info vmk1
# Use vSphere Client to check/enable vMotion on the VMkernel adapter
```

## Configure IPv6 for Virtual Machine Port Groups

```bash
# Virtual machines receive IPv6 from their guest OS
# The ESXi host is transparent for VM network traffic

# Check vSwitch configuration
esxcli network vswitch standard list
esxcli network vswitch standard portgroup list

# VMs on standard vSwitches get IPv6 via:
# 1. Guest OS SLAAC (router advertisement from physical router)
# 2. Guest OS DHCPv6 (from DHCPv6 server on the segment)
# 3. Static IPv6 configuration in guest OS
```

## ESXi Firewall for IPv6

```bash
# List ESXi firewall rules
esxcli network firewall ruleset list

# Enable specific services for IPv6 access (they apply to all address families)
esxcli network firewall ruleset set --ruleset-id sshServer --enabled=true
esxcli network firewall ruleset set --ruleset-id vpxHeartbeats --enabled=true

# ESXi firewall doesn't distinguish IPv4/IPv6 - rules apply to both
# For host-based IPv6 filtering, use the physical network firewall
```

## vCenter Server IPv6 Configuration

```bash
# Check vCenter Server's IPv6 address (if dual-stack)
# Via vCenter Management Interface (port 5480)

# Access vCenter Management UI
# https://[2001:db8::20]:5480

# From vSphere Client, add ESXi host by IPv6 address
# Go to: Hosts and Clusters → Add Host
# Enter: [2001:db8::10] or hostname with AAAA record
```

## Virtual Machine IPv6 Configuration (Guest OS)

```bash
# Inside the VM (Linux guest)

# Check current IPv6 addresses (should see SLAAC address from ESXi network)
ip -6 addr show

# Configure static IPv6 in Ubuntu VM
cat >> /etc/netplan/01-netcfg.yaml << 'EOF'
network:
  version: 2
  ethernets:
    ens192:
      addresses:
        - 2001:db8::100/64
      gateway6: 2001:db8::1
      nameservers:
        addresses:
          - 2001:db8::53
EOF

netplan apply

# Windows VM: use PowerShell
New-NetIPAddress -InterfaceAlias "Ethernet0" \
    -IPAddress "2001:db8::100" -PrefixLength 64
New-NetRoute -DestinationPrefix "::/0" -NextHop "2001:db8::1" -InterfaceAlias "Ethernet0"
```

## Verify ESXi IPv6 Operation

```bash
# From ESXi host: test IPv6 connectivity
esxcli network diag ping --host 2001:db8::1 --netstack default --ipv6

# From Linux client: reach ESXi management over IPv6
ping6 2001:db8::10
ssh root@2001:db8::10

# Access vSphere Client over IPv6 (use hostname from DNS)
# https://vcenter.example.com (must resolve to AAAA)
# or
# https://[2001:db8::20] (bracket notation in browser URL)

# Check VMkernel interfaces
esxcli network ip interface ipv6 address list
```

## Conclusion

VMware vSphere supports IPv6 on ESXi host management interfaces (VMkernel adapters) configured via esxcli or the vSphere Client. IPv6 must be explicitly enabled on the ESXi host, and VMkernel adapters get static IPv6 addresses or DHCPv6/SLAAC addresses. Virtual machines receive IPv6 addresses through their guest OS configuration - the ESXi host is transparent to VM network traffic. vMotion and vSAN can also operate over IPv6 when VMkernel adapters for these services are configured with IPv6 addresses. vCenter Server connectivity over IPv6 works when the vCenter host has a dual-stack address and DNS provides AAAA records.
