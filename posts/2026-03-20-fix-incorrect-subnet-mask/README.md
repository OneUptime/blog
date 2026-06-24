# How to Fix an Incorrect Subnet Mask Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Subnet Mask, IPv4, Linux, Window, Troubleshooting, CIDR

Description: Learn how to diagnose and fix incorrect subnet mask configurations on Linux and Windows that cause connectivity failures, wrong routing, and hosts being unreachable.

---

An incorrect subnet mask is a deceptively simple misconfiguration that can cause baffling connectivity problems. Hosts may be able to reach some IPs but not others, or routing may fail in unexpected ways. This guide covers diagnosis and correction of subnet mask issues.

---

## How Subnet Masks Affect Connectivity

The subnet mask tells a host which IP addresses are on the same local network vs. which must be reached via a gateway. A wrong mask causes:

| Scenario | Effect |
|----------|--------|
| Mask too narrow (e.g., /30 instead of /24) | Host thinks other local IPs are remote; routes via gateway unnecessarily |
| Mask too wide (e.g., /16 instead of /24) | Host thinks remote IPs are local; tries ARP instead of routing; connectivity fails |
| Wrong mask on gateway | Gateway misidentifies which destinations are directly connected; forwarding or return traffic may fail |

---

## Symptoms of Wrong Subnet Mask

- Can ping the gateway but not other hosts on the same LAN
- Can reach some hosts on the subnet but not others
- `No route to host` errors for addresses that should be local
- Routing table shows unexpected entries

---

## Checking Current Subnet Mask

### Linux

```bash
# Show IP addresses and masks

ip addr show

# Example output:
# inet 192.168.1.100/16 brd 192.168.255.255 scope global eth0
# (Should be /24 not /16!)

# Explicit IPv4/CIDR view
ip -4 addr show eth0

# Old-style ifconfig
ifconfig eth0
# inet addr:192.168.1.100  Bcast:192.168.255.255  Mask:255.255.0.0
```

### Windows

```powershell
# Show IP configuration with subnet mask
ipconfig /all

# PowerShell detailed view
Get-NetIPAddress -InterfaceAlias "Ethernet" -AddressFamily IPv4 | Select-Object IPAddress, PrefixLength

# Convert prefix length to mask:
# /24 = 255.255.255.0
# /16 = 255.255.0.0
# /8  = 255.0.0.0
```

---

## Fixing Subnet Mask on Linux

### Temporary Fix (ip command)

```bash
# Remove the incorrect address/mask
sudo ip addr del 192.168.1.100/16 dev eth0

# Add the correct address/mask
sudo ip addr add 192.168.1.100/24 dev eth0

# Update default route if gateway changed
sudo ip route replace default via 192.168.1.1 dev eth0
```

### Permanent Fix (systemd-networkd)

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
# Correct /24, not /16
Address=192.168.1.100/24
Gateway=192.168.1.1
DNS=8.8.8.8
```

```bash
sudo systemctl restart systemd-networkd
```

### Permanent Fix (NetworkManager)

```bash
# Show connections
nmcli connection show

# Fix the subnet mask
nmcli connection modify "Wired connection 1" \
    ipv4.method manual \
    ipv4.addresses "192.168.1.100/24" \
    ipv4.gateway "192.168.1.1"

nmcli connection up "Wired connection 1"
```

### Permanent Fix (/etc/network/interfaces)

```bash
# /etc/network/interfaces
auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
```

---

## Fixing Subnet Mask on Windows

### GUI Method

1. Open **Control Panel** → **Network and Sharing Center** → **Change adapter settings**
2. Right-click adapter → **Properties** → **IPv4** → **Properties**
3. Change **Subnet mask** from `255.255.0.0` to `255.255.255.0`
4. Click **OK**

### PowerShell Method

```powershell
# Get the current IPv4 configuration
Get-NetIPAddress -InterfaceAlias "Ethernet" -AddressFamily IPv4

# Remove incorrect configuration
Remove-NetIPAddress -InterfaceAlias "Ethernet" `
    -IPAddress "192.168.1.100" -Confirm:$false

# Add correct configuration
# 24 = /24 = 255.255.255.0
New-NetIPAddress -InterfaceAlias "Ethernet" `
    -IPAddress "192.168.1.100" `
    -PrefixLength 24 `
    -DefaultGateway "192.168.1.1"
```

### netsh Method

```cmd
netsh interface ipv4 set address name="Ethernet" source=static address=192.168.1.100 mask=255.255.255.0 gateway=192.168.1.1
```

---

## Verifying the Fix

```bash
# Linux - confirm correct mask
ip addr show eth0 | grep "inet "
# Should show: inet 192.168.1.100/24

# Test local connectivity
ping 192.168.1.200  # Another host on /24

# Test gateway
ping 192.168.1.1

# Test external
ping 8.8.8.8

# Check routing table
ip route show
# Should show: 192.168.1.0/24 dev eth0 proto kernel scope link
```

---

## Common Subnet Masks Reference

| CIDR | Netmask | # of Hosts |
|------|---------|-----------|
| /30 | 255.255.255.252 | 2 |
| /29 | 255.255.255.248 | 6 |
| /28 | 255.255.255.240 | 14 |
| /27 | 255.255.255.224 | 30 |
| /26 | 255.255.255.192 | 62 |
| /25 | 255.255.255.128 | 126 |
| /24 | 255.255.255.0   | 254 |
| /23 | 255.255.254.0   | 510 |
| /16 | 255.255.0.0     | 65,534 |

---

## Best Practices

1. **Use CIDR notation** (/24) rather than dotted-decimal masks - less error-prone
2. **Document all static IP assignments** with the correct mask in your IPAM
3. **Use DHCP** for client devices to eliminate manual mask errors
4. **Verify immediately after changes** with `ip addr show` and a ping test
5. **Check DHCP server config** if many hosts have wrong masks - fix at the source

---

## Conclusion

An incorrect subnet mask is easily fixed by removing the bad address and adding the correct one. On Linux, use `ip addr`, `systemd-networkd`, or NetworkManager. On Windows, use PowerShell or the GUI. Always verify with a ping after applying the fix.

---

*Monitor your network connectivity with [OneUptime](https://oneuptime.com) - real-time uptime monitoring.*
