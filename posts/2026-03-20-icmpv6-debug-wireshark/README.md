# How to Debug ICMPv6 Issues with Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMPv6, Wireshark, Debugging, Packet Analysis, IPv6

Description: Use Wireshark display filters, protocol dissectors, and follow-stream analysis to debug ICMPv6 issues including NDP failures, PMTU problems, and unreachable destination errors.

## Introduction

Wireshark's ICMPv6 dissector provides rich decoding of all ICMPv6 message types, automatically decoding NDP options, fragment headers, and error message contents. Its display filter language allows precise targeting of specific ICMPv6 issues. This guide covers the most useful Wireshark techniques for diagnosing the most common ICMPv6 problems.

## Essential ICMPv6 Wireshark Filters

```text
# Show all ICMPv6 traffic

icmpv6

# Filter by message type
icmpv6.type == 2        # Packet Too Big
icmpv6.type == 1        # Destination Unreachable
icmpv6.type == 3        # Time Exceeded
icmpv6.type == 4        # Parameter Problem
icmpv6.type == 128      # Echo Request
icmpv6.type == 129      # Echo Reply
icmpv6.type == 133      # Router Solicitation
icmpv6.type == 134      # Router Advertisement
icmpv6.type == 135      # Neighbor Solicitation
icmpv6.type == 136      # Neighbor Advertisement

# Filter by code within a type
icmpv6.type == 1 and icmpv6.code == 4    # Port Unreachable
icmpv6.type == 1 and icmpv6.code == 1    # Admin Prohibited
icmpv6.type == 3 and icmpv6.code == 1    # Fragment Reassembly Timeout

# Filter by MTU value in Packet Too Big
icmpv6.type == 2 and icmpv6.mtu < 1280  # Unexpected sub-1280 MTU in PTB

# Filter NDP only
icmpv6.type >= 133 and icmpv6.type <= 137
```

## Diagnosing PMTU Black Holes

```text
Wireshark workflow for PMTU diagnosis:

1. Capture filter to get relevant traffic:
   Capture filter: host <server_ipv6>

2. Reproduce the problem (e.g., large HTTPS download that hangs)

3. Apply display filter: icmpv6.type == 2
   → If you see PTB: PMTUD is active; inspect the reported MTU and invoking packet
   → If you see NO PTB: either no PTB was generated or it did not reach your capture point

4. Check if PTB arrives at the source:
   Filter: icmpv6.type == 2 and ipv6.dst == <source_ipv6>
   → Present: source receives PTB, should update cache
   → Absent: PTB blocked before reaching source

5. Check what MTU is reported in PTB:
   In packet details: ICMPv6 → MTU field
   If MTU < 1280: treat it as suspicious or tunnel-related; IPv6 nodes must not reduce PMTU below 1280

6. Check PMTU cache update timing:
   After PTB, filter for packets to same destination
   Look for smaller packet sizes (should be <= PTB MTU)
   If still sending large packets: PMTU cache not being used
```

## Diagnosing NDP Failures

```text
Wireshark workflow for NDP (address resolution) diagnosis:

1. Filter for NDP: icmpv6.type >= 133 and icmpv6.type <= 136

2. Check NS/NA pair (address resolution):
   Filter: icmpv6.type == 135 or icmpv6.type == 136
   Look for:
   - NS (Type 135) to solicit an address
   - NA (Type 136) as the corresponding reply
   If NS is retransmitted without a corresponding NA: address resolution is failing or filtered

3. Check for duplicate address detection (DAD):
   Filter: icmpv6.nd.ns.target_address == <address_being_configured> and ipv6.src == ::
   NS from :: (unspecified) to solicited-node multicast = DAD probe
   If NA reply: address conflict detected

4. Check RA for default gateway and prefix:
   Filter: icmpv6.type == 134
   In packet details: look for:
   - Prefix Information option (for SLAAC)
   - Router Lifetime > 0 (usable default router)
```

## Reading ICMPv6 Error Messages in Wireshark

```bash
# Save captures with enough context for analysis
sudo tcpdump -i eth0 -s 0 -w /tmp/icmpv6-debug.pcap \
    "icmp6 or (ip6 and host <server_ipv6> and tcp)"

# Open in Wireshark
wireshark /tmp/icmpv6-debug.pcap &

# Or analyze with tshark for scripted processing
tshark -r /tmp/icmpv6-debug.pcap -Y "icmpv6" \
    -T fields \
    -e frame.number \
    -e frame.time \
    -e ipv6.src \
    -e ipv6.dst \
    -e icmpv6.type \
    -e icmpv6.code \
    -e icmpv6.mtu \
    -E header=y

# Extract the embedded IPv6 destination from ICMPv6 error packets
tshark -r /tmp/icmpv6-debug.pcap -Y "icmpv6.type <= 4" \
    -T fields \
    -e icmpv6.type \
    -e ipv6.dst#2  # Invoking packet destination, when a second IPv6 layer is present
```

## Wireshark Statistics for ICMPv6

```text
Using Wireshark statistics for ICMPv6 analysis:

Statistics → Protocol Hierarchy:
  Shows how much traffic is ICMPv6 relative to the whole capture
  Useful for detecting abnormally high NDP or ping volumes

Statistics → Conversations → IPv6:
  With an icmpv6 display filter applied, shows which IPv6 pairs are exchanging ICMPv6
  Large volumes from unexpected sources → potential attack or misconfiguration

Statistics → IO Graph:
  Add filters: icmpv6.type==134 (RA), icmpv6.type==2 (PTB)
  Plot over time to see burst patterns
  Unexpected RA bursts → rogue RA or router misconfiguration
  PTB spikes → PMTU events (expected during path MTU learning)

Statistics → Flow Graph:
  Set Flow type = ICMPv6
  Useful for visualizing Echo Request/Reply or NS/NA exchanges over time
```

## Conclusion

Wireshark's ICMPv6 display filters and dissectors provide precise visibility into every aspect of IPv6 control plane traffic. For PMTU debugging, filter for `icmpv6.type == 2` and check the MTU field value. For NDP debugging, filter for types 133-136 and look for NS without corresponding NA. For error analysis, filter on `icmpv6.type <= 4` to see all error messages and their Code values. The tshark command-line interface enables scripted analysis when processing large captures or automating diagnostic workflows.
