# How to Set Up OSPF Routing with FRRouting on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, OSPF, FRRouting, Networking, Dynamic Routing

Description: Configure OSPF dynamic routing on Ubuntu using FRRouting, covering area design, interface configuration, neighbor relationships, and route redistribution.

---

OSPF (Open Shortest Path First) is a link-state routing protocol widely used in enterprise and service provider networks. Each router builds a complete map of the network topology (the LSDB - Link State Database) and independently calculates shortest paths using the Dijkstra algorithm. Unlike distance-vector protocols, OSPF converges quickly and scales well with proper area design.

FRRouting on Ubuntu provides a full OSPF implementation that interoperates with Cisco, Juniper, and other vendor equipment. This guide walks through a working multi-router OSPF setup.

## Lab Topology

```
Router A (10.0.1.1) --- 10.0.12.0/30 --- Router B (10.0.12.2)
Router A (10.0.1.1) --- 10.0.13.0/30 --- Router C (10.0.13.2)
Router B             --- 10.0.23.0/30 --- Router C (10.0.23.2)

Loopbacks:
  Router A: 1.1.1.1/32
  Router B: 2.2.2.2/32
  Router C: 3.3.3.3/32

All in OSPF Area 0 (backbone)
```

## Installing FRRouting

```bash
# Add FRR repository and install
curl -s https://deb.frrouting.org/frr/keys.gpg | sudo tee /usr/share/keyrings/frrouting.gpg > /dev/null

echo "deb [signed-by=/usr/share/keyrings/frrouting.gpg] https://deb.frrouting.org/frr $(lsb_release -sc) frr-stable" | \
    sudo tee /etc/apt/sources.list.d/frr.list

sudo apt update && sudo apt install -y frr frr-pythontools
```

## Enabling the OSPF Daemon

```bash
# Enable ospfd in the daemons file
sudo sed -i 's/ospfd=no/ospfd=yes/' /etc/frr/daemons

# zebra must also be enabled (it usually is by default)
sudo sed -i 's/zebra=no/zebra=yes/' /etc/frr/daemons

sudo systemctl restart frr
sudo systemctl enable frr

# Verify ospfd is running
pgrep -a ospfd
```

## Configuring IP Forwarding

On machines that act as OSPF routers and need to forward packets:

```bash
sudo tee /etc/sysctl.d/99-ospf.conf > /dev/null <<'EOF'
net.ipv4.ip_forward = 1
EOF

sudo sysctl -p /etc/sysctl.d/99-ospf.conf
```

## Router A Configuration

```bash
sudo vtysh
```

```
configure terminal

! Set hostname for easier identification in show output
hostname RouterA

! Configure the loopback as a passive interface
interface lo
  ip address 1.1.1.1/32

! Configure the link to Router B
interface eth0
  ip address 10.0.12.1/30
  ! Set OSPF cost if you want to influence path selection
  ip ospf cost 10

! Configure the link to Router C
interface eth1
  ip address 10.0.13.1/30
  ip ospf cost 10

! Enter OSPF configuration
router ospf
  ! The router-id should be unique across all OSPF routers
  ! Using the loopback address is conventional
  ospf router-id 1.1.1.1

  ! Define which networks participate in OSPF and which area they belong to
  ! Area 0 is the backbone area - all areas must connect to it
  network 1.1.1.1/32 area 0
  network 10.0.12.0/30 area 0
  network 10.0.13.0/30 area 0

  ! Make the loopback passive - it should be announced but not form adjacencies
  passive-interface lo

  ! Set the reference bandwidth for cost calculation
  ! Default is 100 Mbps; set to 10000 for 10G environments
  auto-cost reference-bandwidth 10000

exit

write memory
```

## Router B Configuration

```
configure terminal

hostname RouterB

interface lo
  ip address 2.2.2.2/32

interface eth0
  ip address 10.0.12.2/30

interface eth1
  ip address 10.0.23.1/30

router ospf
  ospf router-id 2.2.2.2
  network 2.2.2.2/32 area 0
  network 10.0.12.0/30 area 0
  network 10.0.23.0/30 area 0
  passive-interface lo
  auto-cost reference-bandwidth 10000

exit

write memory
```

## Router C Configuration

