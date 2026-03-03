# How to Configure IS-IS Routing with FRRouting on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Routing, FRRouting

Description: Set up IS-IS routing protocol on Ubuntu using FRRouting to build link-state routing in data center and carrier networks with proper area configuration and adjacency.

---

IS-IS (Intermediate System to Intermediate System) is a link-state routing protocol widely used in service provider and large data center networks. Like OSPF, it builds a topology map by flooding link-state information and runs Dijkstra's shortest path algorithm to build routing tables. IS-IS operates directly over Layer 2 rather than over IP, which makes it slightly more resilient in certain failure scenarios. FRRouting (FRR) provides IS-IS support on Ubuntu alongside its other routing protocol daemons.

## IS-IS Concepts

Before configuring, a few key concepts:

- **NET (Network Entity Title)**: The IS-IS address for a router. Format is: `Area.SystemID.Selector`. Example: `49.0001.1921.6800.1001.00`
- **Area**: IS-IS networks are divided into areas. Level-1 routing is intra-area, Level-2 is inter-area (backbone).
- **Level-1**: Routers within the same area exchange L1 LSPs.
- **Level-2**: L2-capable routers form the backbone connecting areas.
- **Level-1-2**: A router operating in both levels, connecting an area to the backbone.

For most data center deployments, a flat Level-2-only design is used, which eliminates area complexity.

## Installing FRRouting on Ubuntu

```bash
# Add the FRRouting repository
curl -s https://deb.frrouting.org/frr/keys.gpg | sudo tee /usr/share/keyrings/frrouting.gpg > /dev/null

FRRVER="frr-stable"
echo "deb [signed-by=/usr/share/keyrings/frrouting.gpg] \
  https://deb.frrouting.org/frr $(lsb_release -sc) $FRRVER" | \
  sudo tee -a /etc/apt/sources.list.d/frr.list

sudo apt update
sudo apt install -y frr frr-pythontools

# Verify installation
sudo vtysh -c "show version"
```

## Enabling the IS-IS Daemon

FRR uses individual daemons for each protocol. Enable the IS-IS daemon:

```bash
# Edit the daemons file to enable isisd
sudo nano /etc/frr/daemons
```

Set `isisd=yes`:

```text
# /etc/frr/daemons
zebra=yes
bgpd=no
ospfd=no
ospf6d=no
ripd=no
ripngd=no
isisd=yes    # Enable IS-IS
pimd=no
ldpd=no
nhrpd=no
eigrpd=no
sharpd=no
pbrd=no
bfdd=yes
fabricd=no
vrrpd=no
```

```bash
# Restart FRR to load the IS-IS daemon
sudo systemctl restart frr
sudo systemctl status frr
```

## Enabling Kernel IP Forwarding

For the router to actually forward packets:

```bash
# Enable IP forwarding
sudo nano /etc/sysctl.conf
```

Uncomment or add:

```text
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
```

```bash
sudo sysctl -p
```

## Configuring IS-IS

Connect to the FRR VTY shell:

```bash
sudo vtysh
```

### Example: Level-2-Only IS-IS Configuration (Data Center Style)

This example assumes two routers connected via interfaces `eth1` and `eth2`.

On Router 1 (NET: 49.0000.0000.0001.00):

```text
! Enter configuration mode
configure terminal

! Enable IS-IS routing process
router isis CORE
 ! Set the NET address
 ! Format: Area(49.0000) + System ID(0000.0001, derived from 10.0.0.1) + Selector(00)
 net 49.0000.0000.0001.00
 !
 ! Set this router to operate only at Level 2 (backbone)
 is-type level-2-only
 !
 ! Optionally set the hostname for easier identification
 hostname router1
 !
 ! Redistribute connected routes into IS-IS
 redistribute connected
exit

! Configure IS-IS on the interface connecting to Router 2
interface eth1
 ! Enable IS-IS on this interface
 ip router isis CORE
 !
 ! Set interface type to point-to-point for direct router connections
 ! (avoids DIS election overhead needed on broadcast segments)
 isis circuit-type level-2-only
 isis network point-to-point
 !
 ! Optional: adjust hello interval and multiplier
 isis hello-interval 3
 isis hello-multiplier 3
exit

! Add a loopback interface (used as the router ID)
interface lo
 ip address 10.0.0.1/32
 ip router isis CORE
exit

! Save configuration
end
write memory
```

