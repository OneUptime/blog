# How to Understand ICMPv6 Time Exceeded Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMPv6, Time Exceeded, Hop Limit, Traceroute, IPv6

Description: Understand ICMPv6 Time Exceeded messages (Type 3), when routers and hosts generate them, how traceroute6 uses them, and how to diagnose routing issues with Time Exceeded.

## Introduction

ICMPv6 Time Exceeded (Type 3) is generated in two situations: when a router decrements a packet's Hop Limit to zero (Code 0), or when a destination discards an incomplete packet because it did not receive enough fragments within the reassembly timer window (Code 1). Both codes serve diagnostic purposes - Code 0 is fundamental to how `traceroute6` works, while Code 1 signals reassembly failures.

## Time Exceeded Message Format

```text
ICMPv6 Time Exceeded (Type 3):

 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type = 3  |     Code      |          Checksum             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                             Unused                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|    As much of invoking packet as possible without the ICMPv6  |
+    packet exceeding 1280 bytes total                          +

Code 0: Hop limit exceeded in transit
  → Router decremented Hop Limit to 0
  → Packet dropped at this router
  → ICMPv6 sent from a unicast address chosen by the responding router

Code 1: Fragment reassembly time exceeded
  → Destination did not receive enough fragments within 60 seconds
    of the first-arriving fragment
  → Only sent if first fragment (offset=0) was received
  → ICMPv6 sent from destination host
```

## How traceroute6 Uses Time Exceeded

```text
traceroute6 algorithm:

1. Send probe packet (UDP to high port, or ICMPv6 Echo Request)
   with Hop Limit = 1
2. First router receives it, decrements to 0, sends Code 0 back
   → Source learns: first hop is <router_address>
3. Send probe with Hop Limit = 2
   → Second router decrements to 0, replies
   → Source learns: second hop is <router_address>
4. Continue incrementing Hop Limit until destination responds
   (with ICMPv6 Destination Unreachable Code 4 for UDP,
    or Echo Reply for ICMP mode)
5. Hop number in the output = Hop Limit that triggered the reply
```

## Using traceroute6

```bash
# Basic traceroute6 to a destination

traceroute6 2001:db8::1
# or
traceroute -6 2001:db8::1

# Use ICMP Echo mode (useful when UDP probes are filtered)
traceroute6 -I 2001:db8::1

# Specify number of probes per hop (default 3)
traceroute6 -q 1 2001:db8::1

# Increase probe timeout
traceroute6 -w 5 2001:db8::1

# Show AS numbers for each hop (requires access to routing databases)
traceroute6 -A 2001:db8::1

# Use mtr for continuous path monitoring
mtr -6 2001:db8::1

# tcpdump to watch Time Exceeded replies
sudo tcpdump -i eth0 -v "icmp6 and icmp6[icmp6type] == icmp6-timeexceeded"
```

## Diagnosing Routing Loops with Time Exceeded

```bash
# If traceroute6 shows the same IP appearing repeatedly: possible routing loop
# Example loop:
# 1  2001:db8::1 (router-a)
# 2  2001:db8::2 (router-b)
# 3  2001:db8::1 (router-a again - LOOP)
# 4  2001:db8::2 (router-b again)

# Detect possible loops: same address appearing multiple times
traceroute6 -n -q 1 2001:db8::1 2>&1 | \
    awk 'NR > 1 && $2 != "*" {print $2}' | sort | uniq -d

# If traceroute shows "*" entries: the router or return path is not
# returning a usable reply (filtered, rate-limited, or lost)
# ICMPv6 error messages are commonly rate-limited
```

## Code 1: Fragment Reassembly Timeout

```bash
# Fragment reassembly timeout (Code 1) is sent when:
# - Source sent a fragmented packet
# - The destination did not receive enough fragments to reassemble it
# - The 60-second timer from the first-arriving fragment expired

# Monitor for reassembly timeouts
sudo tcpdump -i eth0 -v \
    "icmp6 and icmp6[icmp6type] == icmp6-timeexceeded and icmp6[icmp6code] == 1"

# Check kernel reassembly failure statistics
cat /proc/net/snmp6 | grep -i reasm
# Ip6ReasmFails increasing → fragments being dropped or timed out

# If seeing many Code 1 messages: check for packet loss on the path
# Also confirm that fragmented IPv6 traffic (Fragment header = 44) is present
sudo tcpdump -i eth0 "ip6 protochain 44" -c 100 | wc -l
```

## Conclusion

ICMPv6 Time Exceeded is essential for two network functions: traceroute6 (Code 0, hop limit exhaustion) and reassembly failure diagnosis (Code 1, fragment timeout). Code 0 messages should not be blocked if `traceroute6` and similar diagnostic tools are expected to work reliably. Code 1 messages indicate fragment reassembly failures and should be monitored as a sign of fragmentation-related connectivity issues. When firewall rules block or heavily rate-limit Time Exceeded (Type 3) messages, traceroute output becomes incomplete and routing loop detection becomes much harder.
