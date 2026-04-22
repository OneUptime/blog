# How to Use the SI6 Networks frag6 Tool for Fragmentation Attacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SI6 Networks, Frag6, IPv6, Fragmentation, Security Testing, IDS Evasion

Description: A guide to using the SI6 Networks frag6 tool to test IPv6 fragmentation handling, firewall evasion, and DoS vulnerabilities in authorized lab environments.

The `frag6` tool from the SI6 Networks IPv6 toolkit tests IPv6 fragmentation handling. Unlike IPv4, where routers can fragment packets, IPv6 fragmentation is performed only by the source host. The Fragment Extension Header is a known attack vector - fragmentation can be used to evade firewalls and IDS, trigger reassembly timeouts, and cause resource exhaustion. `frag6` enables testing these attack scenarios.

**Warning**: Only use in authorized lab environments with explicit written permission.

## Installing the SI6 Networks Toolkit

```bash
sudo apt-get install ipv6toolkit   # Debian/Ubuntu/Kali
# Arch Linux: install the AUR package named ipv6toolkit with your preferred AUR workflow
```

## IPv6 Fragmentation Basics

IPv6 uses a Fragment Extension Header (Next Header value 44) to carry fragmented packets. Each fragment includes:
- Fragment ID (32-bit, identifies which fragments belong together)
- Fragment Offset (13-bit, in 8-octet units relative to the fragmentable part)
- More Fragments (M) flag

## Basic frag6 Usage

```bash
# Send an IPv6 atomic fragment to a target

sudo frag6 -i eth0 -d 2001:db8::1 --frag-type atomic

# Send a first fragment at a specific payload size
sudo frag6 -i eth0 -d 2001:db8::1 --frag-type first --frag-size 64

# Assess reassembly behavior with overlapping-fragment tests
sudo frag6 -i eth0 -d 2001:db8::1 --frag-reass-policy -v

# Send a fragment without the timestamp payload used for timeout measurement
sudo frag6 -i eth0 -d 2001:db8::1 --frag-type middle --frag-size 104 --no-timestamp
```

## Tiny Fragment Attack

Small fragments can cause some firewalls to fail to inspect the upper-layer header:

```bash
# Send the smallest first-fragment ICMPv6 Echo probe frag6 can build
sudo frag6 -i eth0 -d 2001:db8::1 --frag-type first --frag-size 8

# For non-ICMPv6 traffic, first fragments that do not contain the entire
# header chain violate RFC 8200/RFC 7112 and should be dropped or rejected
```

## Overlapping Fragment Attack

Overlapping fragments used to cause ambiguity during reassembly. Modern IPv6 nodes must discard the whole datagram when overlaps are detected, and `frag6` can test whether the target follows that behavior:

```bash
# Run frag6's built-in overlapping-fragment reassembly policy tests
sudo frag6 -i eth0 -d 2001:db8::1 --frag-reass-policy -v
```

## Fragment ID Prediction and Collision

```bash
# Assess the target's Fragment ID generation policy
sudo frag6 -i eth0 -d 2001:db8::1 --frag-id-policy -v

# Set a specific Fragment ID
sudo frag6 -i eth0 -d 2001:db8::1 --frag-id 12345 --frag-type first --frag-size 104

# Send multiple fragments with the same ID but different byte offsets (fragment confusion)
sudo frag6 -i eth0 -d 2001:db8::1 --frag-id 12345 --frag-type first --frag-offset 0 --frag-size 104
sudo frag6 -i eth0 -d 2001:db8::1 --frag-id 12345 --frag-type middle --frag-offset 104 --frag-size 104
```

## Reassembly Timeout DoS

IPv6 hosts maintain a reassembly buffer for incomplete fragment sets. Sending first fragments without final fragments fills this buffer:

```bash
# Send first fragments only (M-bit set, no final fragment)
# Fills reassembly buffer until timeout (typically 60 seconds)
sudo frag6 -i eth0 -d 2001:db8::1 \
  --frag-type first \
  --flood-frags 100 \
  --loop \
  --sleep 5 \
  --no-responses
```

## Testing Firewall Fragment Inspection

```bash
# Test whether firewall passes first-fragmented ICMPv6 Echo Requests
sudo frag6 -i eth0 -d 2001:db8::1 --frag-type first --frag-size 16 -v

# Test whether firewall handles IPv6 atomic fragments
sudo frag6 -i eth0 -d 2001:db8::1 --frag-type atomic -v

# For fragmented TCP port-filter tests, use tcp6 rather than frag6
sudo tcp6 -i eth0 -d 2001:db8::1 --dst-port 443 --frag-hdr 8
```

## Defenses Against IPv6 Fragmentation Attacks

```bash
# On Linux: limit fragment reassembly time and memory
sysctl -w net.ipv6.ip6frag_time=30        # 30 second timeout (default 60)
sysctl -w net.ipv6.ip6frag_high_thresh=4194304  # 4MB reassembly memory threshold

# Block all fragmented IPv6 with ip6tables (if your app doesn't need it)
sudo ip6tables -A INPUT -m ipv6header --header frag --soft -j DROP

# Modern IPv6 stacks must discard overlapping fragments; enforce extension-header
# policy explicitly in your firewall for traffic your application does not need
```

| Attack Type | Defense |
|---|---|
| Tiny fragments | Enforce complete first-fragment header chain (RFC 7112/RFC 8200) |
| Overlapping fragments | RFC 5722/RFC 8200 - discard overlapping fragments |
| Reassembly DoS | Reduce frag timeout, limit memory |
| Header inspection evasion | Deep packet inspection with reassembly |

`frag6` testing is essential for validating that firewalls and IDS systems properly handle fragmented IPv6 traffic and that reassembly defenses are correctly configured.
