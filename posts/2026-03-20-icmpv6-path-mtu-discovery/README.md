# How ICMPv6 Enables Path MTU Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMPv6, Path MTU Discovery, PMTUD, IPv6, RFC 8201

Description: Understand how ICMPv6 Packet Too Big messages drive IPv6 Path MTU Discovery, the complete PMTUD feedback loop, and how to monitor and debug PMTUD using ICMPv6.

## Introduction

IPv6 Path MTU Discovery (RFC 8201) relies entirely on ICMPv6 Packet Too Big messages. When a router cannot forward a packet because it exceeds the next-link MTU, it discards the packet and sends a Packet Too Big message to the source. The source uses this to update its PMTU cache and resend at the correct size. Without ICMPv6 Packet Too Big, connections sending packets above the actual path MTU can black-hole when they cross a reduced-MTU link.

## PMTUD Using ICMPv6: The Complete Flow

```mermaid
sequenceDiagram
    participant S as Source Host
    participant R1 as Router 1 (MTU=1500)
    participant R2 as Router 2 (MTU=1280)
    participant D as Destination

    Note over S: Initial PMTU = local interface MTU (1500)
    S->>R1: IPv6 packet (1500 bytes)
    R1->>R2: Forward (1500 bytes)
    Note over R2: Link MTU=1280, cannot forward
    R2-->>S: ICMPv6 Type 2, MTU=1280
    Note over R2: Original packet dropped
    Note over S: Update PMTU cache: D → 1280
    S->>R1: Re-send (1280 bytes)
    R1->>R2: Forward (1280 bytes)
    R2->>D: Deliver (1280 bytes)
    Note over S: Cache ages after 10 min → may probe for a larger PMTU
```

## PMTU Cache Mechanics

```bash
# View the PMTU cache (kernel maintains per-destination MTU values)

ip -6 route show cache

# Example output:
# 2001:db8::1 from :: via fe80::1 dev eth0 src 2001:db8::100
#    cache  expires 590sec mtu 1280

# On Linux, the default PMTU cache timeout is 10 minutes:
cat /proc/sys/net/ipv6/route/mtu_expires
# Default: 600 (seconds)

# After expiry, a later packet can probe for a larger PMTU again
# If path MTU increased: success, cache can grow
# If path MTU is unchanged: another PTB refreshes the cached PMTU

# Force PMTU rediscovery for all destinations
sudo ip -6 route flush cache
```

## Monitoring PMTUD with tcpdump

```bash
# Watch for Packet Too Big messages arriving at this host
# These indicate PMTUD is active and reducing MTU
sudo tcpdump -i eth0 -v \
    "icmp6 and icmp6[icmp6type] == icmp6-packettoobig"

# Watch for all PMTUD-related traffic simultaneously
sudo tcpdump -i eth0 -v \
    "(icmp6 and icmp6[icmp6type] == icmp6-packettoobig) or (ip6[6] == 44)"
# icmp6-packettoobig = PTB messages, ip6[6]==44 = Fragment Header

# Trace PMTUD for a specific destination
sudo tcpdump -i eth0 -v \
    "host 2001:db8::1 and icmp6 and \
     icmp6[icmp6type] == icmp6-packettoobig"

# Check PMTU statistics from kernel
cat /proc/net/snmp6 | grep -E "Pmtu|TooBig|Reasm"
# Icmp6InPktTooBigs: Number of ICMPv6 PTB messages received
```

## Simulating PMTUD

```python
import subprocess
def simulate_pmtud(destination: str, start_mtu: int = 1500,
                   min_mtu: int = 1280) -> list:
    """
    Simulate PMTUD by probing with decreasing packet sizes.
    Uses ping -6 -M probe to bypass cached PMTU checks while probing.
    Returns list of MTU probes and results.
    """
    results = []
    probe_mtu = start_mtu

    while probe_mtu >= min_mtu:
        # Data size = probe_mtu - 40 (IPv6) - 8 (ICMPv6)
        data_size = probe_mtu - 48

        proc = subprocess.run(
            ["ping", "-6", "-c", "1", "-M", "probe", "-s", str(data_size),
             "-W", "2", destination],
            capture_output=True, text=True
        )

        output = f"{proc.stdout}\n{proc.stderr}".lower()
        success = proc.returncode == 0
        results.append({
            "probe_mtu": probe_mtu,
            "data_size": data_size,
            "success": success,
        })

        if success:
            print(f"✓ MTU {probe_mtu} bytes: WORKS (path MTU ≥ {probe_mtu})")
            break
        else:
            # Check if it's a PTB error vs timeout
            if "message too long" in output or "mtu:" in output or "mtu=" in output:
                print(f"✗ MTU {probe_mtu} bytes: TOO LARGE (PTB received)")
                # Reduce and retry
                probe_mtu -= 8
            else:
                print(f"? MTU {probe_mtu} bytes: timeout (firewall blocking PTB?)")
                break

    return results

# Example PMTUD simulation
# results = simulate_pmtud("2001:db8::1")
```

## Common PMTUD Failure Patterns

```text
Pattern 1: PTB is blocked by firewall
  Symptom: Large packets fail, small succeed, no PTB in tcpdump
  Fix:     Allow ICMPv6 Type 2 at the blocking firewall

Pattern 2: PTB is rate-limited
  Symptom: Occasional large-packet failures that self-recover
  Fix:     Tune ICMPv6 error-message rate limits so PTB is not suppressed too aggressively

Pattern 3: PTB is delivered but cache expires too fast
  Symptom: Periodic large-packet failures every N minutes
  Fix:     Increase mtu_expires sysctl; check if path MTU is stable

Pattern 4: PTB contains wrong MTU value
  Symptom: Source reduces to wrong size, still fails
  Fix:     Debug the intermediate router's MTU reporting
```

## Conclusion

ICMPv6 Packet Too Big is the single mechanism that makes IPv6 PMTUD work. Without it, connections sending packets larger than the actual path MTU can fail silently on reduced-MTU paths. The kernel's PMTU cache (visible via `ip -6 route show cache`) stores per-destination learned MTU values; on Linux, the default timeout is 10 minutes. Monitoring for ICMPv6 Type 2 messages with tcpdump is the first diagnostic step when large-data connectivity issues arise. The kernel's `Icmp6InPktTooBigs` counter provides aggregate statistics on PTB activity.
