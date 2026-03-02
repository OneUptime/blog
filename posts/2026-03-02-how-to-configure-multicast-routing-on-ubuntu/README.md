# How to Configure Multicast Routing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Multicast, Networking, PIM, IGMP

Description: Set up multicast routing on Ubuntu using FRRouting's PIM implementation, covering IGMP snooping, PIM-SM configuration, and multicast group verification.

---

Multicast allows a single sender to reach multiple receivers efficiently without sending separate unicast copies to each. It is used for video streaming, financial data distribution, gaming, and time synchronization. Setting up multicast routing on Linux requires several components working together: the kernel's multicast forwarding subsystem, a multicast routing daemon, and IGMP for receiver management.

## How IP Multicast Works

A brief conceptual overview helps before jumping into configuration:

- **Multicast group addresses**: 224.0.0.0/4 is reserved for multicast. 239.0.0.0/8 is for "administratively scoped" (private) multicast.
- **IGMP (Internet Group Management Protocol)**: Used by receivers to join and leave multicast groups. Routers use IGMP to track which groups have interested receivers on which interfaces.
- **PIM (Protocol Independent Multicast)**: The multicast routing protocol. PIM-SM (Sparse Mode) is most common - it uses an RP (Rendezvous Point) to initially connect senders and receivers.
- **Kernel multicast forwarding**: The Linux kernel's multicast routing engine, controlled via the `vif` and `mfc` interfaces exposed through a multicast routing socket.

## Prerequisites

```bash
# Install FRRouting for PIM support
curl -s https://deb.frrouting.org/frr/keys.gpg | sudo tee /usr/share/keyrings/frrouting.gpg > /dev/null

echo "deb [signed-by=/usr/share/keyrings/frrouting.gpg] https://deb.frrouting.org/frr $(lsb_release -sc) frr-stable" | \
    sudo tee /etc/apt/sources.list.d/frr.list

sudo apt update && sudo apt install -y frr frr-pythontools

# Install multicast testing tools
sudo apt install -y smcroute mctools
```

## Enabling Required Kernel Support

```bash
# Enable multicast routing support in the kernel
# IP_MROUTE must be compiled in or as a module
sudo modprobe ip_gre  # needed for some multicast tunneling scenarios

# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-multicast.conf

# Verify multicast routing socket support
cat /proc/net/dev_mcast
```

## Enabling PIM in FRRouting

```bash
# Edit the FRR daemons file to enable both zebra and pimd
sudo nano /etc/frr/daemons
# Set:
#   zebra=yes
#   pimd=yes
```

```bash
sudo systemctl restart frr
sudo systemctl enable frr

# Verify pimd is running
pgrep -a pimd
```

## PIM-SM Configuration

### Simple Two-Router Setup

```
Network:
  Router A: eth0=10.0.1.1 (connects to sender), eth1=10.0.12.1
  Router B: eth0=10.0.12.2, eth1=10.0.2.1 (connects to receivers)

  Router A is also the Rendezvous Point (RP) for 224.0.0.0/4
```

### Router A Configuration

```bash
sudo vtysh
```

```
configure terminal

! Enable PIM on interfaces
interface eth0
  ! Enable PIM on the sender-facing interface
  ip pim

  ! Enable IGMP to detect local receivers (if any receivers on this segment)
  ip igmp

interface eth1
  ! Enable PIM on the inter-router link
  ip pim

  ip igmp

! Configure this router as the RP for all multicast groups
router pim
  ! Define the RP address (this router's own address)
  rp 10.0.1.1

exit

write memory
```

### Router B Configuration

```
configure terminal

interface eth0
  ip pim
  ip igmp

interface eth1
  ! Enable PIM and IGMP on the receiver-facing interface
  ip pim
  ip igmp

router pim
  ! Point to Router A as the RP
  rp 10.0.1.1

exit

write memory
```

## Verifying PIM Operation

```bash
# Check PIM neighbor relationships
sudo vtysh -c "show ip pim neighbor"

# View the multicast routing table (MRIB)
sudo vtysh -c "show ip mroute"

# Show RP information
sudo vtysh -c "show ip pim rp-info"

# Check IGMP group memberships detected
sudo vtysh -c "show ip igmp groups"

# Show PIM interface status
sudo vtysh -c "show ip pim interface"
```

