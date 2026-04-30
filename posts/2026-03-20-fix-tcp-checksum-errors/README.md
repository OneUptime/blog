# How to Fix TCP Checksum Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Checksum, Linux, Networking, Hardware, Offload

Description: Understand why TCP checksum errors appear in packet captures and how to distinguish hardware checksum offload artifacts from genuine checksum failures.

## Introduction

TCP checksum errors in packet captures are almost always false alarms caused by checksum offload - a performance feature where the NIC calculates checksums in hardware rather than the kernel. When you capture locally generated outbound packets, tcpdump sees them before the NIC finishes the checksum, so the field may appear zero, partial, or incorrect. True checksum errors from bit corruption are extremely rare on modern wired networks.

## How Checksum Offload Works

```text
Without offload (software checksum):
Kernel calculates checksum → places it in packet → NIC sends packet

With offload (hardware checksum):
Kernel leaves checksum empty or partially computed → NIC completes checksum → NIC sends packet

tcpdump captures locally generated outbound packets before the NIC completes the checksum
→ tcpdump may show "incorrect checksum" even though the sent packet is correct
```

## Distinguishing False from Real Errors

```bash
# Check if NIC has checksum offload enabled (common case - false errors)

ethtool -k eth0 | grep checksum
# tx-checksumming: on    ← TX offload = tcpdump will show fake errors
# rx-checksumming: on    ← RX offload = NIC/driver can validate incoming checksums

# If tx-checksumming is ON:
# Outbound packets captured by tcpdump will show incorrect checksum
# This is expected and NOT a real problem - the NIC corrects it
```

## Disabling Checksum Offload (for Accurate Captures)

```bash
# Temporarily disable TX checksum offload for accurate tcpdump analysis
ethtool -K eth0 tx off

# Now tcpdump will show correct checksums for outbound packets
# Capture your traffic
tcpdump -i eth0 -w /tmp/capture.pcap

# Re-enable offload after capture (offload improves performance significantly)
ethtool -K eth0 tx on
```

## Verifying with Wireshark

```text
# In Wireshark, recent releases may already disable TCP checksum validation by default.
# If checksum validation is enabled: Edit → Preferences → Protocols → TCP
# Uncheck: "Validate the TCP checksum if possible"
# This suppresses false checksum warnings from locally captured outbound packets

# To identify REAL checksum errors (hardware/bit corruption):
# 1. Disable TX offload
# 2. Capture traffic
# 3. Apply Wireshark filter: tcp.checksum.status == 0
# Non-zero count after disabling offload = real checksum error
```

## Real TCP Checksum Errors

Real checksum failures are caused by:

```bash
# 1. Hardware malfunction (NIC, DMA path, memory)
# Check interface hardware errors
ip -s link show eth0 | grep -A1 "RX:"
# Non-zero errors/drops suggest a hardware or link issue

# 2. Bit flips in memory
# Run memory test if checksum errors are frequent (if memtester is installed)
memtester 512M 1

# 3. Software bug in custom packet processing
# If you're writing raw socket code, verify checksum calculation

# 4. Misconfigured tunnel or overlay
# GRE tunnels may have checksum issues
# Check GRE tunnel checksum settings
ip -d link show type gre
# "csum" flag = checksums enabled on the GRE tunnel
```

## NIC Driver Configuration

```bash
# Some NICs have checksum offload bugs in certain driver versions
# Check NIC driver version
ethtool -i eth0 | grep -E "driver|version"

# Check if driver updates address checksum issues
# (consult vendor release notes)

# For containers/VMs: check if the hypervisor's virtual NIC supports offload
ethtool -k eth0 | grep "tx-checksumming"
# If using virtio-net: checksum offload is typically supported
```

## Conclusion

TCP checksum errors in packet captures are overwhelmingly false positives from hardware checksum offload. Before investigating further, disable TX offload and recapture - if errors disappear from Wireshark, you were seeing offload artifacts. If errors persist after disabling offload, investigate hardware (NIC, DMA path, memory) and software (custom packet processing, tunnel configuration). Real checksum errors on modern wired networks are extremely rare.
