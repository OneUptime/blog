# How to Configure MPLS with Linux on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, MPLS, FRRouting

Description: Set up MPLS forwarding on Ubuntu using kernel MPLS support and FRRouting to create label-switched paths for traffic engineering and VPN applications.

---

MPLS (Multiprotocol Label Switching) is a forwarding technology that routes traffic based on short labels rather than network layer addresses. It is the foundation for MPLS VPNs, traffic engineering, and segment routing in carrier and data center networks. Linux has supported MPLS in the kernel since version 4.3, and combined with FRRouting, Ubuntu can function as a full MPLS-capable router.

## MPLS Fundamentals

In a traditional IP network, each router performs a longest-prefix match on the destination IP for every packet. MPLS replaces this with label switching:

1. An ingress Label Edge Router (LER) classifies packets and pushes an MPLS label
2. Label Switching Routers (LSRs) in the core forward packets based solely on the label value, without examining the IP header
3. An egress LER pops the label and delivers the original IP packet

Labels are 32-bit values with: 20 bits label value, 3 bits traffic class (QoS), 1 bit bottom-of-stack, 8 bits TTL.

## Prerequisites

### Checking Kernel MPLS Support

```bash
# Check if MPLS modules are available
ls /lib/modules/$(uname -r)/kernel/net/mpls/

# Check if the modules are loaded
lsmod | grep mpls

# Load MPLS modules if needed
sudo modprobe mpls_router
sudo modprobe mpls_iptunnel
```

Make module loading persistent:

```bash
# Add to modules load file
echo "mpls_router" | sudo tee -a /etc/modules-load.d/mpls.conf
echo "mpls_iptunnel" | sudo tee -a /etc/modules-load.d/mpls.conf
```

### Enabling MPLS in the Kernel

```bash
# Enable MPLS on each interface that will carry MPLS traffic
# Replace eth0/eth1 with your actual interface names
sudo sysctl -w net.mpls.conf.eth0.input=1
sudo sysctl -w net.mpls.conf.eth1.input=1
sudo sysctl -w net.mpls.conf.lo.input=1

# Set the maximum MPLS label stack depth
sudo sysctl -w net.mpls.platform_labels=1048575

# Make these settings persistent
sudo nano /etc/sysctl.d/mpls.conf
```

```text
# /etc/sysctl.d/mpls.conf
net.mpls.conf.eth0.input = 1
net.mpls.conf.eth1.input = 1
net.mpls.conf.lo.input = 1
net.mpls.platform_labels = 1048575
```

```bash
sudo sysctl -p /etc/sysctl.d/mpls.conf
```

## Installing FRRouting for LDP

FRRouting provides LDP (Label Distribution Protocol), which automates label distribution between MPLS routers.

```bash
# Add FRRouting repository
curl -s https://deb.frrouting.org/frr/keys.gpg | \
  sudo tee /usr/share/keyrings/frrouting.gpg > /dev/null

echo "deb [signed-by=/usr/share/keyrings/frrouting.gpg] \
  https://deb.frrouting.org/frr $(lsb_release -sc) frr-stable" | \
  sudo tee /etc/apt/sources.list.d/frr.list

sudo apt update
sudo apt install -y frr frr-pythontools
```

### Enabling Required Daemons

```bash
sudo nano /etc/frr/daemons
```

```text
zebra=yes
ospfd=yes    # LDP needs an IGP for loopback reachability
ldpd=yes     # Enable LDP daemon
mpls_enabled=yes
```

```bash
sudo systemctl restart frr
```

## Configuring a Three-Router MPLS Network

This example uses three Ubuntu routers in series:

```text
Router A (10.0.0.1) --- eth1:192.168.12.1/24:eth1 --- Router B (10.0.0.2) --- eth2:192.168.23.1/24:eth1 --- Router C (10.0.0.3)
```

### Router A Configuration

```text
configure terminal

! Configure loopback (used as router ID and LDP transport address)
interface lo
 ip address 10.0.0.1/32
exit

! Configure interface toward Router B
interface eth1
 ip address 192.168.12.1/24
exit

! Enable IP forwarding (required for routing)
ip forwarding

! Configure OSPF to distribute loopback addresses
router ospf
 ospf router-id 10.0.0.1
 network 10.0.0.1/32 area 0
 network 192.168.12.0/24 area 0
exit

! Configure LDP
mpls ldp
 ! LDP router ID (must be reachable by all LDP peers)
 router-id 10.0.0.1
 !
 ! Configure address family
 address-family ipv4
  !
  ! LDP transport address on loopback for stability
  transport-address 10.0.0.1
  !
  ! Enable LDP on the interface toward Router B
  interface eth1
  exit
 exit-address-family
exit

end
write memory
```

