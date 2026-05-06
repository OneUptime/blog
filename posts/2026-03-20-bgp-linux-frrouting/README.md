# How to Configure BGP on Linux Using FRRouting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, BGP, FRRouting, Linux, Routing

Description: Learn how to install FRRouting and configure BGP on Linux to exchange routes with peers using both iBGP and eBGP sessions.

## What Is BGP?

BGP (Border Gateway Protocol) is the internet's routing protocol. It:
- Exchanges network reachability information between Autonomous Systems (AS)
- Is used between ISPs (eBGP) and within large organizations (iBGP)
- Makes policy-based routing decisions based on AS path, communities, and attributes
- Is the protocol that makes the global internet routing table work

## Installing FRRouting

```bash
# Ubuntu/Debian

curl -s https://deb.frrouting.org/frr/keys.gpg | sudo tee /usr/share/keyrings/frrouting.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/frrouting.gpg] https://deb.frrouting.org/frr $(lsb_release -s -c) frr-stable" | \
    sudo tee /etc/apt/sources.list.d/frr.list
sudo apt update && sudo apt install frr frr-pythontools

# Enable BGP daemon
sudo sed -i 's/bgpd=no/bgpd=yes/' /etc/frr/daemons
sudo systemctl restart frr
```

## Basic eBGP Configuration

Two ASes exchanging routes:

```text
AS 65001 (our router): 10.0.0.1
AS 65002 (peer router): 10.0.0.2
```

```text
vtysh
configure terminal

router bgp 65001
 bgp router-id 1.1.1.1
 
 ! eBGP neighbor in AS 65002
 neighbor 10.0.0.2 remote-as 65002
 neighbor 10.0.0.2 description "Peer AS 65002"

 ! Advertise our prefix (must exist in the local routing table)
 address-family ipv4 unicast
  network 192.168.1.0/24
  neighbor 10.0.0.2 activate
 exit-address-family

exit
```

## iBGP Configuration (Within Same AS)

iBGP requires full mesh or route reflectors:

```text
router bgp 65001
 bgp router-id 1.1.1.1

 ! iBGP neighbor (same AS)
 neighbor 2.2.2.2 remote-as 65001
 neighbor 2.2.2.2 update-source lo    ! Use loopback for stability

 address-family ipv4 unicast
  neighbor 2.2.2.2 activate
  neighbor 2.2.2.2 next-hop-self      ! Update next-hop for iBGP
 exit-address-family
exit
```

## Route Reflector Configuration

For large iBGP deployments, configure route reflectors to avoid full mesh:

```text
router bgp 65001
 bgp router-id 3.3.3.3
 neighbor 1.1.1.1 remote-as 65001
 neighbor 2.2.2.2 remote-as 65001

 address-family ipv4 unicast
  neighbor 1.1.1.1 route-reflector-client   ! Client 1
  neighbor 2.2.2.2 route-reflector-client   ! Client 2
 exit-address-family
exit
```

## Filtering with Prefix Lists and Route Maps

```text
! Create prefix list (allow only specific prefixes)
ip prefix-list ALLOW_ONLY seq 5 permit 192.168.1.0/24
ip prefix-list ALLOW_ONLY seq 10 deny 0.0.0.0/0 le 32

! Create route map
route-map FILTER_IN permit 10
 match ip address prefix-list ALLOW_ONLY
exit

! Apply to neighbor
router bgp 65001
 neighbor 10.0.0.2 route-map FILTER_IN in
exit
```

## Verifying BGP

```bash
# Check BGP neighbors
vtysh -c "show bgp summary"

# Show BGP table
vtysh -c "show bgp ipv4 unicast"

# Show specific prefix
vtysh -c "show bgp ipv4 unicast 192.168.1.0/24"

# Show routes received from neighbor
vtysh -c "show bgp neighbors 10.0.0.2 received-routes"

# Show routes sent to neighbor
vtysh -c "show bgp neighbors 10.0.0.2 advertised-routes"
```

Sample `show bgp summary`:

```text
Neighbor        V         AS   MsgRcvd   MsgSent   TblVer  InQ OutQ  Up/Down State/PfxRcd
10.0.0.2        4      65002       325       320        1    0    0  02:10:15            5
```

## BGP Communities

```text
! Tag outbound routes with a community
route-map TAG_COMMUNITY permit 10
 set community 65001:100
exit

router bgp 65001
 neighbor 10.0.0.2 route-map TAG_COMMUNITY out
exit
```

## Key Takeaways

- Enable BGP with `bgpd=yes` in `/etc/frr/daemons`.
- eBGP connects different ASes; iBGP connects routers within the same AS.
- `neighbor IP remote-as ASN` defines a BGP peer.
- `network PREFIX` advertises a prefix from your AS when that prefix exists in the local routing table.
- Use prefix lists and route maps for filtering and policy.

**Related Reading:**

- [How to Configure OSPF on Linux Using FRRouting](https://oneuptime.com/blog/post/2026-03-20-ospf-linux-frrouting/view)
- [How to Configure RIP on Linux Using FRRouting](https://oneuptime.com/blog/post/2026-03-20-rip-linux-frrouting/view)
- [How to Understand Administrative Distance in Routing](https://oneuptime.com/blog/post/2026-03-20-administrative-distance-routing/view)
