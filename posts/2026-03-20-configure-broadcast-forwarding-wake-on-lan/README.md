# How to Configure Broadcast Forwarding for Wake-on-LAN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Wake-on-LAN, Broadcast, Linux, Cisco, Network Administration

Description: Configure directed broadcast forwarding on a router or Linux system to send Wake-on-LAN magic packets to computers on remote subnets.

## Introduction

Wake-on-LAN (WoL) relies on a magic packet, most commonly sent as a UDP broadcast to port 9. This works easily within a single subnet, but reaching machines on remote subnets requires either directed broadcast forwarding on the router or a WoL relay agent.

## How Wake-on-LAN Works

A magic packet consists of 6 bytes of `FF` followed by the target MAC address repeated 16 times, commonly sent as a UDP broadcast:

```text
FF FF FF FF FF FF
AA BB CC DD EE FF  (×16)
```

For local delivery, the packet is usually sent to the subnet's broadcast address or `255.255.255.255`. For remote subnets, send it to the target subnet's directed broadcast address (for example, `192.168.2.255`). UDP port 9 is common, but port 7 or another configured UDP port can also be used.

## Option 1: Enable Directed Broadcast on Cisco Router

Directed broadcast must be explicitly enabled on the interface facing the target subnet:

```text
! Enable directed broadcast on the interface facing 192.168.2.0/24
interface GigabitEthernet0/2
 ip directed-broadcast
```

Now a packet sent to `192.168.2.255:9` can be forwarded into that subnet as a broadcast. On newer Cisco IOS XE platforms that support it, you may also need `ip network-broadcast` on the ingress interface so the device accepts the directed broadcast packet.

## Option 2: Linux Directed Broadcast Forwarding

On a Linux router, enable directed-broadcast forwarding in the kernel and allow the WoL traffic through the forwarding policy:

```bash
# Enable IP forwarding

echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward

# Allow directed broadcasts received on the ingress interface
echo 1 | sudo tee /proc/sys/net/ipv4/conf/all/bc_forwarding
echo 1 | sudo tee /proc/sys/net/ipv4/conf/eth0/bc_forwarding

# Permit WoL packets to the target subnet's directed broadcast address
sudo iptables -A FORWARD -i eth0 -o eth1 \
  -d 192.168.2.255 -p udp --dport 9 \
  -j ACCEPT
```

The sender must target the destination subnet's directed broadcast address, such as `192.168.2.255`, rather than `255.255.255.255`.

## Option 3: WoL Relay with wakeonlan Tool

If you do not want to modify router settings, run the `wakeonlan` tool on a host that is already on the target subnet:

```bash
# Install wakeonlan
sudo apt install wakeonlan

# Send a magic packet directly from a host on the target subnet
wakeonlan -i 192.168.2.255 AA:BB:CC:DD:EE:FF
```

You can call this from any machine via SSH:

```bash
# SSH to a Linux host on subnet 192.168.2.0/24 and send WoL from there
ssh user@192.168.2.1 "wakeonlan -i 192.168.2.255 AA:BB:CC:DD:EE:FF"
```

## Option 4: Send Magic Packet with Python

```python
#!/usr/bin/env python3
import socket
import struct

def wake_on_lan(mac: str, broadcast: str = "255.255.255.255", port: int = 9):
    """Send a Wake-on-LAN magic packet to the given MAC address."""
    mac_bytes = bytes.fromhex(mac.replace(":", "").replace("-", ""))
    magic = b'\xff' * 6 + mac_bytes * 16

    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.sendto(magic, (broadcast, port))
        print(f"Magic packet sent to {mac} via {broadcast}:{port}")

# Send to local subnet
wake_on_lan("AA:BB:CC:DD:EE:FF", "255.255.255.255")

# Send to a specific remote subnet's directed broadcast
wake_on_lan("AA:BB:CC:DD:EE:FF", "192.168.2.255")
```

## Verifying with tcpdump

```bash
# On the target subnet - confirm the magic packet arrives
sudo tcpdump -i eth0 -n -X "udp dst port 9" | head -40
```

The hex dump should show `FF FF FF FF FF FF` followed by the MAC repeated 16 times.

## Conclusion

For cross-subnet WoL, the cleanest option is enabling directed broadcast on the router interface facing the target segment. If router changes are not possible, a relay host or an SSH command on a host inside the target subnet achieves the same result without exposing directed broadcast broadly.
