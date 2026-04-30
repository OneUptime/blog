# How to Fix Incorrect Subnet Mask Configuration Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Subnet Mask, CIDR, Misconfiguration, Troubleshooting, Network

Description: Learn how to detect and fix incorrect subnet mask configurations that cause devices to believe they're in different subnets, preventing communication even when hosts are on the same physical network.

## How Subnet Mask Errors Cause Problems

A subnet mask mismatch can make two devices on the same physical network think they're in different networks:

```text
Device A: IP 192.168.1.10, mask 255.255.255.128  → subnet 192.168.1.0/25
Device B: IP 192.168.1.200, mask 255.255.255.0   → subnet 192.168.1.0/24

Device A thinks B is remote (sends to gateway)
Device B thinks A is local (sends directly via ARP)
Result: asymmetric routing, no communication
```

## Step 1: Identify Misconfigured Devices

```bash
# Scan the local network to find active hosts

nmap -sn 192.168.1.0/24 -v

# On each device, check the mask
# Linux
ip addr show dev eth0

# Windows
ipconfig /all | findstr "Subnet Mask"
# Should show: 255.255.255.0 for a /24 network

# Cisco router/switch
show interfaces GigabitEthernet0/0
# Shows: Internet address is 192.168.1.1, subnet mask is 255.255.255.0
```

## Step 2: Diagnose the Communication Failure

```bash
# Test if two devices on same network can reach each other
ping 192.168.1.200

# Check ARP to see if hosts are resolving each other
ip neigh show dev eth0 | grep 192.168.1.200

# If ping fails but they're on same switch:
# 1. Check if the target resolves to a MAC address
# 2. If ARP resolves but ping fails: firewall issue is possible
# 3. If ARP doesn't resolve: traffic may be going to the gateway instead of direct

# Trace what happens to packets
ip route get 192.168.1.200
# Correct: shows "192.168.1.200 dev eth0 src 192.168.1.10" (direct)
# Wrong:   shows "192.168.1.200 via 192.168.1.1 dev eth0 src 192.168.1.10" (going through gateway)
```

## Step 3: Fix on Linux

```bash
# Temporary fix - set correct mask
sudo ip addr del 192.168.1.10/25 dev eth0    # Remove wrong mask
sudo ip addr add 192.168.1.10/24 dev eth0    # Add correct mask

# Verify
ip addr show dev eth0
ip route show
```

```yaml
# Permanent fix via netplan (/etc/netplan/01-netcfg.yaml)
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - 192.168.1.10/24    # Correct CIDR notation
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8]
```

```bash
# NetworkManager
nmcli con mod "Wired connection 1" ipv4.method manual ipv4.addresses "192.168.1.10/24" ipv4.gateway "192.168.1.1"
nmcli con up "Wired connection 1"
```

## Step 4: Fix on Windows

```powershell
# Check current config
Get-NetIPAddress -InterfaceAlias "Ethernet" -AddressFamily IPv4 | Select-Object IPAddress, PrefixLength

# Fix incorrect prefix length
# Remove bad address first
Remove-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress 192.168.1.10 -Confirm:$false

# Add with correct prefix length (24 = 255.255.255.0)
New-NetIPAddress -InterfaceAlias "Ethernet" `
    -IPAddress 192.168.1.10 `
    -PrefixLength 24 `
    -DefaultGateway 192.168.1.1
```

```cmd
REM netsh alternative
netsh interface ipv4 set address name="Ethernet" source=static address=192.168.1.10 mask=255.255.255.0 gateway=192.168.1.1 store=persistent
```

## Step 5: Fix on Cisco IOS

```text
Router# configure terminal
Router(config)# interface GigabitEthernet0/0
Router(config-if)# no ip address
Router(config-if)# ip address 192.168.1.1 255.255.255.0   ! /24 correct mask
Router(config-if)# no shutdown
Router(config-if)# end
Router# show interfaces GigabitEthernet0/0
Router# write memory
```

## Step 6: Audit All Devices for Mask Consistency

```python
#!/usr/bin/env python3
"""Audit subnet masks across devices"""
from ipaddress import ip_interface

expected_prefix = 24  # Expected /24 everywhere

devices = [
    ("router", "192.168.1.1/24"),
    ("server1", "192.168.1.50/24"),
    ("workstation", "192.168.1.10/25"),   # WRONG
    ("printer", "192.168.1.200/24"),
]

for name, addr_str in devices:
    iface = ip_interface(addr_str)
    if iface.network.prefixlen != expected_prefix:
        print(f"MISMATCH: {name} has /{iface.network.prefixlen}, expected /{expected_prefix}")
    else:
        print(f"OK: {name} {addr_str}")
```

## Conclusion

Subnet mask mismatches can cause two devices to see each other as being in different networks, even when physically adjacent. Diagnose with `ip route get [target-ip]` - if a host on the same LAN is being sent to the gateway instead of directly, the local mask is wrong. Fix on Linux with `ip addr del/add` or netplan, on Windows with `New-NetIPAddress -PrefixLength 24`, and on Cisco with `ip address X.X.X.X 255.255.255.0`. Audit all devices systematically to ensure consistent masks across the network.
