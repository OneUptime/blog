# How TCP Handles IPv6 Jumbograms with MSS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, TCP, Jumbograms, MSS, Maximum Segment Size

Description: Understand how TCP Maximum Segment Size interacts with IPv6 jumbograms, how TCP can send segments larger than 65495 bytes, and the practical limits of TCP over jumbogram paths.

## Introduction

TCP's Maximum Segment Size (MSS) is advertised during the SYN handshake and defines the maximum amount of TCP data each side is willing to receive in a segment. On standard IPv6 packets, MSS is capped at 65515 bytes by the 16-bit IPv6 Payload Length field, because the 65535-byte payload limit includes the TCP header but not the 40-byte IPv6 header. On jumbogram-capable paths where the link MTU exceeds 65575 bytes, TCP can send segments larger than 65535 bytes of application data by advertising an MSS of 65535, which RFC 2675 defines as "infinity" for IPv6 jumbograms.

## TCP MSS Standard Limits

```text
Standard TCP MSS calculation (no IPv6 extension headers):

IPv6 payload length limit: 65535 bytes (16-bit field)
  TCP header: minimum 20 bytes
  Maximum TCP data in one packet: 65535 - 20 = 65515 bytes

If a packet carries 12 bytes of TCP options:
  Advertised MSS is still 65515 bytes
  Actual TCP data in that packet: 65535 - 32 = 65503 bytes

IPv6 header is NOT counted in IPv6 Payload Length:
  So the TCP data limit is 65535 - TCP_header_size (not - 40)

In practice, standard Ethernet limits MSS to:
  1500 - 40 (IPv6) - 20 (TCP) = 1440 bytes
```

## TCP MSS with Jumbograms

```text
Jumbogram TCP MSS:

On a jumbogram path (link MTU > 65575):
  IPv6 Payload Length = 0 (jumbogram indicator)
  Actual length is carried in the Jumbo Payload Hop-by-Hop option (32 bits)
  Maximum TCP payload: up to ~4 GB theoretically

TCP sequence number space:
  TCP uses 32-bit byte sequence numbers
  A single jumbogram-sized segment still fits within that space
  SACK allows efficient handling of out-of-order segments
  RFC 2675 adds special handling for MSS and the Urgent Pointer

MSS negotiation for jumbograms:
  MSS is a 16-bit field in TCP options
  If interface MTU - 60 is >= 65535, advertise MSS = 65535
  A received MSS of 65535 means "infinity" for IPv6 jumbograms
  Actual send MSS is determined by Path MTU Discovery
```

## TCP Performance on Jumbogram Paths

```python
def estimate_tcp_performance(mtu: int, rtt_ms: float,
                              bandwidth_gbps: float) -> dict:
    """
    Estimate TCP throughput for a given MTU, RTT, and link bandwidth.
    Demonstrates the efficiency improvement of larger MTUs.
    """
    tcp_header = 20
    ipv6_header = 40

    # MSS: maximum TCP payload per segment
    mss = mtu - ipv6_header - tcp_header

    # Bandwidth-delay product (BDP) in bytes
    bdp_bytes = (bandwidth_gbps * 1e9 / 8) * (rtt_ms / 1000)

    # Number of segments needed to fill the BDP
    segments_to_fill_bdp = bdp_bytes / mss

    # Header overhead ratio
    header_bytes_per_segment = ipv6_header + tcp_header
    payload_bytes_per_segment = mss
    overhead_percent = (header_bytes_per_segment / mtu) * 100

    return {
        "mtu": mtu,
        "mss": mss,
        "rtt_ms": rtt_ms,
        "bandwidth_gbps": bandwidth_gbps,
        "bdp_bytes": int(bdp_bytes),
        "segments_to_fill_bdp": int(segments_to_fill_bdp),
        "header_overhead_percent": round(overhead_percent, 2),
    }

# Compare standard MTU vs jumbo frames vs maximum non-jumbogram IPv6 packet

scenarios = [
    (1500,  0.1, 10),   # Standard Ethernet, 0.1ms RTT, 10 Gbps
    (9000,  0.1, 10),   # Jumbo frames, 0.1ms RTT, 10 Gbps
    (65575, 0.1, 100),  # Maximum non-jumbogram IPv6 packet, 0.1ms RTT, 100 Gbps (HPC)
]

print(f"{'MTU':<8} {'MSS':<8} {'Overhead%':<12} {'Segments for BDP'}")
print("-" * 50)
for mtu, rtt, bw in scenarios:
    r = estimate_tcp_performance(mtu, rtt, bw)
    print(f"{r['mtu']:<8} {r['mss']:<8} {r['header_overhead_percent']:<12} {r['segments_to_fill_bdp']}")
```

## Configuring TCP for Large Segment Offload

```bash
# Large Segment Offload (LSO/TSO) allows the NIC to segment large TCP buffers
# This is related to but distinct from jumbograms

# Check TSO (TCP Segmentation Offload) status
ethtool -k eth0 | grep -i "tcp-segmentation-offload\|tso"

# Enable TSO (hardware splits large TCP segments into MTU-sized frames)
sudo ethtool -K eth0 tso on

# Check GSO (Generic Segmentation Offload)
ethtool -k eth0 | grep gso

# Enable/disable for testing
sudo ethtool -K eth0 gso off  # Test without GSO
sudo ethtool -K eth0 gso on   # Re-enable

# Check TCP congestion control (important for large BDP paths)
cat /proc/sys/net/ipv4/tcp_congestion_control
# Example: switch to BBR if it is available on the host
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr
```

## TCP Tuning for HPC Jumbogram Paths

```bash
# Increase TCP buffers for high-BDP paths with large MTU
# BDP = 100 Gbps × 1ms = 12.5 MB
sudo sysctl -w net.core.rmem_max=134217728
sudo sysctl -w net.core.wmem_max=134217728
sudo sysctl -w net.ipv4.tcp_rmem="4096 87380 67108864"
sudo sysctl -w net.ipv4.tcp_wmem="4096 65536 67108864"

# Enable TCP window scaling (required for BDP > 65535 bytes)
sudo sysctl -w net.ipv4.tcp_window_scaling=1

# Example: set congestion control to BBR if it is available on the host
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr

# After adding these settings to /etc/sysctl.conf, reload them
sudo sysctl -p
```

## Conclusion

TCP can operate over IPv6 jumbogram paths, but RFC 2675 defines special handling for the MSS option and Urgent Pointer to make that work correctly. The 16-bit MSS field does not wrap; instead, an advertised MSS of 65535 is treated as "infinity", and the actual send MSS is derived from Path MTU Discovery. The primary benefit in practice comes from jumbo frames (9000-byte MTU) rather than true jumbograms, as 9000-byte frames are readily available on modern data center hardware and reduce TCP/IP processing overhead significantly for bulk transfers.
