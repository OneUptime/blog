# How to Enable Multicast Routing on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Multicast, Routing, Linux, PIM, IGMP, Pimd, Smcroute, Networking

Description: Enable IPv4 multicast routing on Linux using kernel configuration, pimd, and smcroute to forward multicast traffic between network interfaces and subnets.

## Introduction

Linux supports multicast routing through the kernel's multicast routing subsystem, which requires both kernel support and a userspace multicast routing daemon. The daemon (pimd, smcrouted, or mrouted) manages multicast routing entries - the kernel just provides the forwarding plane. This setup allows a Linux machine to act as a multicast router, forwarding multicast streams between different subnets or interfaces.

## Enable Multicast Routing in Kernel

```bash
# Check if multicast routing is compiled in:

grep -i "CONFIG_IP_MROUTE" /boot/config-$(uname -r)
# CONFIG_IP_MROUTE=y or =m means it's available

# Enable IP forwarding and multicast forwarding:
sysctl -w net.ipv4.ip_forward=1
sysctl -w net.ipv4.conf.all.mc_forwarding=1
# Repeat per participating interface:
sysctl -w net.ipv4.conf.eth0.mc_forwarding=1
sysctl -w net.ipv4.conf.eth1.mc_forwarding=1
cat >> /etc/sysctl.conf << 'EOF'
net.ipv4.ip_forward = 1
net.ipv4.conf.all.mc_forwarding = 1
net.ipv4.conf.eth0.mc_forwarding = 1
net.ipv4.conf.eth1.mc_forwarding = 1
EOF

# Multicast routing table socket is opened by the routing daemon

# Verify multicast routing is active (once daemon runs):
cat /proc/net/ip_mr_cache   # Multicast forwarding cache (MFC)
cat /proc/net/ip_mr_vif     # Virtual interfaces registered with the daemon
```

## Simple Static Multicast Routing with smcroute

```bash
# Install smcroute (simplest option for static multicast routes):
apt-get install smcroute    # Debian/Ubuntu
yum install smcroute        # RHEL/CentOS

# Configure static multicast routes:
cat > /etc/smcroute.conf << 'EOF'
# mgroup: join multicast group on incoming interface
mgroup from eth0 group 239.1.1.0/24
mgroup from eth0 group 239.2.0.0/16

# mroute: forward matching multicast from inbound to outbound
# mroute from <iface> group <group> [source <src>] to <iface> [<iface>...]
mroute from eth0 group 239.1.1.1 to eth1 eth2
mroute from eth0 group 239.2.0.0/16 to eth1
EOF

# Start smcroute daemon:
smcrouted -f /etc/smcroute.conf

# Or via systemd:
systemctl start smcroute
systemctl enable smcroute

# Add route at runtime (without restart):
smcroutectl add eth0 239.1.1.2 eth1

# Show routing table:
smcroutectl show routes

# Remove route:
smcroutectl rem eth0 239.1.1.2 eth1
```

## Dynamic Multicast Routing with pimd (PIM-SM)

```bash
# Install pimd (PIM Sparse Mode daemon):
apt-get install pimd    # Debian/Ubuntu

# Configure pimd:
cat > /etc/pimd.conf << 'EOF'
# RP (Rendezvous Point) address for all IPv4 multicast groups:
rp-address 192.168.1.1 224.0.0.0/4

# Configure PIM on interfaces (use -N if you want only these interfaces):
phyint eth0 enable
phyint eth1 enable

# PIM hello interval:
hello-interval 30

# Shared-tree to SPT switchover threshold:
spt-threshold packets 0 interval 100
EOF

# Start pimd:
systemctl start pimd
systemctl enable pimd

# View PIM neighbor adjacencies:
pimctl show neighbor

# View PIM routing table:
pimctl show mrt

# View PIM interfaces and VIFs:
pimctl show interfaces
```

## Configure Interfaces for Multicast

```bash
# Add multicast flag to interface:
ip link set eth0 multicast on

# Verify:
ip link show eth0 | grep MULTICAST
# Should show: MULTICAST in flags

# Set the egress interface for locally generated multicast traffic:
ip route add 239.1.0.0/16 dev eth1
# Tells the kernel: multicast for 239.1.x.x exits via eth1
# This does not join the group or replace the multicast routing daemon

# Add multicast group membership directly (0.0.0.0 lets the kernel choose the interface):
python3 -c "
import socket, struct
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
mreq = struct.pack('4s4s',
    socket.inet_aton('239.1.1.1'),
    socket.inet_aton('0.0.0.0'))
s.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
print('Joined 239.1.1.1')
import time; time.sleep(60)
"
```

## Monitor Multicast Routing

```bash
# View multicast forwarding cache (kernel):
cat /proc/net/ip_mr_cache
# Header: Group Origin Iif Pkts Bytes Wrong Oifs

# View virtual interfaces (multicast interfaces):
cat /proc/net/ip_mr_vif
# Header: Interface BytesIn PktsIn BytesOut PktsOut Flags Local Remote

# Check multicast group memberships:
netstat -g

# Monitor IGMP group memberships:
cat /proc/net/igmp
# Shows IGMP memberships per interface

# Capture multicast routing activity:
tcpdump -i any -n 'dst net 224.0.0.0/4'

# Check if multicast forwarding is active:
ip mroute show
# Shows (S,G) or (*,G) multicast route entries
```

## Verify Multicast Forwarding

```bash
#!/bin/bash
# Test multicast routing between two subnets

# On the receiving host (on subnet connected to eth1):
# Subscribe and listen:
python3 -c "
import socket, struct
MCAST = '239.1.1.1'
PORT = 5008
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(('', PORT))
mreq = struct.pack('4s4s', socket.inet_aton(MCAST), socket.inet_aton('0.0.0.0'))
s.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
print(f'Listening on {MCAST}:{PORT}')
data, addr = s.recvfrom(1024)
print(f'Received: {data} from {addr}')
" &

# On the sending host (on subnet connected to eth0):
python3 -c "
import socket, time
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 10)
for i in range(3):
    s.sendto(b'multicast test', ('239.1.1.1', 5008))
    print('Sent multicast packet', i+1)
    time.sleep(1)
"
```

## Conclusion

Linux multicast routing requires multicast routing support in the kernel, IP forwarding and multicast forwarding enabled, multicast-capable interfaces, and a routing daemon. Use `smcroute` for simple static multicast forwarding between known interfaces. Use `pimd` for dynamic PIM-SM routing in larger networks with a Rendezvous Point. Monitor with `cat /proc/net/ip_mr_cache` and `ip mroute show`. Always verify that multicast packets are received with the correct TTL - routers decrement TTL by 1, so TTL must be higher than the hop count for packets to reach the receiver.
