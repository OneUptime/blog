# How to Configure BGP with FRRouting on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, BGP, FRRouting, Networking, Routing

Description: A practical guide to installing FRRouting on Ubuntu and configuring BGP peering sessions for dynamic routing between autonomous systems.

---

FRRouting (FRR) is an open-source routing suite that provides production-grade implementations of BGP, OSPF, IS-IS, and other routing protocols. It evolved from Quagga and is now the de facto standard for software routing on Linux. This guide covers installing FRR and configuring a BGP session, including both eBGP (between different autonomous systems) and iBGP (within the same AS) scenarios.

## Understanding the Lab Setup

Before touching configuration, establish what you are trying to accomplish. BGP is complex enough that working without a diagram leads to mistakes.

For this guide, the setup is:
```
Router A: AS 65001, loopback 10.255.0.1/32, connects to 192.168.10.0/30
Router B: AS 65002, loopback 10.255.0.2/32, connects to 192.168.10.0/30

eBGP session between:
  Router A: 192.168.10.1
  Router B: 192.168.10.2
```

Both machines run Ubuntu. The same steps apply whether these are VMs, bare metal, or containers.

## Installing FRRouting

FRR is available in the Ubuntu repositories, but the FRR project's own repository usually has a more recent version:

```bash
# Add the FRR APT repository (using the stable release)
curl -s https://deb.frrouting.org/frr/keys.gpg | sudo tee /usr/share/keyrings/frrouting.gpg > /dev/null

FRRVER="frr-stable"
echo deb '[signed-by=/usr/share/keyrings/frrouting.gpg]' https://deb.frrouting.org/frr \
     $(lsb_release -s -c) $FRRVER | sudo tee -a /etc/apt/sources.list.d/frr.list

sudo apt update
sudo apt install -y frr frr-pythontools

# Verify installation
vtysh --version
```

## Enabling the BGP Daemon

FRR uses a modular daemon architecture. You enable only the protocols you need:

```bash
# Edit the daemons configuration file
sudo nano /etc/frr/daemons

# Set bgpd=yes to enable the BGP daemon
# The file looks like this - only change bgpd:
# zebra=yes    <- keep this, it manages the kernel RIB
# bgpd=yes     <- change this to yes
# ospfd=no
# ospf6d=no
# ...
```

```bash
# Start and enable FRR
sudo systemctl start frr
sudo systemctl enable frr

# Verify the BGP daemon is running
sudo systemctl status frr
ps aux | grep bgpd
```

## Configuring BGP via vtysh

`vtysh` is the Cisco-style CLI for FRR. Configuration entered here is immediately active and can be saved to the frr.conf file.

```bash
# Enter the FRR CLI
sudo vtysh
```

### Router A Configuration (AS 65001)

```
! Enter configuration mode
configure terminal

! Set the router identifier - usually the loopback IP
router bgp 65001
  bgp router-id 10.255.0.1

  ! Define the neighbor (eBGP peer on Router B)
  neighbor 192.168.10.2 remote-as 65002

  ! Give the neighbor a description for documentation
  neighbor 192.168.10.2 description Router-B-eBGP

  ! Set the update source if using loopback for iBGP
  ! neighbor 10.255.0.2 update-source lo

  ! Configure what to advertise in IPv4 unicast address family
  address-family ipv4 unicast
    ! Advertise Router A's loopback network
    network 10.255.0.1/32

    ! Advertise any locally connected subnets if needed
    ! network 192.168.20.0/24

    ! Activate the neighbor in this address family
    neighbor 192.168.10.2 activate

    ! Optionally send the default route to the peer
    ! neighbor 192.168.10.2 default-originate

    ! Apply route maps for policy if needed
    ! neighbor 192.168.10.2 route-map EXPORT-TO-B out
  exit-address-family

exit

! Save the configuration
write memory
```

### Router B Configuration (AS 65002)

```
configure terminal

router bgp 65002
  bgp router-id 10.255.0.2

  neighbor 192.168.10.1 remote-as 65001
  neighbor 192.168.10.1 description Router-A-eBGP

  address-family ipv4 unicast
    network 10.255.0.2/32
    neighbor 192.168.10.1 activate
  exit-address-family

exit

write memory
```

## Verifying the BGP Session

```bash
# Check the BGP session state - should show "Established"
sudo vtysh -c "show bgp summary"

# Expected output:
# Neighbor        V         AS   MsgRcvd   MsgSent   TblVer  InQ OutQ  Up/Down State/PfxRcd
# 192.168.10.2    4      65002        12        12        0    0    0  00:02:14            1

# View routes received from the peer
sudo vtysh -c "show bgp ipv4 unicast"

# Show routes learned from a specific neighbor
sudo vtysh -c "show bgp ipv4 unicast neighbors 192.168.10.2 received-routes"

# Show routes advertised to a specific neighbor
sudo vtysh -c "show bgp ipv4 unicast neighbors 192.168.10.2 advertised-routes"

# View the full BGP table
sudo vtysh -c "show ip bgp"
```

## Route Maps and Filtering

Production BGP always includes route filtering. Never peer with an external AS without controlling what routes you accept and advertise.

```bash
sudo vtysh
```

```
configure terminal

! Create a prefix list to filter acceptable routes
ip prefix-list ACCEPT-SPECIFIC permit 10.255.0.0/24 le 32
ip prefix-list ACCEPT-SPECIFIC deny any

! Create a route map that applies the prefix list
route-map IMPORT-FROM-B permit 10
  match ip address prefix-list ACCEPT-SPECIFIC
  ! Optionally set local-preference or MED here
  set local-preference 100
exit

! Apply the route map to the neighbor inbound
router bgp 65001
  address-family ipv4 unicast
    neighbor 192.168.10.2 route-map IMPORT-FROM-B in
  exit-address-family
exit

! After changing inbound policies, reset the session to apply
! (soft reset avoids dropping the session)
clear ip bgp 192.168.10.2 soft in

write memory
```

## Configuring BGP Timers

Default BGP timers are conservative. For lab or direct-connected peers, tighten them up:

```
configure terminal

router bgp 65001
  ! Set keepalive to 10 seconds, hold time to 30 seconds
  ! (default is 60/180)
  neighbor 192.168.10.2 timers 10 30

  ! BFD can detect link failures much faster than BGP timers
  ! neighbor 192.168.10.2 bfd

write memory
```

## Multi-Hop eBGP

When peers are not directly connected (loopback-to-loopback peering), you need to set the TTL:

```
configure terminal

router bgp 65001
  ! Allow BGP packets to traverse up to 2 hops
  neighbor 10.255.0.2 ebgp-multihop 2
  neighbor 10.255.0.2 update-source lo
  neighbor 10.255.0.2 remote-as 65002

write memory
```

## Troubleshooting BGP

```bash
# Check if the TCP session (port 179) is established
ss -tnp | grep 179

# Enable BGP debug output (use sparingly - it is verbose)
sudo vtysh -c "debug bgp neighbor-events"
sudo vtysh -c "debug bgp updates"

# View FRR logs
sudo journalctl -u frr -f

# Check if routes are being installed in the kernel routing table
ip route show | grep bgp

# Show detailed neighbor information including error codes
sudo vtysh -c "show bgp neighbors 192.168.10.2"
```

The most common reasons for BGP sessions not establishing are TCP reachability issues (the peer is not reachable on port 179), mismatched AS numbers in the configuration, or firewall rules blocking TCP port 179. Check all three before digging deeper into protocol-level debugging.