```
configure terminal

hostname RouterC

interface lo
  ip address 3.3.3.3/32

interface eth0
  ip address 10.0.13.2/30

interface eth1
  ip address 10.0.23.2/30

router ospf
  ospf router-id 3.3.3.3
  network 3.3.3.3/32 area 0
  network 10.0.13.0/30 area 0
  network 10.0.23.0/30 area 0
  passive-interface lo
  auto-cost reference-bandwidth 10000

exit

write memory
```

## Verifying OSPF Operation

```bash
# Check neighbor state - should show FULL for all neighbors
sudo vtysh -c "show ip ospf neighbor"

# Expected output:
# Neighbor ID     Pri State           Dead Time Address         Interface
# 2.2.2.2         1   Full/-          32.469s   10.0.12.2       eth0:10.0.12.1
# 3.3.3.3         1   Full/-          35.112s   10.0.13.2       eth1:10.0.13.1

# View the OSPF database (Link State Database)
sudo vtysh -c "show ip ospf database"

# View the routing table - OSPF routes show as 'O' or 'O IA' (inter-area)
sudo vtysh -c "show ip route ospf"

# Also check the kernel routing table
ip route show | grep ospf
```

## Multi-Area OSPF

For larger networks, dividing OSPF into multiple areas reduces the LSA flood scope and the size of each router's LSDB. Area 0 is always the backbone; all other areas must connect to it.

```
configure terminal

router ospf
  ! Network in a non-backbone area
  network 10.20.0.0/24 area 1

  ! This router becomes an Area Border Router (ABR)
  ! It will summarize area 1 routes when advertising to area 0
  area 1 range 10.20.0.0/16

exit

write memory
```

## Stub Areas

A stub area does not receive external LSAs (type 5), reducing the LSDB size for routers in that area. Routers in a stub area use a default route to reach external destinations.

```
configure terminal

router ospf
  ! Configure area 2 as a stub area
  area 2 stub

  ! On the ABR, inject a default route into the stub area
  area 2 stub no-summary

exit

write memory
```

## Route Redistribution

Inject routes from other protocols (static, connected, BGP) into OSPF:

```
configure terminal

router ospf
  ! Redistribute static routes into OSPF
  redistribute static metric 20 metric-type 2

  ! Redistribute connected interfaces not covered by 'network' statements
  redistribute connected

  ! Redistribute a default route (requires a default route in the RIB)
  default-information originate always metric 100

exit

write memory
```

## OSPF Authentication

Protect OSPF against unauthorized routers joining the domain:

```
configure terminal

interface eth0
  ! MD5 authentication on this interface
  ip ospf authentication message-digest
  ip ospf message-digest-key 1 md5 MyOSPFSecret

router ospf
  ! Or configure authentication per-area
  area 0 authentication message-digest

exit

write memory
```

## Adjusting Timers

OSPF timers control how quickly the protocol detects and reacts to topology changes:

```
configure terminal

interface eth0
  ! Hello interval: how often hellos are sent (default 10s for broadcast)
  ip ospf hello-interval 5

  ! Dead interval: how long before a neighbor is declared dead (default 40s)
  ip ospf dead-interval 20

exit

write memory
```

## Troubleshooting

```bash
# Check if OSPF packets are being sent and received
sudo tcpdump -i eth0 -n proto ospf

# Enable OSPF event debugging
sudo vtysh -c "debug ospf event"
sudo vtysh -c "debug ospf ism"  # Interface state machine
sudo vtysh -c "debug ospf nsm"  # Neighbor state machine

# View debug output
sudo journalctl -u frr -f

# If neighbors are stuck in EXSTART or EXCHANGE:
# - MTU mismatch is a common culprit
# - Check: sudo vtysh -c "show ip ospf interface eth0"
# - To ignore MTU mismatch: ip ospf mtu-ignore (on the interface)

# Show detailed interface information
sudo vtysh -c "show ip ospf interface"
```

The most common reason OSPF neighbors never reach FULL state is a mismatch in hello/dead timers, area IDs, authentication settings, or MTU. The `show ip ospf neighbor` command shows the current state, and `show ip ospf interface` shows what each interface is configured with - comparing both sides is usually enough to find the problem.
