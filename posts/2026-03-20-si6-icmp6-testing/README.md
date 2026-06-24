# How to Use the SI6 Networks icmp6 Tool for ICMPv6 Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SI6 Networks, ICMP6, IPv6, ICMPv6, Security Testing, Network Testing

Description: A guide to using the SI6 Networks icmp6 tool to craft and send ICMPv6 messages for testing IPv6 network behavior and security controls in authorized environments.

The `icmp6` tool from the SI6 Networks IPv6 toolkit provides fine-grained control over ICMPv6 error-message packet construction. Unlike standard ping6, `icmp6` lets you set raw ICMPv6 Type:Code values and payload fields, making it useful for testing how hosts and firewalls respond to unreachable conditions, Packet Too Big messages, Time Exceeded messages, and Parameter Problem messages.

## Installing the SI6 Networks Toolkit

```bash
sudo apt-get install ipv6toolkit   # Debian/Ubuntu
# Arch Linux: install the ipv6toolkit AUR package or build from the SI6 Networks source tree
```

## Basic icmp6 Usage

```bash
# Send an ICMPv6 Destination Unreachable message

sudo icmp6 -i eth0 -d 2001:db8::10 -t 1:0

# -t TYPE:CODE = ICMPv6 type and code

# Send an ICMPv6 Time Exceeded message
sudo icmp6 -i eth0 -d 2001:db8::10 -t 3:0
```

## ICMPv6 Type Reference

| Type | Name | Use |
|---|---|---|
| 1 | Destination Unreachable | Error: host/port unreachable |
| 2 | Packet Too Big | PMTUD signaling |
| 3 | Time Exceeded | Hop limit exceeded (traceroute) |
| 4 | Parameter Problem | Malformed header |
| 128 | Echo Request | Ping |
| 129 | Echo Reply | Ping response |
| 133 | Router Solicitation | NDP: request RA |
| 134 | Router Advertisement | NDP: announce prefix |
| 135 | Neighbor Solicitation | NDP: address resolution |
| 136 | Neighbor Advertisement | NDP: address response |

## Testing Destination Unreachable Handling

```bash
# Send Destination Unreachable - No route to host (code 0)
sudo icmp6 -i eth0 \
  -s 2001:db8::1 \
  -d 2001:db8::10 \
  -t 1:0

# Send Destination Unreachable - Port unreachable (code 4)
sudo icmp6 -i eth0 \
  -s 2001:db8::20 \
  -d 2001:db8::30 \
  -t 1:4

# Send Destination Unreachable - Address unreachable (code 3)
sudo icmp6 -i eth0 -t 1:3 -d 2001:db8::10
```

## Testing Packet Too Big (PMTUD)

ICMPv6 Packet Too Big (Type 2) is critical for Path MTU Discovery:

```bash
# Send a Packet Too Big message announcing MTU 1280
sudo icmp6 -i eth0 \
  -s 2001:db8::1 \
  -d 2001:db8::40 \
  -t 2:0 \
  --mtu 1280

# Test if host correctly reduces packet size after receiving PTB
# Verify with: ip -6 route get 2001:db8::40
```

## Testing Time Exceeded (Traceroute Behavior)

```bash
# Send Time Exceeded - Hop limit exceeded (simulates router)
sudo icmp6 -i eth0 \
  -s 2001:db8::1 \
  -d 2001:db8::50 \
  -t 3:0    # code 0 = hop limit exceeded in transit
```

## Looping Tests

```bash
# Repeat ICMPv6 Destination Unreachable messages once per second (test rate limiting)
sudo icmp6 -i eth0 -d 2001:db8::10 -t 1:0 \
  --loop --sleep 1

# Run separate probes with different source addresses (test source-based rate limiting)
for src in 2001:db8:ffff::1 2001:db8:ffff::2 2001:db8:ffff::3; do
  sudo icmp6 -i eth0 -s "$src" -d 2001:db8::10 -t 1:0
done
```

## Testing Firewall ICMPv6 Rules

A properly configured IPv6 firewall must permit specific ICMPv6 types for basic connectivity:

```bash
# Test if Packet Too Big passes through firewall (required for PMTUD)
sudo icmp6 -i eth0 -s 2001:db8::1 -d 2001:db8::60 -t 2:0 --mtu 1280

# Test if Echo Request passes (for ping connectivity checks)
sudo icmp6 -i eth0 -d 2001:db8::10 -t 128:0 -n

# Test if Destination Unreachable passes (required for IPv6 error reporting)
sudo icmp6 -i eth0 -s 2001:db8::20 -d 2001:db8::30 -t 1:4
```

## Minimum Required ICMPv6 Types (RFC 4890)

| Type | Required | Reason |
|---|---|---|
| 1 (Dest. Unreachable) | Yes | Error reporting for unreachable destinations |
| 2 (Packet Too Big) | Yes | PMTUD (critical) |
| 3 code 0 (Time Exceeded) | Yes | Traceroute, loop detection |
| 4 codes 1/2 (Parameter Problem) | Yes | Unrecognized Next Header or IPv6 option handling |
| 128/129 (Echo) | Yes | Diagnostic and connectivity checking |
| 133-136 (NDP) | Yes on local links | Address autoconfiguration and neighbor discovery |

Never block ICMPv6 wholesale - it breaks IPv6 fundamental protocols. Use `icmp6` for error-message and raw Type:Code tests, and use the dedicated SI6 NDP tools for full NDP message testing.
