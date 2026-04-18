# How to Understand UDP Checksum Calculation and Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UDP, Checksum, Networking, Protocol, Linux, Error Detection

Description: Understand how UDP checksum calculation works, when it can be disabled, and how to detect and handle UDP checksum errors.

## Introduction

The UDP checksum provides end-to-end error detection for UDP datagrams. It is optional in IPv4 (a zero checksum means "not computed") but mandatory in IPv6. The checksum covers the UDP header, payload, and a pseudo-header containing IP addresses - catching bit errors that occur anywhere from source to destination. Understanding when checksums matter and how Linux handles them is important for high-performance UDP applications.

## How UDP Checksum Works

```yaml
UDP checksum covers a "pseudo-header" + UDP header + data:

Pseudo-header:
+---------------+---------------+
| Source IP (4) | Dest IP (4)   |
+---------------+---------------+
| Zero (1)      | Proto (1=17)  | UDP Length (2) |
+---------------+---------------+

UDP header:
+---------------+---------------+
| Src Port (2)  | Dst Port (2)  |
+---------------+---------------+
| Length (2)    | Checksum (2)  |
+---------------+---------------+

Followed by UDP data.

Calculation: 16-bit one's complement sum of all 16-bit words.
Result stored in checksum field; receiver recalculates and compares.
Mismatch = bit error (packet discarded).
```

## Checksum Offloading

```bash
# Modern NICs compute UDP checksums in hardware (offloading)

# The kernel doesn't compute them; the NIC does just before transmission

# Check NIC checksum offload status:
ethtool -k eth0 | grep checksum
# tx-checksumming: on    (kernel tells NIC to compute TX checksums)
# rx-checksumming: on    (NIC validates RX checksums)

# Disable TX checksum offloading (compute in kernel, useful for debugging):
ethtool -K eth0 tx-checksumming off

# Re-enable:
ethtool -K eth0 tx-checksumming on

# Note: If you capture traffic on loopback (lo), checksums may be wrong
# because the kernel hasn't applied them yet (offloaded to NIC that loopback doesn't have)
tcpdump -i lo -n udp  # May show checksum errors - this is expected
```

## Detecting Checksum Errors

```bash
# Check for UDP checksum errors in kernel:
nstat | grep UdpInCsumErrors
# Or:
cat /proc/net/snmp | grep Udp
# UdpInCsumErrors counter

# In Wireshark:
# Filter: udp.checksum.status == "Bad"
# Or numerically: udp.checksum.status == 2

# In tcpdump (shows checksum validation):
tcpdump -i eth0 -n -v 'udp port 5000' 2>&1 | grep -i "cksum\|bad"

# Linux validates UDP checksums by default and drops packets with bad checksums.
# There is no sysctl to toggle validation; it is controlled per-socket (SO_NO_CHECK)
# or via the skb state set by the NIC/stack when checksum offload is used.
```

## Disabling UDP Checksum (Zero Checksum)

```bash
# In IPv4, setting UDP checksum to 0 means "checksum not computed"
# The receiver MUST accept such packets and skip validation
# Used in some performance-critical or embedded scenarios

# Python: send UDP with zero checksum
# This requires raw socket (root required):
import socket, struct

# Build IP + UDP packet manually with zero checksum:
# (Most applications should NOT do this - only for specific protocols)

# Check if packets with zero checksum are being received:
tcpdump -i eth0 -v 'udp' 2>&1 | grep 'cksum 0x0000'

# Note: Disabling checksums is appropriate only when:
# - Running over a trusted local network (e.g., internal cluster)
# - Higher-level protocol provides its own integrity check (e.g., DTLS)
# - Performance is critical and link errors are extremely rare
```

## UDP Checksum and NIC Segmentation Offload

```bash
# GSO (Generic Segmentation Offload) and GRO affect checksums:

# Check segmentation offload:
ethtool -k eth0 | grep -E "gso|gro|tso"

# With GSO: kernel passes large buffer to NIC, which splits into MTU-size packets
# and computes checksum for each fragment - never seen by tcpdump on host

# GRO: kernel reassembles incoming packets in software (NAPI poll) before
# passing them up the stack. LRO is the hardware NIC-based counterpart.
# Wireshark on the host may see "reassembled" packets larger than MTU

# This is why packet captures on the sending host can show oversized packets:
# They haven't been fragmented by the NIC yet
```

## Conclusion

UDP checksum provides the only built-in data integrity guarantee for UDP. It is computed over the payload plus IP addressing, ensuring end-to-end integrity. In Linux, checksum computation is offloaded to the NIC by default - visible in `ethtool -k`. Monitor `UdpInCsumErrors` in `nstat` to detect data corruption on your network path. Zero checksums (allowed in IPv4) should only be used when higher-level integrity checks exist. Never disable checksums on untrusted network paths or when data integrity matters.
