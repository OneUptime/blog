# Why Some Devices Get IPv6 and Others Don't

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SLAAC, DHCPv6, Troubleshooting, Home Network

Description: Diagnose why some devices on a home network receive IPv6 addresses while others do not, covering SLAAC timing, RA reception, OS configuration, and NIC-level issues.

## Common Causes of Inconsistent IPv6

```text
Device A: Has IPv6 ✓    Device B: No IPv6 ✗

Possible reasons:
1. Device B missed the Router Advertisement (timing)
2. Device B has IPv6 disabled in OS settings
3. Device B's NIC/driver does not support IPv6
4. Device B is on a different VLAN not receiving RA
5. Device B has privacy extensions disabled (shows no temporary addr)
6. Virtual machine with host-only network mode
7. VPN software blocking IPv6
8. Android does not support DHCPv6 stateful (IA_NA) on any version
```

## Diagnose the Problem Device

Check the device that is missing IPv6.

```bash
# Linux - check if IPv6 is disabled

sysctl net.ipv6.conf.all.disable_ipv6
sysctl net.ipv6.conf.eth0.disable_ipv6
# If result is 1, IPv6 is disabled - enable:
sysctl -w net.ipv6.conf.all.disable_ipv6=0
sysctl -w net.ipv6.conf.eth0.disable_ipv6=0

# Check if any global IPv6 address exists
ip -6 addr show | grep "scope global"

# Check if device receives Router Advertisements
sudo tcpdump -i eth0 -n 'icmp6 and ip6[40] == 134' -c 3

# Manually trigger Router Solicitation
sudo ndisc6 eth0
# or
sudo rdisc6 eth0

# Check kernel IPv6 log
dmesg | grep -i ipv6 | tail -20
```

## Windows - Check IPv6 Status

```powershell
# Check if IPv6 is enabled on adapter
Get-NetAdapter | Get-NetAdapterBinding -ComponentID ms_tcpip6

# Check IPv6 addresses
Get-NetIPAddress -AddressFamily IPv6

# Check if IPv6 stack is enabled globally
# Registry key: HKLM\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters
# DisabledComponents = 0 (all enabled), 0xFF (all disabled)
$reg = Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters"
$reg.DisabledComponents

# Re-enable IPv6 (run as Administrator)
Set-NetAdapterBinding -Name "Ethernet" -ComponentID ms_tcpip6 -Enabled $true

# Reset IPv6 stack
netsh int ipv6 reset
Restart-Computer
```

## macOS - Check IPv6 Status

```bash
# Check network interface IPv6
ifconfig en0 | grep "inet6"

# macOS system preference path
# System Settings → Network → [Interface] → Details → TCP/IP
# IPv6: should be "Automatic" (SLAAC) or "Link-local only"

# Re-enable if set to "Link-local only"
# CLI:
networksetup -setv6automatic Wi-Fi
# or
networksetup -setv6automatic Ethernet

# Manually trigger IPv6 SLAAC
sudo ifconfig en0 down && sudo ifconfig en0 up

# Check RA reception
ndp -r    # Show the default router list learned via Router Advertisements
```

## Android - IPv6 Limitations

```text
Android IPv6 behavior:
  - Android uses SLAAC for address assignment (not DHCPv6 stateful)
  - Android does not implement DHCPv6 IA_NA on any version (Google issue 36949085, marked Won't Fix)
  - If router uses DHCPv6 stateful (IA_NA) only, Android gets no IPv6
  - Fix: Enable SLAAC (stateless) on router in addition to (or instead of) DHCPv6

Android 14+: adds DHCPv6 Prefix Delegation (IA_PD) for tethering - not stateful IA_NA
All Android versions: require SLAAC for on-link address assignment

Router fix (OpenWrt example):
# radvd.conf - enable SLAAC in addition to DHCPv6
interface br-lan {
    AdvManagedFlag off;    # SLAAC preferred (M=0)
    AdvOtherConfigFlag on; # Stateless DHCPv6 for DNS only (O=1)
    prefix 2001:db8:home::/64 {
        AdvAutonomous on;  # SLAAC enabled
    };
};
```

## VPN Software Blocking IPv6

```bash
# Some VPNs (especially kill-switch mode) block IPv6 to prevent leaks

# Check if VPN is adding ip6tables rules
sudo ip6tables -L -n | grep -i "drop\|reject"

# Check if VPN forces IPv4 only
# OpenVPN: look for block-ipv6 or redirect-gateway ipv6
grep -r "block-ipv6\|redirect-gateway" /etc/openvpn/

# WireGuard - check if IPv6 DNS is set
wg showconf wg0 | grep "DNS"

# Temporary test: disconnect VPN and check if IPv6 appears
# If yes, VPN is blocking IPv6

# Fix for WireGuard - add IPv6 DNS and AllowedIPs
# [Peer]
# AllowedIPs = 0.0.0.0/0, ::/0    # Route all including IPv6
# DNS = 2606:4700:4700::1111
```

## Summary Diagnostic Script

```bash
#!/bin/bash
# diagnose-ipv6.sh - run on the problematic device

echo "=== IPv6 Diagnostic ==="

echo "1. IPv6 disabled?"
sysctl net.ipv6.conf.all.disable_ipv6 2>/dev/null

echo "2. Global addresses:"
ip -6 addr show | grep "scope global" || echo "   NONE"

echo "3. Link-local addresses (RA reception required):"
ip -6 addr show | grep "scope link" || echo "   NONE - serious issue"

echo "4. Default IPv6 route:"
ip -6 route show default || echo "   NONE"

echo "5. Ping gateway:"
gw=$(ip -6 route show default | awk '{print $3}' | head -1)
[ -n "$gw" ] && ping6 -c 2 "$gw" || echo "   No gateway"

echo "6. Ping internet:"
ping6 -c 2 2606:4700:4700::1111 || echo "   FAIL"
```

## Conclusion

Inconsistent IPv6 across home network devices is usually caused by one of: IPv6 disabled in OS settings, VPN software blocking IPv6, the router offering only DHCPv6 stateful (IA_NA) while the device (for example, any Android) supports only SLAAC, or the device missing the Router Advertisement during boot. The fix depends on the cause: enable IPv6 in OS settings, configure the router for both SLAAC and stateless DHCPv6 (M=0, O=1), or configure the VPN to allow IPv6 traffic. Always verify that the device has a link-local address first - if it does not, the NIC or driver has a fundamental problem with IPv6.
