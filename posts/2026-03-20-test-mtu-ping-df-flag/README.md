# How to Test MTU Size with Ping and the DF Flag

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTU, Ping, DF Flag, Linux, macOS, Window, Networking

Description: Test the maximum transmission unit by sending ping packets of varying sizes with the Don't Fragment bit set to discover the path MTU between hosts.

## Introduction

Testing MTU with ping is the simplest way to verify path MTU, diagnose fragmentation issues, and confirm that a network change didn't break large packet delivery. The technique works by sending IPv4 ICMP echo requests of increasing size with the Don't Fragment bit set. When a packet is too large for the path, it either triggers an ICMP error (which may include the actual MTU) or is silently dropped (possible MTU black hole).

## Linux ping MTU Test

```bash
# Syntax: ping -M do -s PAYLOAD_SIZE host

# -M do: set DF bit (Don't Fragment)
# -s PAYLOAD_SIZE: size of ICMP data payload (NOT including headers)

# Total packet size = payload + 8 (ICMP header) + 20 (IP header)
# For 1500 MTU Ethernet: max payload = 1500 - 28 = 1472 bytes

# Test standard Ethernet MTU (1500 bytes total):
ping -M do -s 1472 -c 3 10.20.0.5
# Expected success: 3 packets, 0% loss

# Test 1 byte above standard (should fail):
ping -M do -s 1473 -c 1 10.20.0.5
# Expected failure: "Frag needed and DF set (mtu = 1500)"
# The error shows the actual bottleneck MTU!
```

## Find Exact Path MTU (Binary Search)

```bash
#!/bin/bash
# Binary search for exact path MTU

DEST="${1:-10.20.0.5}"
LOW=1       # Min payload
HIGH=8973   # One byte above the max payload for 9000 MTU jumbo frames

while [ $((HIGH - LOW)) -gt 1 ]; do
    MID=$(( (LOW + HIGH) / 2 ))
    if ping -M do -s $MID -c 1 -W 2 $DEST > /dev/null 2>&1; then
        LOW=$MID
    else
        HIGH=$MID
    fi
done

echo "Path MTU: $((LOW + 28)) bytes"
echo "Maximum ICMP/UDP payload: ${LOW} bytes"
echo "Maximum TCP MSS: $((LOW + 28 - 40)) bytes"
```

## macOS ping MTU Test

```bash
# macOS uses different flags:
# -D: set DF bit (equivalent to -M do on Linux)
# -s: payload size (same as Linux)

# Test on macOS:
ping -D -s 1472 -c 3 10.20.0.5

# Common macOS error message when packet too large:
# ping: sendto: Message too long
# (macOS doesn't show the suggested MTU like Linux does)

# Find MTU on macOS by trying sizes:
for size in 1472 1400 1300 1200 1000; do
    if ping -D -s $size -c 1 -W 2000 10.20.0.5 > /dev/null 2>&1; then
        echo "Success at payload $size (MTU $((size + 28)))"
        break
    else
        echo "Failed at payload $size"
    fi
done
```

## Windows ping MTU Test

```powershell
# Windows ping for MTU test:
# /f: set DF bit
# /l: payload size

# Test standard MTU:
ping /f /l 1472 10.20.0.5

# Expected success output:
# Reply from 10.20.0.5: bytes=1472 time=1ms TTL=64

# Expected failure output:
# Packet needs to be fragmented but DF set.

# Find MTU:
$dest = "10.20.0.5"
for ($size = 1472; $size -ge 1; $size -= 1) {
    $result = ping /f /l $size /n 1 $dest 2>&1
    if ($result -match "bytes=$size") {
        Write-Host "Path MTU: $($size + 28)"
        break
    }
}
```

## MTU Tests for Specific Scenarios

```bash
# Test VPN tunnel MTU (WireGuard):
# wg-quick commonly subtracts 80 bytes from the underlay MTU
ping -M do -s 1340 -c 3 10.0.0.2  # Conservative test via a typical 1420 MTU WireGuard interface
# Test at the tunnel interface MTU minus IPv4/ICMP headers:
# 1420 MTU - 28 bytes overhead = 1392 max payload
ping -M do -s 1392 -c 3 10.0.0.2

# Test jumbo frame support on LAN:
ping -M do -s 8972 -c 3 10.20.0.5  # Payload for 9000 MTU
# If successful: jumbo frames are working on this path

# Test across a PPPoE link (1492 MTU):
ping -M do -s 1464 -c 3 remote.host  # 1492 - 28 = 1464

# Test for black hole (expect error but get timeout):
ping -M do -s 1473 -c 1 -W 5 10.20.0.5
# If no response at all (not even error): possible MTU black hole
# If error message received: PMTUD working correctly
```

## Automate MTU Verification

```bash
#!/bin/bash
# MTU verification for multiple hosts

HOSTS=("10.20.0.10" "10.20.0.11" "10.20.0.12" "vpn.example.com")
EXPECTED_MTU=1500  # Expected path MTU

echo "MTU Verification Results:"
echo "========================="

for host in "${HOSTS[@]}"; do
    # Test at expected MTU:
    EXPECTED_PAYLOAD=$((EXPECTED_MTU - 28))

    if ping -M do -s $EXPECTED_PAYLOAD -c 1 -W 2 $host > /dev/null 2>&1; then
        echo "OK: $host supports $EXPECTED_MTU MTU"
    else
        # Find a lower working MTU estimate:
        for payload in 1448 1400 1300 1200 1000 576; do
            if ping -M do -s $payload -c 1 -W 2 $host > /dev/null 2>&1; then
                echo "WARN: $host supports at least $((payload + 28)) MTU (expected $EXPECTED_MTU)"
                break
            fi
        done
    fi
done
```

## Conclusion

Ping with the DF bit is the universal IPv4 MTU test tool. On Linux, use `ping -M do -s SIZE`; on macOS `ping -D -s SIZE`; on Windows `ping /f /l SIZE`. For IPv4 without IP options, the payload size plus 28 bytes (IP + ICMP headers) equals the total packet size. When a packet fails with "Frag needed," Linux can show the bottleneck MTU in the error message. When oversized packets fail silently (no error) while smaller packets work, it may indicate an MTU black hole where ICMP messages are blocked. Use the binary search script to find exact path MTU efficiently.
