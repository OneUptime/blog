# How to Understand IPv6 Fragment Overlap Prevention

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Fragmentation, Security, RFC 8200, Overlapping Fragments

Description: Understand how IPv6 prevents overlapping fragment attacks, why RFC 8200 mandates discarding overlapping fragments, and how this differs from IPv4 behavior.

## Introduction

IPv4 allowed overlapping fragments, which led to a class of attacks including the Teardrop attack and various intrusion detection evasion techniques. RFC 8200 closes this attack surface by requiring reassembly to be abandoned when fragments overlap, while also allowing exact duplicate fragments to be dropped separately as a special case. This rule is simple, unambiguous, and removes the ambiguity that made overlap-based attacks practical.

## Why Overlapping Fragments Were Dangerous

```text
IPv4 overlapping fragment attacks:

Teardrop attack (1997):
  Fragment 1: offset=0,  length=24 bytes  → bytes 0-23
  Fragment 2: offset=16, length=4 bytes   → bytes 16-19 (overlaps!)
  Result: Malformed packet at reassembly → kernel crash

IDS evasion (Ptacek & Newsham 1998):
  Fragment 1 (seen by IDS): "GET /safe"
  Fragment 2 (overlaps):    overwrite with "GET /attack"
  Result: IDS sees "GET /safe", host sees "GET /attack"

Tiny fragment attack:
  Attacker pushes TCP header fields into a non-zero-offset fragment
  Filter inspects only fragment 0 and misses the hidden fields
  Result: Firewall policy can be bypassed
```

## IPv6 RFC 8200 Overlap Rule

RFC 8200 Section 4.5 is explicit:

```text
RFC 8200 Section 4.5 reassembly rule:

"If any of the fragments being reassembled overlap with any other
fragments being reassembled for the same packet, reassembly of
that packet must be abandoned and all the fragments that have
been received for that packet must be discarded."

Additional rule:
  No ICMPv6 error is sent when fragments are discarded for overlap.
  Exact duplicate fragments may be dropped separately without killing reassembly.
  TCP typically retransmits; UDP applications see a dropped datagram unless they retry.
```

## Detecting Overlap Attempts

```bash
# Check for fragment overlap indicators in kernel logs (if the stack logs them)

sudo dmesg | grep -i "fragment\|overlap\|frag"

# Watch for reassembly failures (includes more than just overlap cases)
watch -n 1 'grep -i reasm /proc/net/snmp6'
# Ip6ReasmFails increasing rapidly may indicate malformed or overlapping fragments

# Capture packets that contain an IPv6 Fragment header anywhere in the header chain
sudo tcpdump -i eth0 -w /tmp/fragments.pcap "ip6 protochain 44"

# Analyze with tshark for overlapping fragments
tshark -r /tmp/fragments.pcap -Y "ipv6.fragment.overlap == 1"
# Wireshark/tshark detects and flags overlapping fragments
```

## Implementing Overlap Detection

```python
def check_fragment_overlap(fragments: list) -> bool:
    """
    Check if any fragments overlap.
    Each fragment is (offset_bytes, length_bytes).
    Returns True if overlap detected (reassembly must be abandoned).
    """
    # Build byte ranges for each fragment
    covered = []
    for offset, length in fragments:
        covered.append((offset, offset + length - 1))

    # Sort by start position
    covered.sort()

    # Check for overlaps
    for i in range(1, len(covered)):
        prev_end = covered[i-1][1]
        curr_start = covered[i][0]
        if curr_start <= prev_end:
            return True  # Overlap detected

    return False

# Test cases
fragments_ok = [(0, 1448), (1448, 552)]
fragments_overlap = [(0, 1448), (1400, 600)]  # Second starts within first

print(f"Normal fragments overlap: {check_fragment_overlap(fragments_ok)}")
print(f"Overlapping fragments: {check_fragment_overlap(fragments_overlap)}")

def reassemble_or_discard(src: str, dst: str, ident: int,
                          fragments: list) -> bytes | None:
    """
    Attempt reassembly; discard if overlap or incompleteness is detected.
    fragments: list of (offset, more_flag, data) tuples
    """
    frag_ranges = [(offset, len(data)) for offset, _, data in fragments]

    if check_fragment_overlap(frag_ranges):
        print(f"OVERLAP DETECTED for ({src}, {dst}, {ident:#x}): discarding all fragments")
        return None  # RFC 8200: silently discard

    # Sort and reassemble
    sorted_frags = sorted(fragments, key=lambda x: x[0])
    if not sorted_frags or sorted_frags[0][0] != 0 or sorted_frags[-1][1] != 0:
        return None  # Missing fragment 0 or final fragment

    expected_offset = 0
    for offset, more, data in sorted_frags:
        if offset != expected_offset:
            return None  # Gap detected
        expected_offset += len(data)

    result = bytearray(expected_offset)
    for offset, more, data in sorted_frags:
        result[offset:offset + len(data)] = data

    return bytes(result)
```

## Comparison: IPv4 vs IPv6 Overlap Handling

```text
IPv4 overlap handling (historically permitted):
  - RFC 791's example reassembly procedure accepts overlaps and uses the more recently arrived data
  - Later OSes and middleboxes used different strategies:
    - First-wins: Keep first received data for overlapping range
    - Last-wins: Overwrite with latest received data
    - Drop-on-overlap: Treat the packet as invalid
  - Result: IDS/firewall evasion was possible when devices disagreed

IPv6 overlap handling (RFC 8200, mandatory):
  - Non-duplicate overlap → abandon reassembly and discard received fragments
  - No ICMP error for this case; exact duplicates may be dropped separately
  - Overlap-based IDS/firewall evasion at reassembly is removed
  - Consistent baseline behavior across compliant implementations
  - Attack mitigation at the protocol level, not implementation level
```

## Conclusion

IPv6's overlap prevention rule is a clean security improvement over IPv4. By mandating silent discard of an overlapping fragment set, RFC 8200 removes the ambiguity that made these attacks practical. The rule is easy to implement correctly: compare fragment ranges before accepting any reassembled data, and abandon the packet on any non-duplicate overlap. In practice, legitimate senders do not create overlapping fragments, although exact duplicate fragments can still appear and may be handled as a special case.
