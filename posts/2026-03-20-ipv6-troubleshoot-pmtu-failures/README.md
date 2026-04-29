# How to Troubleshoot IPv6 Path MTU Discovery Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Path MTU Discovery, Troubleshooting, ICMPv6, Black Hole

Description: Diagnose and fix IPv6 Path MTU Discovery failures, identify PMTU black holes, and restore connectivity when large packets are silently dropped.

## Introduction

PMTU black holes occur when ICMPv6 Packet Too Big messages are blocked somewhere in the path. The result is that small packets succeed (TCP SYN/ACK, DNS, short HTTP requests) while large transfers (HTTPS pages, file downloads, SSH sessions after authentication) hang or fail silently. This asymmetry is the signature symptom of a PMTU failure.

## Recognizing PMTU Failure Symptoms

```text
Classic PMTU black hole symptoms:

1. TCP connections establish successfully (SYN is small)
2. HTTPS page partially loads then hangs
3. SSH connects but becomes unresponsive after login
4. File downloads start at a few KB then stall
5. Large DNS responses (DNSSEC) fail; small ones succeed
6. Small ping -6 probes work; curl/wget hangs after sending HTTP request
7. Asymmetric failure: may only affect traffic in one direction

Key test: ping -6 -M do -s 1452 destination
  → Success: the path supports a 1500-byte IPv6 packet
  → "Message too long" or no reply: PMTU issue
```

## Diagnosing PMTU Issues

```bash
# Step 1: Verify the connection works with small packets

ping -6 -s 8 2001:db8::1   # 8-byte payload (tiny packet)
# Should succeed

# Step 2: Test with full-size packet
ping -6 -M do -s 1452 2001:db8::1  # 1500-byte IPv6 packet
# If this fails while small packets work: PMTU issue; if no PTB is returned, suspect a black hole

# Step 3: Check if ICMPv6 PTB messages are being received
sudo tcpdump -i eth0 -n "icmp6 and icmp6[icmp6type] == icmp6-packettoobig" -v
# Watch for: "packet too big" messages from intermediate routers

# Step 4: Check the route for an MTU limit
ip -6 route get 2001:db8::1
# If the output includes "mtu N", Linux is applying an MTU limit on the route to this destination

# Step 5: Tracepath to discover path MTUs along the route
tracepath -6 2001:db8::1
# Discovers the path MTU and often shows where the PMTU drops along the route

# Step 6: Use mtr for additional path analysis
mtr -6 --report 2001:db8::1
# Useful for latency/loss analysis; not PMTU-specific
```

## Identifying Where ICMPv6 Is Being Blocked

```bash
# Check local firewall rules for ICMPv6
sudo ip6tables -L -v -n | grep -E "icmpv6|icmp6"

# Check if PTB messages are generated but blocked outbound
sudo ip6tables -L OUTPUT -v -n | grep -E "icmpv6|icmp6|DROP|REJECT"

# Capture on all interfaces to see if PTB arrives but gets dropped
sudo tcpdump -i any -n "icmp6 and icmp6[icmp6type] == icmp6-packettoobig" 2>/dev/null

# Check nftables ruleset
sudo nft list ruleset | grep -A2 "icmpv6"

# Check firewalld (if used)
sudo firewall-cmd --list-all
# Inspect icmp-blocks and rich rules in the active zone
```

## Fixing PMTU Black Holes

The primary fix is to ensure ICMPv6 PTB messages are allowed through all firewalls:

```bash
# Fix 1: Allow ICMPv6 Packet Too Big at all firewall stages
sudo ip6tables -I INPUT 1 -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
sudo ip6tables -I OUTPUT 1 -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
sudo ip6tables -I FORWARD 1 -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT

# Fix 2: If fixing the firewall is not possible, clamp TCP MSS
# This helps TCP avoid advertising segments that exceed the path MTU
sudo ip6tables -t mangle -A FORWARD \
    -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --clamp-mss-to-pmtu

# Fix 3: Set a conservative MSS manually (for known tunnel overhead)
# Normal MSS: 1500-40-20 = 1440; tunnel may reduce to 1280-40-20 = 1220
sudo ip6tables -t mangle -A FORWARD \
    -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --set-mss 1220

# Fix 4: If on a VPN/tunnel, set the tunnel interface MTU appropriately
sudo ip link set tun0 mtu 1280
```

## Automated PMTU Failure Detection Script

```python
import subprocess

def test_pmtu(destination: str) -> dict:
    """
    Test for PMTU black holes to a destination.
    Returns assessment of PMTU health.
    """
    results = {}

    # Test small packet
    small = subprocess.run(
        ["ping", "-6", "-c", "3", "-s", "8", "-q", destination],
        capture_output=True, text=True
    )
    results["small_packet_ok"] = small.returncode == 0

    # Test full-size packet (no fragmentation)
    large = subprocess.run(
        ["ping", "-6", "-c", "3", "-M", "do", "-s", "1452", "-q", destination],
        capture_output=True, text=True
    )
    results["large_packet_ok"] = large.returncode == 0

    # Check for an MTU limit on the route
    route = subprocess.run(
        ["ip", "-6", "route", "get", destination],
        capture_output=True, text=True
    )
    results["route_mtu_limited"] = "mtu" in route.stdout

    # Diagnose
    if results["small_packet_ok"] and not results["large_packet_ok"]:
        if results["route_mtu_limited"]:
            results["diagnosis"] = "Path MTU below 1500 or route MTU already constrained"
            results["recommendation"] = "Adjust the sender MTU/MSS to fit the route's MTU limit"
        else:
            results["diagnosis"] = "PMTU black hole suspected"
            results["recommendation"] = "Allow ICMPv6 type 2 through firewalls and verify PTB messages reach the source host"
    elif results["small_packet_ok"] and results["large_packet_ok"]:
        results["diagnosis"] = "PMTU appears healthy"
        results["recommendation"] = "No action required"
    else:
        results["diagnosis"] = "Basic IPv6 connectivity problem"
        results["recommendation"] = "Check routing, filtering, and whether ICMPv6 Echo Request/Reply is permitted"

    return results

result = test_pmtu("2001:db8::1")
for key, value in result.items():
    print(f"{key}: {value}")
```

## Conclusion

IPv6 PMTU failures manifest as connections that work for small data but fail for large transfers. A common cause is ICMPv6 Packet Too Big messages being blocked or not delivered. The fix is to ensure ICMPv6 type 2 messages can reach the source host. When changing firewall rules is not feasible, TCP MSS clamping provides a TCP-only workaround that reduces advertised segment sizes. Start with `tracepath -6` - it discovers the path MTU and often shows where the PMTU drops along the route.
