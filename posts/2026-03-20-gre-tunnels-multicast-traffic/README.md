# How to Use GRE Tunnels for Multicast Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GRE, Multicast, Linux, Tunnel, IPv4, IGMP, PIM, Networking

Description: Learn how to configure GRE tunnels to carry IPv4 multicast traffic across unicast-only networks, enabling multicast routing between sites that do not have native multicast support.

---

GRE tunnels can encapsulate multicast packets, allowing multicast applications to work across networks that don't support native multicast routing (e.g., the internet or a unicast-only WAN).

## Why Use GRE for Multicast

Many WAN links and internet paths do not support IP multicast routing. GRE encapsulates multicast packets inside unicast GRE packets, allowing them to traverse non-multicast networks.

## Creating a Multicast-Capable GRE Tunnel

```bash
# Create GRE tunnel with multicast support

# The key flag is the tunnel mode and enabling multicast on the interface

ip tunnel add gre1 \
  mode gre \
  remote 10.0.0.2 \
  local 10.0.0.1 \
  ttl 255

ip addr add 172.16.1.1/30 dev gre1
ip link set gre1 multicast on    # Enable multicast on the GRE interface
ip link set gre1 up

# Verify multicast flag
ip link show gre1 | grep MULTICAST
# gre1: <POINTOPOINT,MULTICAST,NOARP,UP,LOWER_UP>
```

## Remote Side Configuration

```bash
# On 10.0.0.2:
ip tunnel add gre1 mode gre remote 10.0.0.1 local 10.0.0.2 ttl 255
ip addr add 172.16.1.2/30 dev gre1
ip link set gre1 multicast on
ip link set gre1 up
```

## Joining Multicast Groups Through GRE

```bash
# Test multicast group membership through tunnel
# If you are using SMCRoute, have smcrouted running and join the group on gre1
smcroutectl join gre1 239.1.1.1

# Or use Python to test
python3 -c "
import socket, struct
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
mreq = struct.pack('4s4s', socket.inet_aton('239.1.1.1'), socket.inet_aton('172.16.1.2'))
sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
print('Joined 239.1.1.1 on gre1')
"
```

## PIM Sparse Mode Over GRE (FRR)

```bash
# Enable kernel multicast forwarding for routing between eth0 and gre1
sysctl -w net.ipv4.conf.all.mc_forwarding=1
sysctl -w net.ipv4.conf.eth0.mc_forwarding=1
sysctl -w net.ipv4.conf.gre1.mc_forwarding=1

# Run PIM over GRE to route multicast through the tunnel
vtysh << 'EOF'
conf t
interface gre1
  ip pim
interface eth0
  ip pim
  ip igmp
router pim
  rp 172.16.1.1 224.0.0.0/4
EOF
```

## Static Multicast Routing Over GRE

```bash
# Enable kernel multicast forwarding for routing between eth0 and gre1
sysctl -w net.ipv4.conf.all.mc_forwarding=1
sysctl -w net.ipv4.conf.eth0.mc_forwarding=1
sysctl -w net.ipv4.conf.gre1.mc_forwarding=1

# smcroute: simple static multicast routing
apt install smcroute -y

# /etc/smcroute.conf
# Join the upstream group on eth0 if IGMP snooping is in use
mgroup from eth0 group 239.1.1.0/24
# Route multicast from eth0 out through gre1
mroute from eth0 group 239.1.1.0/24 to gre1

systemctl restart smcroute.service
smcroutectl show routes
```

## Testing Multicast Through GRE

```bash
# Receiver side (iperf2)
iperf -s -u -B 239.1.1.1 &

# Sender side (iperf2)
iperf -c 239.1.1.1 -u -T 5 -b 1M
```

## Key Takeaways

- Enable multicast on a GRE interface with `ip link set gre1 multicast on` (sets the `MULTICAST` flag).
- GRE with multicast support encapsulates multicast-destined packets inside unicast GRE frames for transport.
- Enable Linux multicast forwarding with `net.ipv4.conf.*.mc_forwarding=1` before using PIM or SMCRoute to route multicast.
- Use `smcrouted`/`smcroute.service` for simple static multicast forwarding over GRE without a full PIM deployment.
- For dynamic multicast routing in FRR, use `ip pim` on routed interfaces and `ip igmp` on LAN interfaces that face multicast receivers.
