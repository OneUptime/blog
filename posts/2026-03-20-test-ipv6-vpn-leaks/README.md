# How to Test for IPv6 VPN Leaks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, VPN, VPN Leaks, Privacy Testing, Security Testing, Network

Description: A guide to testing whether your VPN is leaking IPv6 traffic using command-line tools and online services, and interpreting the results.

Testing for IPv6 VPN leaks requires checking whether your actual IPv6 address is visible when connected to a VPN. A leak means IPv6 traffic is bypassing the tunnel. This guide covers systematic leak detection methods.

## Understanding What a Leak Looks Like

```text
Before VPN: Your real IPv6 = 2001:db8::1234
After VPN (no leak): IPv6 address = VPN server's IPv6 or no IPv6 response
After VPN (leak!): IPv6 address = 2001:db8::1234 (unchanged!)
```

## Step 1: Record Your IPv6 Address Before VPN

```bash
# Check your current IPv6 address (before connecting to VPN)

curl -s -6 https://ifconfig.co
# or
curl -s https://api6.ipify.org

# Save it for comparison
MY_IPV6=$(curl -s -6 https://ifconfig.co 2>/dev/null)
echo "My real IPv6: $MY_IPV6"
```

## Step 2: Connect to VPN

Connect using your VPN client, then proceed with tests.

## Step 3: Test IPv6 Address After VPN

```bash
# Test what IPv6 address external servers see
curl -s -6 https://ifconfig.co
curl -s https://api6.ipify.org
curl -s https://ipv6.icanhazip.com

# If any of these return your REAL IPv6 address → LEAK DETECTED
```

## Step 4: DNS Leak Testing

DNS queries can also leak over IPv6:

```bash
# Test which recursive resolver is being used
dig +short TXT whoami.ds.akahelp.net

# More thorough DNS resolver checks (Google, Quad9, Cloudflare)
for server in \
  2001:4860:4860::8888 \
  2620:fe::fe \
  2606:4700:4700::1111; do
  echo -n "DNS $server: "
  dig -6 +short TXT whoami.ipv6.akahelp.net @"$server" 2>/dev/null || echo "blocked"
done
```

## Automated Leak Test Script

```bash
#!/bin/bash
# ipv6-vpn-leak-test.sh

echo "=== IPv6 VPN Leak Test ==="
echo ""

# Test 1: Direct IPv6 connectivity
echo "[1] IPv6 External Address:"
ipv6_addr=$(curl -s --max-time 5 -6 https://ifconfig.co 2>/dev/null)
if [ -n "$ipv6_addr" ]; then
    echo "    IPv6 visible: $ipv6_addr"
    echo "    WARNING: Check if this is your VPN's IP or your real IP"
else
    echo "    No IPv6 connectivity (may be blocked or tunneled)"
fi

# Test 2: DNS resolver identity
echo ""
echo "[2] DNS Resolver Test:"
dns_result=$(dig +short TXT whoami.ds.akahelp.net 2>/dev/null)
if [ -n "$dns_result" ]; then
    echo "    Resolver visible: $dns_result"
    echo "    WARNING: Check if this resolver belongs to your VPN provider"
else
    echo "    DNS resolver identity unavailable"
fi

# Test 3: Traceroute to IPv6 host
echo ""
echo "[3] IPv6 Route:"
traceroute -6 -m 3 2001:4860:4860::8888 2>/dev/null | head -5

echo ""
echo "=== Test Complete ==="
echo "Compare IPv6 address above with your real IPv6 before VPN"
```

## Online Leak Test Services

Run these while connected to your VPN:

| Service | URL | Tests |
|---|---|---|
| IP Leak | https://ipleak.net | IPv4, IPv6, DNS |
| IPv6 Leak | https://ipv6leak.com | IPv6 specific |
| BrowserLeaks | https://browserleaks.com/webrtc | Browser WebRTC |
| DNS Leak Test | https://dnsleaktest.com | DNS over IPv6 |

## Interpreting Results

| Scenario | Result | Meaning |
|---|---|---|
| IPv6 address = VPN server's | PASS | IPv6 tunneled correctly |
| No IPv6 response | PASS | IPv6 blocked (acceptable) |
| IPv6 = your real address | FAIL | IPv6 is leaking |
| IPv4 = VPN, IPv6 = real | FAIL | Classic dual-stack leak |

## Testing VPN Kill Switch

```bash
# Test kill switch by simulating VPN disconnect
# 1. Connect VPN
# 2. Check IPv6 address (should be VPN's or blocked)
# 3. Manually bring down VPN interface
sudo ip link set tun0 down

# 4. Immediately test IPv6 address
curl -6 --max-time 2 https://ifconfig.co

# If kill switch works: no response (blocked)
# If kill switch fails: your real IPv6 is visible
```

Regular IPv6 leak testing should be part of any VPN deployment verification, especially after VPN software updates or network configuration changes.