On Router 2 (NET: 49.0000.0000.0002.00):

```text
configure terminal

router isis CORE
 net 49.0000.0000.0002.00
 is-type level-2-only
 hostname router2
 redistribute connected
exit

interface eth1
 ip router isis CORE
 isis circuit-type level-2-only
 isis network point-to-point
 isis hello-interval 3
 isis hello-multiplier 3
exit

interface lo
 ip address 10.0.0.2/32
 ip router isis CORE
exit

end
write memory
```

## Verifying IS-IS Adjacency

After both routers are configured, verify the adjacency formed:

```bash
# Check IS-IS neighbors (adjacencies)
sudo vtysh -c "show isis neighbor"
```

Expected output when adjacency is up:

```text
Area CORE:
  System Id           Interface   L  State        Holds  SNPAsent
  router2             eth1        2  Up            28     5
```

### Checking the IS-IS Database

```bash
# View the link-state database
sudo vtysh -c "show isis database"

# View detailed LSP information
sudo vtysh -c "show isis database detail"
```

### Verifying Routes

```bash
# Show routes learned via IS-IS
sudo vtysh -c "show ip route isis"

# Show full routing table
sudo vtysh -c "show ip route"
```

Routes learned from Router 2 should appear with the `I` or `i` prefix indicator.

## Level-1 and Level-2 Mixed Configuration

For a multi-area IS-IS setup with area routers connecting to a backbone:

```text
configure terminal

router isis ENTERPRISE
 ! This router is in area 49.0001 and connects to the Level-2 backbone
 net 49.0001.0000.0003.00
 !
 ! Level-1-2 makes this router both an area router and a backbone router
 is-type level-1-2
exit

! Interface toward area routers (Level-1 only)
interface eth0
 ip router isis ENTERPRISE
 isis circuit-type level-1
 isis network point-to-point
exit

! Interface toward backbone (Level-2 only)
interface eth1
 ip router isis ENTERPRISE
 isis circuit-type level-2-only
 isis network point-to-point
exit

end
write memory
```

## IS-IS Authentication

To prevent unauthorized routers from forming adjacencies:

```text
configure terminal

router isis CORE
 ! Area-wide authentication (for L1)
 area-password md5 your_area_password
 !
 ! Domain-wide authentication (for L2)
 domain-password md5 your_domain_password
exit

! Per-interface authentication
interface eth1
 isis authentication mode md5
 isis authentication key-chain isis-keys
exit

! Define the key chain
key chain isis-keys
 key 1
  key-string your_interface_password
  ! Set accept/send lifetimes as needed
exit

end
write memory
```

## IS-IS Metrics and Traffic Engineering

IS-IS uses a metric system to influence path selection. The default metric is 10 per interface. Adjust it to prefer certain paths:

```text
configure terminal

interface eth1
 ! Lower metric = preferred path (default is 10)
 isis metric 5
 !
 ! Wide metrics support values > 63 (needed for MPLS traffic engineering)
 isis metric 100 level-2
exit

! Enable wide metrics globally
router isis CORE
 metric-style wide
exit

end
write memory
```

## Viewing IS-IS Summary

```bash
# Summary of IS-IS status
sudo vtysh -c "show isis summary"

# Interface IS-IS status
sudo vtysh -c "show isis interface"

# Topology (SPF tree)
sudo vtysh -c "show isis topology"
```

## Troubleshooting IS-IS

If adjacency does not form:

```bash
# Enable IS-IS debug logging
sudo vtysh
debug isis adj-packets
debug isis events
debug isis hello-pkt
# Watch the output - common issues are MTU mismatch, NET area mismatch,
# or authentication failures

# Check MTU on the interface
ip link show eth1
# IS-IS PDUs must fit in a single frame; MTU mismatch prevents adjacency

# Verify the interface has IS-IS configured
sudo vtysh -c "show isis interface eth1"
```

A common issue is MTU mismatch between routers. IS-IS performs MTU checks during adjacency formation. Ensure both ends of a link have matching MTU values, or disable the check:

```text
interface eth1
 isis dont-check-mtu
```

IS-IS is a solid choice for data center spine-leaf topologies and carrier networks where fast convergence, operational simplicity, and IPv6 support (IS-IS natively carries both IPv4 and IPv6 prefixes) are priorities. FRRouting on Ubuntu provides a production-capable IS-IS implementation suitable for both lab testing and real deployments.
