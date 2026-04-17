# How to Configure IPv6 in Xen

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Xen, XenServer, Citrix Hypervisor, Virtualization, Linux Bridge

Description: Configure IPv6 networking in Xen hypervisor environments, including dom0 bridge configuration, domU guest IPv6 setup, and XenAPI/xe CLI configuration for IPv6 management.

## Introduction

Xen is an open-source Type-1 hypervisor where the privileged domain (dom0) manages hardware and networking. IPv6 is configured on dom0's bridge interfaces (xenbr0, etc.), and guest domains (domU) receive IPv6 through these bridges. XenServer/Citrix Hypervisor provides a management API (XAPI) for automated IPv6 configuration.

## Configure IPv6 on Xen dom0 Bridge

```bash
# /etc/network/interfaces (Debian/Ubuntu dom0)

auto lo
iface lo inet loopback

# Physical NIC passed to bridge

auto eth0
iface eth0 inet manual

# Xen bridge with dual-stack
auto xenbr0
iface xenbr0 inet static
    address 192.168.1.10/24
    gateway 192.168.1.1
    bridge_ports eth0
    bridge_stp off
    bridge_fd 0

iface xenbr0 inet6 static
    address 2001:db8::10/64
    gateway 2001:db8::1

# Apply
ifdown xenbr0 && ifup xenbr0
```

## Configure IPv6 in XenServer (xe CLI)

```bash
# XenServer/Citrix Hypervisor xe CLI

# List PIFs (Physical Interface Devices)
xe pif-list

# Get PIF UUID for the management interface
PIF_UUID=$(xe pif-list device=eth0 --minimal)

# Check current IPv6 configuration
xe pif-param-list uuid=$PIF_UUID | grep -i ipv6

# Configure static IPv6 on a PIF
xe pif-reconfigure-ipv6 \
    uuid=$PIF_UUID \
    mode=static \
    IPv6=2001:db8::10/64 \
    gateway=2001:db8::1

# Enable DHCPv6/SLAAC
xe pif-reconfigure-ipv6 \
    uuid=$PIF_UUID \
    mode=autoconf      # SLAAC mode

# List all IPv6 configurations
xe pif-list params=uuid,device,IPv6
```

## Create a Xen domU VM with IPv6 (xl config)

```bash
# /etc/xen/myvm.cfg - xl VM configuration

name = "myvm"
memory = 2048
vcpus = 2

# Disk
disk = ['phy:/dev/vg0/myvm,xvda,w']

# Network: bridged to xenbr0 (will get IPv6 via SLAAC or static config in guest)
vif = ['bridge=xenbr0,mac=00:16:3e:aa:bb:cc']

kernel = "/boot/vmlinuz"
ramdisk = "/boot/initrd.img"
root = "/dev/xvda1"
extra = "console=hvc0"
```

```bash
# Create and start the VM
xl create /etc/xen/myvm.cfg

# Check VM is running
xl list

# Connect to the VM console
xl console myvm
```

## Configure IPv6 Inside Xen Guest (domU)

```bash
# Inside the domU guest (Linux)

# Check if SLAAC IPv6 was received from dom0 network
ip -6 addr show xen0
# or
ip -6 addr show eth0

# If no SLAAC: configure static IPv6
cat > /etc/netplan/01-ipv6.yaml << 'EOF'
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - 2001:db8::100/64
      routes:
        - to: "::/0"
          via: 2001:db8::1
      nameservers:
        addresses:
          - 2001:db8::53
EOF
netplan apply

# Verify
ping6 2001:db8::1
```

## XenAPI: Configure IPv6 via Python

```python
#!/usr/bin/env python3
# xen_ipv6_config.py

import XenAPI

# Connect to XenServer
session = XenAPI.Session("https://[2001:db8::10]")
session.login_with_password("root", "password", "1.0", "ipv6config")

try:
    # Get PIFs
    pifs = session.xenapi.PIF.get_all_records()

    for pif_ref, pif_record in pifs.items():
        if pif_record['device'] == 'eth0' and pif_record['VLAN'] == '-1':
            print(f"Configuring IPv6 on PIF: {pif_record['uuid']}")

            # Configure static IPv6
            session.xenapi.PIF.reconfigure_ipv6(
                pif_ref,
                "Static",          # mode
                "2001:db8::10/64", # IPv6/prefix
                "2001:db8::1",     # gateway
                ""                 # DNS (optional)
            )
            break
finally:
    session.logout()
```

## IPv6 for Xen Management Network

```bash
# XenServer: set management interface to IPv6
xe host-management-reconfigure pif-uuid=$PIF_UUID

# Check management IPv6
xe host-list params=address,name-label

# Test XenAPI over IPv6
curl -sk "https://[2001:db8::10]/api/" | head -5
```

## Enable IPv6 Forwarding in dom0

```bash
# Enable IPv6 forwarding in dom0 for routing between VM bridges
echo "net.ipv6.conf.all.forwarding = 1" >> /etc/sysctl.conf
sysctl -p

# For domU VMs that need to route traffic through dom0:
# Add ip6tables FORWARD rules
ip6tables -A FORWARD -i xenbr0 -o xenbr1 -j ACCEPT
ip6tables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT
```

## Conclusion

Xen hypervisor supports IPv6 through dom0's bridge interfaces (xenbr0) configured with `iface inet6 static` entries, which makes IPv6 available to all domU VMs bridged to that network. XenServer/Citrix Hypervisor provides xe CLI commands (`xe pif-reconfigure-ipv6`) and XenAPI for managing IPv6 on host interfaces. Guest domains configure IPv6 identically to bare-metal systems within their guest OS. Enable `net.ipv6.conf.all.forwarding=1` in dom0 for routing IPv6 between multiple Xen bridges. Router Advertisements from the physical network reach domU VMs through dom0 bridges when the bridge forwards L2 multicast traffic.
