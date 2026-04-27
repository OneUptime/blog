# How to Configure OSPF on Linux Using FRRouting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, OSPF, FRRouting, Linux, Routing

Description: Learn how to install FRRouting and configure OSPFv2 on Linux to exchange routes dynamically with other OSPF routers.

## What Is OSPF?

OSPF (Open Shortest Path First) is a link-state interior gateway routing protocol. It:
- Discovers neighbors via Hello packets
- Exchanges Link State Advertisements (LSAs) to build a topology map
- Calculates shortest paths using Dijkstra's algorithm
- Supports VLSM and classless routing
- Scales well within an organization (enterprise routing protocol)

## Installing FRRouting

```bash
# Ubuntu/Debian

curl -s https://deb.frrouting.org/frr/keys.gpg | \
    sudo tee /usr/share/keyrings/frrouting.gpg > /dev/null
FRRVER="frr-stable"
echo deb '[signed-by=/usr/share/keyrings/frrouting.gpg]' https://deb.frrouting.org/frr \
    $(lsb_release -s -c) $FRRVER | sudo tee -a /etc/apt/sources.list.d/frr.list
sudo apt update && sudo apt install frr frr-pythontools

# RHEL/Rocky 9 (adjust el9 to match your distro: el7, el8, el9, el10)
FRRVER="frr-stable"
curl -O https://rpm.frrouting.org/repo/$FRRVER-repo.el9.noarch.rpm
sudo yum install ./$FRRVER-repo.el9.noarch.rpm
sudo yum install frr frr-pythontools
```

## Enable OSPF Daemon

```bash
# /etc/frr/daemons
# Change ospfd=no to ospfd=yes
sed -i 's/ospfd=no/ospfd=yes/' /etc/frr/daemons

# Restart FRR
systemctl restart frr
systemctl status frr
```

## Basic OSPF Configuration

```bash
# Enter FRR vtysh shell
vtysh
```

```text
! Basic OSPF configuration
configure terminal

! Enable OSPF process
router ospf

! Set the router ID (usually the highest loopback IP)
ospf router-id 1.1.1.1

! Advertise networks into OSPF area 0 (backbone)
network 192.168.1.0/24 area 0
network 10.0.0.0/30 area 0

! Optional: set passive interface (don't send OSPF Hellos on LAN)
passive-interface eth0

exit
```

## OSPF Interface Configuration

```text
! Set OSPF cost on an interface
interface eth1
 ip ospf cost 10
 ip ospf hello-interval 5
 ip ospf dead-interval 20
exit
```

## Multi-Area OSPF

```text
router ospf
 ospf router-id 2.2.2.2
 network 10.1.0.0/24 area 0       ! Backbone area
 network 10.2.0.0/24 area 1       ! Area 1
 network 10.3.0.0/24 area 2       ! Area 2
exit
```

## Redistributing Routes

```text
router ospf
 ! Redistribute connected routes into OSPF
 redistribute connected metric 10 metric-type 2

 ! Redistribute static routes
 redistribute static

 ! Redistribute BGP routes
 redistribute bgp
exit
```

## Verify OSPF Operation

```bash
vtysh -c "show ip ospf neighbor"
vtysh -c "show ip ospf database"
vtysh -c "show ip ospf route"
vtysh -c "show ip ospf interface"
```

Sample `show ip ospf neighbor`:

```text
Neighbor ID     Pri State           Dead Time Address         Interface
2.2.2.2           1 Full/DR         00:00:37  10.0.0.2        eth1:10.0.0.1
3.3.3.3           1 Full/BDR        00:00:38  10.0.0.3        eth1:10.0.0.1
```

## OSPF Configuration File

Save configuration:

```bash
vtysh -c "write memory"

# Saved to /etc/frr/frr.conf:
cat /etc/frr/frr.conf
```

## Key Takeaways

- Install FRRouting with `ospfd=yes` in `/etc/frr/daemons`.
- Use `vtysh` to configure OSPF with Cisco-like CLI.
- `network X.X.X.X/xx area Y` advertises a prefix into OSPF area Y.
- `show ip ospf neighbor` confirms adjacencies are formed (Full state = healthy).

**Related Reading:**

- [How to Configure BGP on Linux Using FRRouting](https://oneuptime.com/blog/post/2026-03-20-bgp-linux-frrouting/view)
- [How to Configure RIP on Linux Using FRRouting](https://oneuptime.com/blog/post/2026-03-20-rip-linux-frrouting/view)
- [How to Understand Administrative Distance in Routing](https://oneuptime.com/blog/post/2026-03-20-administrative-distance-routing/view)
