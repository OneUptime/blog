# How to Capture Live IPv4 Packets Using PyShark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, PyShark, IPv4, Packet Capture, Wireshark, Networking

Description: Learn how to capture live IPv4 network packets using PyShark, Python's wrapper around TShark (the CLI version of Wireshark).

## What Is PyShark?

PyShark is a Python wrapper for TShark (the command-line Wireshark). It provides rich protocol dissection using Wireshark's dissection engine.

## Installation

```bash
pip install pyshark

# TShark must be installed on your system

# Ubuntu/Debian:
sudo apt-get install tshark

# macOS:
brew install wireshark
```

## Basic Live Capture

```python
import pyshark

# Capture 20 IPv4 packets on a chosen interface
cap = pyshark.LiveCapture(interface="your_capture_interface", display_filter="ip")

print("Capturing packets... (press Ctrl+C to stop)")

for packet in cap.sniff_continuously(packet_count=20):
    if hasattr(packet, "ip"):
        print(
            f"{packet.sniff_time}  "
            f"{packet.ip.src:>16} -> {packet.ip.dst:<16}  "
            f"proto={packet.ip.proto}  "
            f"len={packet.ip.len}"
        )
```

## Filtering by Protocol

```python
import pyshark

# Capture only TCP traffic on ports 80 and 443
cap = pyshark.LiveCapture(
    interface="your_capture_interface",
    display_filter="ip and (tcp.port == 80 or tcp.port == 443)"
)

for packet in cap.sniff_continuously(packet_count=30):
    if "TCP" in packet:
        tcp = packet.tcp
        ip = packet.ip
        flags = tcp.flags_str if hasattr(tcp, "flags_str") else ""
        print(f"{ip.src}:{tcp.srcport} -> {ip.dst}:{tcp.dstport} [{flags}]")
```

## Accessing IPv4 Packet Fields

```python
import pyshark

cap = pyshark.LiveCapture(interface="your_capture_interface", display_filter="ip")
cap.sniff(packet_count=10)

for packet in cap:
    if not hasattr(packet, "ip"):
        continue

    ip = packet.ip
    print(f"\nPacket #{packet.number}")
    print(f"  Source IP:       {ip.src}")
    print(f"  Destination IP:  {ip.dst}")
    print(f"  TTL:             {ip.ttl}")
    print(f"  Protocol:        {ip.proto}")
    print(f"  Length:          {ip.len}")
    print(f"  Header Checksum: {ip.checksum}")
    print(f"  ID:              {ip.id}")
    print(f"  Flags:           {ip.flags}")

    # Show transport layer if available
    if hasattr(packet, "tcp"):
        print(f"  TCP src port:    {packet.tcp.srcport}")
        print(f"  TCP dst port:    {packet.tcp.dstport}")
    elif hasattr(packet, "udp"):
        print(f"  UDP src port:    {packet.udp.srcport}")
        print(f"  UDP dst port:    {packet.udp.dstport}")
```

## Asynchronous Packet Capture

```python
import asyncio
import pyshark

async def print_packet(packet):
    if hasattr(packet, "ip"):
        print(f"{packet.ip.src} -> {packet.ip.dst}")

async def capture_async():
    async with pyshark.LiveCapture(
        interface="your_capture_interface",
        display_filter="ip"
    ) as cap:
        await cap.packets_from_tshark(print_packet, packet_count=50)

asyncio.run(capture_async())
```

## Capturing to a PCAPNG File

```python
import pyshark

# Capture and save to file simultaneously
cap = pyshark.LiveCapture(
    interface="your_capture_interface",
    bpf_filter="ip",
    output_file="/tmp/capture.pcapng"
)
cap.sniff(packet_count=100, timeout=30)
print(f"Saved {len(cap)} packets to /tmp/capture.pcapng")
```

## PyShark vs Scapy vs dpkt

| Feature | PyShark | Scapy | dpkt |
|---------|---------|-------|------|
| Protocol dissection | Excellent (Wireshark) | Good | Basic |
| Packet crafting | No | Yes | Basic/manual |
| Speed | Slower (subprocess) | Medium | Fast |
| Protocol coverage | Very broad | Wide | Basic TCP/IP |

## Conclusion

PyShark leverages Wireshark's protocol dissection engine through TShark, giving you access to hundreds of protocols with minimal Python code. It's ideal for monitoring and analysis tasks. For packet crafting or when raw performance matters, use Scapy or dpkt instead.
