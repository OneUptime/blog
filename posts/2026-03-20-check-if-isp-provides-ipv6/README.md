# How to Check If Your ISP Provides IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ISP, Connectivity Tests, Home Network, Consumer

Description: Multiple methods to check whether your Internet Service Provider supports IPv6, from web-based tests to command-line tools.

## Why It Matters

Before spending time configuring IPv6 on your home network, verify that your ISP actually provides IPv6 connectivity. Without native ISP support, your router cannot obtain native IPv6 connectivity from upstream regardless of settings.

## Method 1: Online Test (Easiest)

Visit `https://test-ipv6.com` from any device on your home network. The site will show:
- Whether your connection has IPv6 connectivity
- Your IPv4 and IPv6 addresses
- A score from 0/10 to 10/10

A score of 10/10 means the device has working end-to-end IPv6. 0/10 means the device has no usable IPv6 connectivity, which could be caused by the ISP, router, or local network.

Other useful test sites:
- `https://whatismyipv6.com`
- `https://ipv6-test.com`
- `https://ipv6.he.net/certification/`

## Method 2: Check Router WAN Status

Log into your router admin panel and look at the WAN status page and any IPv6 prefix delegation fields:

```text
Expected with IPv6:
  WAN IPv4: 203.0.113.45
  WAN IPv6: 2001:db8:1234:5678::1/64   ← Global IPv6 address (some ISPs show only fe80:: here)
  IPv6 Prefix: 2001:db8:1234::/56       ← Delegated prefix for LAN

Without usable native IPv6:
  WAN IPv4: 203.0.113.45
  WAN IPv6: fe80::1234/64               ← Link-local only
  IPv6 Prefix: (blank)                  ← No delegated prefix from ISP
```

## Method 3: Command Line Tests

### Windows

```powershell
# Check if you have a global IPv6 address (typically starts with 2 or 3)

ipconfig | Select-String "IPv6 Address"

# Test connectivity to a well-known IPv6 address
ping /6 ipv6.google.com

# DNS lookup to confirm the hostname has AAAA records
nslookup -type=AAAA ipv6.google.com
```

### macOS

```bash
# Check IPv6 addresses on your network interface
ifconfig en0 | grep inet6 | grep -v fe80

# Test IPv6 connectivity
ping6 -c 4 ipv6.google.com

# Check your external IPv6 address
curl -6 https://ipv6.icanhazip.com
```

### Linux

```bash
# List global IPv6 addresses
ip -6 addr show scope global

# Test connectivity
ping -6 -c 4 2001:4860:4860::8888

# Check IPv6 default route
ip -6 route show default

# DNS test for AAAA records
dig AAAA ipv6.google.com
```

## Method 4: ISP Website or Account Portal

Many ISPs list IPv6 support information:
- Check the ISP's website for IPv6 FAQs
- Log into your account portal to see if IPv6 is listed as a feature
- Call the ISP's support line and ask "Does my plan include IPv6?"

## Method 5: Check BGP Data

For technically inclined users, check if your ISP's ASN has IPv6 prefixes in the global routing table:

```bash
# Find your ISP's ASN from your IP
curl -s https://ipinfo.io/json | python3 -m json.tool | grep org

# Check their IPv6 routes in BGP
# Visit https://bgp.he.net/ and search for the ASN
```

## Understanding the Results

| Result | Meaning |
|--------|---------|
| Global IPv6 address on WAN, or a delegated IPv6 prefix | ISP provides IPv6 ✓ |
| Only fe80:: on WAN and no delegated prefix | Probably no native IPv6 from ISP |
| IPv6 address on router, not devices | Prefix delegation or LAN router advertisements not working |
| test-ipv6.com score < 10/10 | IPv6 setup is incomplete or broken somewhere along the path |

## What to Do If Your ISP Doesn't Provide IPv6

Options include:
- Request IPv6 from your ISP (many enable it on request)
- Use a free IPv6 tunnel broker like Hurricane Electric (he.net)
- Switch to an ISP that provides IPv6 natively

## Conclusion

Checking for IPv6 support is quick - `test-ipv6.com` shows whether a device on your network has working end-to-end IPv6 in seconds. If your router has IPv6 from the ISP but your devices don't have addresses, the issue is usually router or LAN configuration, covered in the other guides in this series.
