# How to Configure PIM-SSM for IPv6 Multicast Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, PIM-SSM, Multicast, Source-Specific Multicast, Network

Description: A guide to configuring PIM-SSM (Source-Specific Multicast) for IPv6, enabling more efficient and secure multicast routing without a Rendezvous Point.

## What Is PIM-SSM?

PIM-SSM (Source-Specific Multicast) is a mode of PIM that eliminates the need for a Rendezvous Point (RP). Instead of joining a multicast group `(*,G)`, receivers join `(S,G)` - specifying both the source and group. Traffic only flows from the authorized source to the group.

For IPv6, the SSM address range is `ff3x::/32` (where `x` is the scope nibble).

## PIM-SSM Advantages over PIM-SM

| Aspect | PIM-SM | PIM-SSM |
|---|---|---|
| RP required | Yes | No |
| Source known to receiver | No | Yes |
| Security | Lower (anyone can send) | Higher (only specified source) |
| Setup complexity | Higher | Lower |
| Shared tree phase | Yes | No (source tree only) |
| IPv6 group range | ff0x::/16 | ff3x::/32 |

## Configuring PIM-SSM on Linux with FRR

```bash
# Install FRRouting

apt install frr

# Enable pim6d daemon (pim6d is the IPv6 PIM daemon; pimd is IPv4-only)
sed -i 's/pim6d=no/pim6d=yes/' /etc/frr/daemons
systemctl restart frr

# Configure PIM-SSM in FRR vtysh
vtysh

configure terminal

# Enable PIM on interfaces
interface eth0
 ipv6 pim

interface eth1
 ipv6 pim

# Configure SSM prefix list (ff3e::/32 is the global SSM range) and apply it
ipv6 prefix-list SSM_RANGE seq 10 permit ff3e::/32 le 128
ipv6 pim ssm prefix-list SSM_RANGE

# Enable MLD version 2 on interfaces (required for SSM)
interface eth0
 ipv6 mld version 2

interface eth1
 ipv6 mld version 2

end
write memory
```

## MLDv2 is Required for SSM

PIM-SSM requires MLDv2 because hosts need to specify the source address when joining. MLDv1 doesn't support source-specific joins. Verify MLDv2:

```bash
# Verify MLDv2 is active
sysctl net.ipv6.conf.eth0.force_mld_version
# Should be 0 (auto, defaults to v2) or 2

# Join an SSM group with a specific source using Python
python3 -c "
import socket, struct

# SSM join: (Source=2001:db8::src, Group=ff3e::db8:stream)
sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)

# struct group_source_req
# interface_index (4 bytes) + pad (4 bytes for 8-byte alignment)
# group_addr  (struct sockaddr_storage = 128 bytes)
# source_addr (struct sockaddr_storage = 128 bytes)
ifidx = socket.if_nametoindex('eth0')
pad = 0

def make_sockaddr_storage_in6(addr):
    addr_bytes = socket.inet_pton(socket.AF_INET6, addr)
    sin6 = struct.pack('HHI16sI', socket.AF_INET6, 0, 0, addr_bytes, 0)
    # sockaddr_storage is 128 bytes; pad sockaddr_in6 (28 bytes) up to 128
    return sin6 + b'\x00' * (128 - len(sin6))

group_sa = make_sockaddr_storage_in6('ff3e::db8:stream')
source_sa = make_sockaddr_storage_in6('2001:db8::source')

mreq = struct.pack('II', ifidx, pad) + group_sa + source_sa
sock.setsockopt(socket.IPPROTO_IPV6, socket.MCAST_JOIN_SOURCE_GROUP, mreq)
print('Joined SSM group (ff3e::db8:stream, source=2001:db8::source)')
import time; time.sleep(300)
"
```

## PIM-SSM Routing Verification

```bash
# Check PIM SSM state
vtysh -c "show ipv6 pim ssm"

# Check (S,G) entries in the multicast routing table
vtysh -c "show ipv6 mroute"
# Look for (2001:db8::source, ff3e::db8:stream) entries

# Check PIM join state
vtysh -c "show ipv6 pim join"

# Check upstream state
vtysh -c "show ipv6 pim upstream"

# Kernel multicast routing table
ip -6 mroute show
```

## Testing PIM-SSM Multicast

```bash
# Source: send multicast from a specific source address
python3 -c "
import socket, struct

src = '2001:db8::source'
grp = 'ff3e::db8:stream'

sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_MULTICAST_HOPS, 16)

# Bind to the source address
sock.bind((src, 0))

for i in range(100):
    msg = f'SSM stream packet {i}'.encode()
    sock.sendto(msg, (grp, 5000))
    print(f'Sent: {msg}')
    import time; time.sleep(1)
"

# Receiver (on a different host): verify only authorized source traffic arrives
python3 -c "
import socket, struct

sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
sock.bind(('', 5000))

# Join SSM group - receive only from source 2001:db8::source
# group_source_req uses sockaddr_storage (128 bytes), not sockaddr_in6 (28 bytes)
ifidx = socket.if_nametoindex('eth0')
def sa_storage_in6(addr):
    sin6 = struct.pack('HHI16sI', socket.AF_INET6, 0, 0,
        socket.inet_pton(socket.AF_INET6, addr), 0)
    return sin6 + b'\x00' * (128 - len(sin6))
group_sa = sa_storage_in6('ff3e::db8:stream')
source_sa = sa_storage_in6('2001:db8::source')
mreq = struct.pack('II', ifidx, 0) + group_sa + source_sa
sock.setsockopt(socket.IPPROTO_IPV6, socket.MCAST_JOIN_SOURCE_GROUP, mreq)

while True:
    data, addr = sock.recvfrom(1024)
    print(f'From {addr}: {data}')
"
```

## Summary

PIM-SSM for IPv6 provides more secure and efficient multicast routing by specifying both source and group addresses (`S,G`), eliminating the need for an RP. Configure FRR with `ipv6 pim` on interfaces, ensure MLDv2 is active, and use the `ff3x::/32` address range for SSM groups. SSM is the preferred mode for new IPv6 multicast deployments where the source is known to receivers.
