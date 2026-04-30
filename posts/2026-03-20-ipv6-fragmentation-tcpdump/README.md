# How to Analyze IPv6 Fragmentation with tcpdump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Fragmentation, tcpdump, Packet Analysis, Debugging

Description: Use tcpdump to capture and analyze IPv6 fragmented packets, identify fragment headers, trace reassembly sequences, and diagnose fragmentation-related issues.

## Introduction

tcpdump is the first tool to reach for when debugging IPv6 fragmentation issues. Its BPF filters can isolate fragmented traffic, and its verbose output mode decodes Fragment Header fields. Understanding how to filter for and read fragment information in tcpdump output is essential for diagnosing PMTU failures, packet drops, and reassembly issues.

## Filtering IPv6 Fragments in tcpdump

```bash
# Capture all IPv6 packets with a Fragment Header

# Use protochain so extension headers before Fragment are handled correctly
sudo tcpdump -i eth0 "ip6 protochain 44"

# If the Fragment Header immediately follows the IPv6 header,
# capture fragments with "More Fragments" flag set (not the last fragment)
# Fragment offset/flags are at bytes 42-43; More is the low bit
sudo tcpdump -i eth0 "ip6[6] == 44 and (ip6[42:2] & 0x1) == 1"

# If the Fragment Header immediately follows the IPv6 header,
# capture last fragments (More = 0, Offset != 0)
sudo tcpdump -i eth0 "ip6[6] == 44 and (ip6[42:2] & 0x1) == 0 and (ip6[42:2] & 0xfff8) != 0"

# Capture ICMPv6 Packet Too Big (type 2) when ICMPv6 follows the IPv6 header directly
sudo tcpdump -i eth0 "icmp6 and icmp6[icmp6type] == icmp6-packettoobig"

# Combine: capture fragments AND common Packet Too Big messages
sudo tcpdump -i eth0 "ip6 protochain 44 or (icmp6 and icmp6[icmp6type] == icmp6-packettoobig)"

# Save to file for Wireshark analysis
sudo tcpdump -i eth0 -w /tmp/fragments.pcap "ip6 protochain 44"
```

## Reading tcpdump Fragment Output

```bash
# Use -v for verbose output that shows extension header fields
sudo tcpdump -i eth0 -v "ip6 protochain 44"

# Example verbose output for a fragmented packet:
# 14:23:01.123456 IP6 (hlim 64, next-header Fragment (44) payload length: 1160) 2001:db8::1 > 2001:db8::2: frag (0x12345678:0|1152) 12345 > 12345: UDP, length 2000
# 14:23:01.123457 IP6 (hlim 64, next-header Fragment (44) payload length: 864) 2001:db8::1 > 2001:db8::2: frag (0x12345678:1152|856)

# Interpreting the output:
# 0x12345678        → Identification
# 0                 → Fragment offset in bytes (first fragment)
# 1152              → Fragmentable data carried in this fragment
# 1152              → Fragment offset in bytes (second fragment)
# 856               → Fragmentable data carried in this fragment

# Use -vv for even more detail
sudo tcpdump -i eth0 -vv "ip6 protochain 44" | head -50
```

## Tracing a Complete Fragmentation Sequence

```bash
# Capture all packets between two hosts and filter for fragments
sudo tcpdump -i eth0 -v \
    "host 2001:db8::1 and host 2001:db8::2 and ip6 protochain 44"

# Check if Packet Too Big messages precede the fragments
# (source learns the path MTU and may then send smaller packets or fragment at the source)
sudo tcpdump -i eth0 -v \
    "(host 2001:db8::1 or host 2001:db8::2) and \
     (ip6 protochain 44 or (icmp6 and icmp6[icmp6type] == icmp6-packettoobig))"

# Show timestamps with microsecond precision
sudo tcpdump -i eth0 --micro -tttt -v "ip6 protochain 44"

# Count captured fragments
sudo tcpdump -i eth0 -q -l "ip6 protochain 44" | \
    awk '{count++} END {print count " fragments captured"}'
```

## Analyzing Fragment Statistics

```bash
# Watch fragment capture progress in real time
sudo tcpdump -i eth0 -q -l "ip6 protochain 44" | \
    awk 'NR%100==0 {print NR " fragments seen"}'

# Check kernel fragment statistics
watch -n 1 'cat /proc/net/snmp6 | grep -E "Reasm|Frag"'
# Ip6ReasmReqds:    reassembly attempts
# Ip6ReasmOKs:      successful reassemblies
# Ip6ReasmFails:    failed reassemblies
# Ip6FragCreates:   fragments created by this host
# Ip6FragOKs:       successful fragmentations
# Ip6FragFails:     fragmentation failures

# Test with a large UDPv6 payload
# Depending on the path MTU and socket PMTU settings, this may fragment at the source
# or fail with EMSGSIZE instead of fragmenting
python3 -c "
import socket
s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
try:
    s.sendto(b'X' * 3000, ('2001:db8::1', 12345))
    print('sendto() completed')
except OSError as e:
    print(f'sendto() failed: {e}')
"
# Then capture on the sending interface to see whether the sender emits fragments
```

## Script to Parse Fragment Sequences

```python
import subprocess
import re
from collections import defaultdict

def analyze_fragments(interface: str = "eth0", count: int = 100) -> dict:
    """
    Capture and analyze IPv6 fragment sequences.
    Returns statistics on fragmentation activity.
    """
    try:
        result = subprocess.run(
            ["tcpdump", "-n", "-i", interface, "-v", "-c", str(count),
             "ip6 protochain 44"],
            capture_output=True, text=True, timeout=30
        )
        output = result.stdout
    except subprocess.TimeoutExpired as exc:
        output = exc.stdout or ""

    sequences = defaultdict(list)
    # Parse fragment lines: "frag (0xID:OFFSET|LENGTH)"
    pattern = r'frag \(0x([0-9a-fA-F]+):(\d+)\|(\d+)\)'
    for line in output.split('\n'):
        m = re.search(pattern, line)
        if m:
            ident, offset, length = m.group(1), int(m.group(2)), int(m.group(3))
            sequences[ident].append({"offset": offset, "length": length})

    stats = {
        "total_fragments": sum(len(v) for v in sequences.values()),
        "unique_sequences": len(sequences),
        "sequences": dict(sequences),
    }
    return stats

# Run analysis
# stats = analyze_fragments("eth0", 50)
# print(f"Captured {stats['total_fragments']} fragments in {stats['unique_sequences']} sequences")
```

## Conclusion

tcpdump's BPF filter `ip6 protochain 44` is the general selector for IPv6 fragmented packets; `ip6[6] == 44` is a fixed-offset shortcut when the Fragment Header immediately follows the base IPv6 header. Combined with `-v` for verbose output, it reveals each fragment's Identification value, offset, and carried fragment data length. When troubleshooting PMTU issues, always capture both Fragment Header packets and ICMPv6 Packet Too Big messages simultaneously to understand the full picture. On Linux, the kernel's `/proc/net/snmp6` counters provide aggregate statistics without needing to capture every packet.
