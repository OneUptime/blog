# How to Join a Multicast Group on a Linux Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Multicast, IGMP, Linux, Socket, Networking, UDP

Description: Join IPv4 multicast groups on Linux using socket options, the ip command, and programming interfaces, and verify group membership with system commands.

## Introduction

Joining a multicast group on Linux instructs the network stack to accept packets sent to a multicast group address and optionally triggers IGMP membership reports to inform the local router. This is done through socket options (`IP_ADD_MEMBERSHIP`) or by applications that call the same setsockopt-based API. Commands such as `ip maddr show` and files such as `/proc/net/igmp` help inspect the resulting multicast state. Understanding how to join groups is essential for deploying multicast applications and troubleshooting multicast connectivity.

## Join Multicast Group via Socket Options

```python
#!/usr/bin/env python3
# Join multicast group and receive packets

import socket
import struct

MCAST_GRP = '239.255.0.1'
MCAST_PORT = 5007

# Create UDP socket:

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)

# Allow multiple sockets on same port:
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)

# Bind to multicast port:
sock.bind(('', MCAST_PORT))

# Join multicast group (kernel-selected interface):
mreq = struct.pack('4s4s',
    socket.inet_aton(MCAST_GRP),
    socket.inet_aton('0.0.0.0'))  # 0.0.0.0 = INADDR_ANY (kernel-selected interface)
sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)

print(f"Joined {MCAST_GRP}, listening on port {MCAST_PORT}")

try:
    while True:
        data, (src_ip, src_port) = sock.recvfrom(4096)
        print(f"From {src_ip}:{src_port}: {data.decode(errors='replace')}")
except KeyboardInterrupt:
    pass
finally:
    # Leave group on exit:
    sock.setsockopt(socket.IPPROTO_IP, socket.IP_DROP_MEMBERSHIP, mreq)
    sock.close()
```

## Join on Specific Interface

```python
#!/usr/bin/env python3
# Join multicast group on a specific interface

import socket
import struct

MCAST_GRP = '239.255.0.1'
MCAST_PORT = 5007
IFACE_IP = '192.168.1.10'  # IP address of the interface to join on

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

# Bind to the port; the membership request selects the interface:
sock.bind(('', MCAST_PORT))

# Join on specific interface using its IP:
mreq = struct.pack('4s4s',
    socket.inet_aton(MCAST_GRP),
    socket.inet_aton(IFACE_IP))   # Specific interface IP
sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)

# Alternative using IP_ADD_MEMBERSHIP with ip_mreqn (includes interface index):
import ctypes
class ip_mreqn(ctypes.Structure):
    _fields_ = [
        ('imr_multiaddr', ctypes.c_byte * 4),
        ('imr_address', ctypes.c_byte * 4),
        ('imr_ifindex', ctypes.c_int),
    ]

IFACE_INDEX = socket.if_nametoindex('eth0')
mreqn = ip_mreqn()
mreqn.imr_multiaddr = (ctypes.c_byte * 4)(*socket.inet_aton(MCAST_GRP))
mreqn.imr_address = (ctypes.c_byte * 4)(0, 0, 0, 0)
mreqn.imr_ifindex = IFACE_INDEX

sock2 = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock2.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP,
                  bytes(mreqn))
```

## Inspect Multicast Group State via ip Command

```bash
# View multicast groups on interface:
ip maddr show dev eth0
# Or all interfaces:
ip maddr show

# Note: `ip maddr add/del` manages static link-layer multicast filter entries.
# It does not perform an IPv4 IGMP join; use `IP_ADD_MEMBERSHIP` for that.

# Example output:
# 2:   eth0
#     inet  239.255.0.1
#     inet  224.0.0.1

# Check kernel's view of IGMP memberships:
cat /proc/net/igmp
# Example:
# 2  eth0 : 2 V3
#               010000EF     1 0:00000000 0
# Group 010000EF = 239.0.0.1 in little-endian hex
```

## Source-Specific Multicast (SSM) with IGMPv3

```python
#!/usr/bin/env python3
# Join SSM group (specific source + group) using IGMPv3

import socket
import struct
import ctypes

# Source-Specific Multicast: receive only from specific source
MCAST_GRP = '232.1.1.1'  # SSM range 232.0.0.0/8
MCAST_SRC = '10.20.0.5'  # Only receive from this source
MCAST_PORT = 5009

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sock.bind(('', MCAST_PORT))

# IP_ADD_SOURCE_MEMBERSHIP for SSM:
# struct: group (4 bytes) + interface (4 bytes) + source (4 bytes)
mreq_source = struct.pack('4s4s4s',
    socket.inet_aton(MCAST_GRP),
    socket.inet_aton('0.0.0.0'),   # Kernel-selected interface
    socket.inet_aton(MCAST_SRC))

sock.setsockopt(socket.IPPROTO_IP,
                socket.IP_ADD_SOURCE_MEMBERSHIP,
                mreq_source)

print(f"Joined SSM group {MCAST_GRP} from source {MCAST_SRC}")

while True:
    data, addr = sock.recvfrom(4096)
    print(f"Received: {data} from {addr}")
```

## Verify Group Membership

```bash
# Check IGMP group memberships reported to kernel:
cat /proc/net/igmp

# Parse in human-readable form:
python3 << 'EOF'
with open('/proc/net/igmp') as f:
    current_iface = None
    for line in f.readlines()[1:]:  # Skip header
        parts = line.split()
        if not parts:
            continue

        if len(parts) >= 5 and parts[2] == ':':
            current_iface = parts[1]
            continue

        if len(parts) >= 4 and current_iface:
            try:
                # Convert little-endian hex to IP:
                g = int(parts[0], 16)
                ip = f"{g & 0xff}.{(g >> 8) & 0xff}.{(g >> 16) & 0xff}.{(g >> 24) & 0xff}"
                print(f"{current_iface}: {ip}")
            except ValueError:
                pass
EOF

# Monitor IGMP join/leave events with tcpdump:
tcpdump -i eth0 -n 'igmp'
# Shows IGMP membership reports, queries, and leaves

# Legacy alternative from net-tools:
netstat -g
```

## Conclusion

Joining a multicast group on Linux is done via `IP_ADD_MEMBERSHIP` socket option, specifying the group address and interface (use `0.0.0.0` to let the kernel choose the interface). The kernel may send IGMP membership reports to inform the local multicast router. Use `ip maddr show` to inspect multicast addresses on interfaces and `cat /proc/net/igmp` for kernel-level IGMP state. For Source-Specific Multicast (SSM), use `IP_ADD_SOURCE_MEMBERSHIP` to join a `(source, group)` pair - more efficient than ASM as it eliminates unnecessary traffic from other sources. Always call `IP_DROP_MEMBERSHIP` when your application exits to drop the socket's membership cleanly.