### Router B Configuration (LSR - Label Switching Router)

```text
configure terminal

interface lo
 ip address 10.0.0.2/32
exit

interface eth1
 ip address 192.168.12.2/24
exit

interface eth2
 ip address 192.168.23.1/24
exit

ip forwarding

router ospf
 ospf router-id 10.0.0.2
 network 10.0.0.2/32 area 0
 network 192.168.12.0/24 area 0
 network 192.168.23.0/24 area 0
exit

mpls ldp
 router-id 10.0.0.2
 address-family ipv4
  transport-address 10.0.0.2
  interface eth1
  exit
  interface eth2
  exit
 exit-address-family
exit

end
write memory
```

### Router C Configuration

```text
configure terminal

interface lo
 ip address 10.0.0.3/32
exit

interface eth1
 ip address 192.168.23.2/24
exit

ip forwarding

router ospf
 ospf router-id 10.0.0.3
 network 10.0.0.3/32 area 0
 network 192.168.23.0/24 area 0
exit

mpls ldp
 router-id 10.0.0.3
 address-family ipv4
  transport-address 10.0.0.3
  interface eth1
  exit
 exit-address-family
exit

end
write memory
```

## Verifying MPLS Operation

### Check LDP Neighbors

```bash
sudo vtysh -c "show mpls ldp neighbor"
```

Expected output showing LDP sessions are up:

```text
AF   ID              State       Remote Address    Uptime
ipv4 10.0.0.2        OPERATIONAL 10.0.0.2          00:02:15
```

### View the MPLS Forwarding Table

```bash
# Show the label forwarding table in FRR
sudo vtysh -c "show mpls table"

# Show the kernel MPLS forwarding table
ip -f mpls route show
```

The kernel routing table shows entries like:

```text
100 as to 10.0.0.3 via inet 192.168.12.2 dev eth1
```

This means: incoming label 100, forward to 10.0.0.3 via 192.168.12.2 on eth1.

### Check MPLS Interface Status

```bash
# Verify MPLS is enabled on interfaces
ip link show dev eth1 | grep MPLS

# Check sysctl values
sysctl net.mpls.conf.eth1.input
```

## Manual MPLS Label Configuration

For testing, you can configure static MPLS forwarding without LDP:

```bash
# Create a static MPLS forwarding entry
# Incoming label 100 -> swap to label 200 and forward via 192.168.12.2
sudo ip -f mpls route add 100 \
  via inet 192.168.12.2 \
  dev eth1

# Push an MPLS label on outgoing traffic
# Encapsulate traffic to 10.0.0.3 with label 100
sudo ip route add 10.0.0.3/32 \
  encap mpls 100 \
  via 192.168.12.2 dev eth1

# Verify
ip -f mpls route show
ip route show 10.0.0.3
```

## Testing MPLS Forwarding

```bash
# On Router A, ping Router C's loopback
ping 10.0.0.3 -I lo -c 5

# Use traceroute to verify the path
traceroute 10.0.0.3

# Check MTU - MPLS adds 4 bytes per label
# Each label adds overhead; account for this in your MTU planning
ip link show eth1 | grep mtu
```

## Segment Routing with FRRouting

Modern MPLS deployments increasingly use Segment Routing (SR-MPLS) instead of LDP. FRR supports SR-MPLS via OSPF or IS-IS extensions:

```text
configure terminal

router ospf
 ospf router-id 10.0.0.1
 network 10.0.0.1/32 area 0

 ! Enable Segment Routing
 segment-routing on
 segment-routing global-block 16000 23999
 segment-routing node-msd 8

 ! Assign a Node Segment ID (unique per router)
 segment-routing prefix 10.0.0.1/32 index 1
exit

end
write memory
```

Verify SR labels:

```bash
sudo vtysh -c "show ip ospf segment-routing prefix"
sudo vtysh -c "show mpls table"
```

## Troubleshooting MPLS

If LDP sessions are not forming:

```bash
# Enable LDP debugging
sudo vtysh
debug mpls ldp events
debug mpls ldp messages recv
debug mpls ldp messages sent

# Common issues:
# 1. LDP transport address not reachable via OSPF
sudo vtysh -c "show ip ospf neighbor"

# 2. LDP not enabled on the interface
sudo vtysh -c "show mpls ldp interface"

# 3. MPLS not enabled in kernel
sysctl net.mpls.conf.eth1.input
# Should be 1; if 0, MPLS packets on that interface are dropped
```

MPLS on Linux has matured significantly. For lab work, network emulation, or building software-based routers, Ubuntu with FRRouting provides a fully functional MPLS implementation that covers the same protocols used in production service provider networks.
