# How to Test Your Home Network IPv6 Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Home Network, Testing, Connectivity, Troubleshooting

Description: Test IPv6 connectivity at every layer of your home network, from the router WAN connection to individual devices and web services.

## Testing Strategy

Good IPv6 testing covers all layers:
1. ISP/WAN connectivity
2. Router prefix delegation
3. LAN device address assignment
4. DNS resolution over IPv6
5. Application connectivity

## Layer 1: WAN IPv6 from ISP

Test from the router itself (or log into router admin):

```text
Router admin panel → Status → WAN
Check: IPv6 Address or Delegated Prefix is populated (global addresses are currently in 2000::/3)
Check: IPv6 Gateway or Default Route is populated (a fe80:: link-local gateway is normal)
```

If the router has SSH access:

```bash
# On OpenWrt: check WAN IPv6

ifstatus wan6
ip -6 route show default
```

## Layer 2: Prefix Delegation to LAN

Verify the router distributed a prefix to LAN devices:

```bash
# On OpenWrt router: check delegated prefix and LAN address
ifstatus wan6 | grep -A 6 "ipv6-prefix"
ip -6 addr show dev br-lan | grep "scope global"

# Example format: 2001:db8:1234:abcd::1/64
# This means the /64 was derived from the prefix delegated by ISP
```

## Layer 3: Device IPv6 Addresses

Check that individual devices received global IPv6 addresses:

### Windows
```powershell
# Show all IPv6 addresses
Get-NetIPAddress -AddressFamily IPv6 | Where-Object {$_.PrefixOrigin -ne "WellKnown"}

# Or with ipconfig
ipconfig | Select-String -Pattern "IPv6 Address|Temporary IPv6"
```

### macOS
```bash
# Show currently allocated global IPv6 addresses
ifconfig | grep "inet6 " | grep -E "inet6 [23]"
```

### Linux
```bash
ip -6 addr show scope global
```

Expected: a global unicast address in `2000::/3`. Documentation examples often use `2001:db8::/32`, but your real prefix will be different.

## Layer 4: IPv6 DNS Resolution

Test that your DNS resolver handles IPv6 queries:

```bash
# Test AAAA record lookup
nslookup -type=AAAA ipv6.google.com
# or
dig AAAA ipv6.google.com

# Expected: returns a global IPv6 address

# Test that DNS server is reachable over IPv6
dig -6 AAAA google.com @2001:4860:4860::8888
```

## Layer 5: Application Connectivity

Test actual web browsing over IPv6:

```bash
# curl with forced IPv6
curl -6 -v https://ipv6.google.com 2>&1 | head -20

# Check your visible IPv6 address
curl -6 https://ipv6.icanhazip.com

# Test a site that has IPv6 (should show AAAA record used)
curl -6 https://www.cloudflare.com -w "\nConnect time: %{time_connect}s\n"
```

## Comprehensive Test: test-ipv6.com

The most complete automated test is at `https://test-ipv6.com`. It checks:
- IPv4 reachability
- IPv6 reachability
- Dual-stack reachability and fallback behavior
- Large packet IPv6 (PMTUD)
- ISP DNS resolver IPv6 capability

A 10/10 score means excellent IPv6 deployment.

## Testing from Multiple Devices

IPv6 connectivity can vary per device:

```bash
# Quick one-liner test from any device
# Works on Mac, Linux, WSL
curl -6 -s -o /dev/null -w "IPv6: %{http_code}\n" https://ipv6.google.com || echo "IPv6: FAILED"
curl -4 -s -o /dev/null -w "IPv4: %{http_code}\n" https://google.com
```

## Expected Results Summary

| Test | Expected Pass |
|------|-------------|
| Router has WAN IPv6/default route | Global IPv6 address or delegated prefix plus default route |
| Devices have global IPv6 | Same prefix as router LAN |
| DNS AAAA queries work | AAAA records returned |
| Ping ipv6.google.com | 0% packet loss |
| test-ipv6.com score | 10/10 |

## Conclusion

Comprehensive IPv6 testing covers the full stack from ISP WAN through LAN prefix delegation to device address assignment and application connectivity. Using both the automated `test-ipv6.com` tool and manual command-line tests gives confidence that IPv6 is fully functional across your home network.