## Testing Multicast with smcroute and mcjoin

```bash
# On a receiver host, join a multicast group
# Install mcjoin for easy testing
sudo apt install -y mcjoin

# Join the multicast group 239.1.2.3 and wait for data
sudo mcjoin -i eth1 239.1.2.3

# On the sender host, send multicast packets
# Use netcat or a simple Python script
python3 - <<'EOF'
import socket
import time

# Create a UDP socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# Set the TTL high enough to traverse routers
sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 10)

# Bind to the sender interface
sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_IF,
                socket.inet_aton('10.0.1.100'))

# Send to the multicast group
for i in range(10):
    sock.sendto(f"Multicast packet {i}".encode(), ('239.1.2.3', 5000))
    print(f"Sent packet {i}")
    time.sleep(1)

sock.close()
EOF
```

## Using smcroute for Static Multicast Routing

For simple setups without a full PIM deployment, smcroute handles static multicast routes:

```bash
# Install smcroute
sudo apt install -y smcroute

# Create a static multicast route:
# Traffic from 10.0.1.100 destined for 239.1.2.3, arriving on eth0,
# should be forwarded out eth1
sudo tee /etc/smcroute.conf > /dev/null <<'EOF'
# Interface definitions
phyint eth0 enable
phyint eth1 enable

# Static multicast route
# mroute inbound-iface sender-ip group-address outbound-iface [outbound-iface2 ...]
mroute from eth0 source 10.0.1.100 group 239.1.2.3 to eth1
EOF

sudo systemctl start smcroute
sudo systemctl enable smcroute

# Check the multicast routing table in the kernel
cat /proc/net/ip_mr_cache
```

## IGMP Snooping on Linux Bridges

When using a Linux bridge (for VMs or containers), IGMP snooping prevents multicast flooding to all bridge ports:

```bash
# Check if IGMP snooping is enabled on a bridge
cat /sys/class/net/br0/bridge/multicast_snooping

# Enable IGMP snooping (0=disabled, 1=enabled)
echo 1 | sudo tee /sys/class/net/br0/bridge/multicast_snooping

# View IGMP snooping table
bridge mdb show

# To make it persistent via Netplan:
# bridges:
#   br0:
#     parameters:
#       multicast-snooping: true
```

## Multicast Scoping with TTL

Multicast scope is controlled by the TTL field in IP headers:

```
TTL   Scope
0     Same host
1     Same subnet (link-local)
15    Same site
63    Same region
127   Worldwide
```

```bash
# Configure maximum TTL threshold on an interface
# Packets with TTL <= threshold are NOT forwarded out that interface
# This limits multicast to specific network boundaries

# Via PIM configuration:
# interface eth1
#   ip multicast boundary 15
```

## Monitoring Multicast Traffic

```bash
# View multicast group memberships on all interfaces
ip maddress show

# View the kernel multicast routing cache
cat /proc/net/ip_mr_cache

# Count multicast packet statistics
cat /proc/net/ip_mr_vif

# Monitor IGMP messages on an interface
sudo tcpdump -i eth1 -n igmp

# Monitor all multicast traffic
sudo tcpdump -i eth0 -n 'ip multicast'

# Watch PIM hello messages between routers
sudo tcpdump -i eth1 -n 'ip proto 103'  # PIM protocol number is 103
```

## Troubleshooting

If receivers are not getting multicast traffic after joining a group:

1. Verify PIM neighbors are established: `show ip pim neighbor`
2. Check that IGMP reports are being generated: `sudo tcpdump -i eth1 igmp`
3. Confirm the multicast route exists: `show ip mroute`
4. Verify TTL is sufficient for the path
5. Check for firewall rules blocking multicast: `sudo iptables -L -n | grep 224`
6. Ensure the physical interface's multicast flag is set: `ip link show eth0 | grep MULTICAST`

Multicast debugging requires looking at multiple layers simultaneously. `tcpdump` at each hop showing IGMP joins propagating and PIM state messages flowing is the fastest way to identify where the flow breaks.
