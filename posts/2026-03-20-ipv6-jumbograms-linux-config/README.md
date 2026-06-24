# How to Configure IPv6 Jumbograms on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Jumbograms, Linux, Jumbo Frame, HPC Networking

Description: Configure Linux to send and receive IPv6 jumbograms, set jumbo frame MTU on high-performance interfaces, and verify jumbogram support in the kernel.

## Introduction

IPv6 jumbograms are distinct from ordinary Ethernet jumbo frames. RFC 2675 defines a jumbogram as an IPv6 packet with a payload larger than 65,535 octets, carried using a Hop-by-Hop Jumbo Payload option. In practice, Linux can use such packets only on links whose MTU exceeds 65,575 bytes end to end. A large MTU is necessary but not sufficient: the packet format and transport-layer behavior also need to follow RFC 2675. A 9,000-byte MTU is useful for jumbo frames, but it is still well below the threshold for a true IPv6 jumbogram.

## Setting MTU for Jumbo Frames and Jumbograms

```bash
# Check the current MTU
ip link show dev eth0

# On kernels that expose them, inspect min/max MTU as well
ip -d link show dev eth0

# Set MTU to 9000 bytes (ordinary jumbo-frame configuration)
sudo ip link set dev eth0 mtu 9000

# Verify the change
ip link show dev eth0 | grep mtu

# True RFC 2675 jumbograms require a link MTU greater than 65575 bytes.
# Only attempt this on hardware and links that explicitly support it.
sudo ip link set dev <iface> mtu 65576

# Check the IPv6 MTU the kernel is using for the interface
cat /proc/sys/net/ipv6/conf/eth0/mtu
```

## Linux Kernel Considerations

```bash
# Linux does not provide a separate "enable jumbograms" switch.
# Instead, verify the MTU values the kernel is using for the interface.
sysctl net.ipv6.conf.eth0.mtu

# TCP buffer sizes for large transfers
# Linux exposes these TCP settings under net.ipv4 even for IPv6 TCP.
cat /proc/sys/net/core/rmem_max
cat /proc/sys/net/core/wmem_max
cat /proc/sys/net/ipv4/tcp_rmem
cat /proc/sys/net/ipv4/tcp_wmem

# For high-performance large-MTU paths, increase socket buffers
sudo sysctl -w net.core.rmem_max=134217728   # 128 MB receive buffer
sudo sysctl -w net.core.wmem_max=134217728   # 128 MB send buffer
sudo sysctl -w net.ipv4.tcp_rmem="4096 87380 67108864"
sudo sysctl -w net.ipv4.tcp_wmem="4096 65536 67108864"
```

## Checking Jumbogram MTU Readiness with Python

```python
import re
import subprocess

JUMBOGRAM_MIN_LINK_MTU = 65576

def check_interface_supports_jumbograms(
    interface: str, min_link_mtu: int = JUMBOGRAM_MIN_LINK_MTU
) -> dict:
    """
    Check whether an interface meets the RFC 2675 link-MTU requirement.
    """
    result = subprocess.run(
        ["ip", "link", "show", "dev", interface],
        capture_output=True,
        text=True,
        check=True,
    )

    mtu_match = re.search(r"\bmtu (\d+)\b", result.stdout)
    if not mtu_match:
        raise RuntimeError(f"Could not determine MTU for {interface}")

    current_mtu = int(mtu_match.group(1))

    return {
        "interface": interface,
        "current_mtu": current_mtu,
        "min_link_mtu_for_jumbograms": min_link_mtu,
        "supports_jumbograms": current_mtu >= min_link_mtu,
        "recommendation": (
            "Set MTU above 65575 bytes for RFC 2675 jumbograms"
            if current_mtu < min_link_mtu
            else "Interface MTU meets the RFC 2675 threshold"
        ),
    }

# Check common interfaces
for iface in ["eth0", "lo"]:
    try:
        result = check_interface_supports_jumbograms(iface)
    except subprocess.CalledProcessError:
        print(f"{iface}: interface not present on this host")
        continue

    print(
        f"{result['interface']}: MTU={result['current_mtu']} - "
        f"{result['recommendation']}"
    )
```

## Performance Implications of Larger MTUs

```bash
# Baseline performance test with standard MTU (1500 bytes)
iperf3 -6 -c 2001:db8::1 -t 30 -P 4

# Performance test with 9000-byte jumbo frames
# First set both ends to MTU 9000
sudo ip link set dev eth0 mtu 9000
iperf3 -6 -c 2001:db8::1 -t 30 -P 4

# Compare CPU usage and throughput
# Larger MTUs can reduce per-packet overhead on supported links:
# - Fewer packets and interrupts per byte transferred
# - Less TCP/IP processing overhead per byte
# - Actual gains depend on workload, NIC offloads, and the end-to-end path
# iperf3 is useful for comparing standard MTU vs jumbo-frame MTU,
# but it does not by itself prove RFC 2675 jumbogram use.

# Check interrupt rate (lower is better with larger MTUs on the same workload)
watch -n 1 'cat /proc/interrupts | grep eth0'
```

## Persistent Jumbo Frame MTU Configuration

```bash
# Using systemd-networkd (/etc/systemd/network/10-eth0.network)
sudo tee /etc/systemd/network/10-eth0.network << 'EOF'
[Match]
Name=eth0

[Link]
MTUBytes=9000

[Network]
DHCP=yes
IPv6AcceptRA=yes
EOF

sudo systemctl restart systemd-networkd

# Using NetworkManager
nmcli connection modify "Wired connection 1" 802-3-ethernet.mtu 9000
nmcli connection up "Wired connection 1"

# Using /etc/network/interfaces (Debian)
# Add to eth0 stanza: mtu 9000
```

## Conclusion

Linux configuration for ordinary jumbo frames is mostly an MTU change. True IPv6 jumbograms are stricter: they require the RFC 2675 Jumbo Payload option, transport behavior that follows RFC 2675, and an end-to-end link MTU above 65,575 bytes. In practice, 9,000-byte Ethernet jumbo frames can improve bulk-transfer efficiency, but they are not jumbograms. When testing large-MTU paths, confirm the configured MTU on both ends and tune socket buffers as needed for the workload.
