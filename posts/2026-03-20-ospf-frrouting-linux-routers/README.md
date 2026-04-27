# How to Set Up OSPF on FRRouting (FRR) for Linux Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPF, FRRouting, FRR, Linux, Routing, Open Source

Description: Learn how to install and configure OSPF on FRRouting for Linux, including enabling the OSPF daemon, advertising networks, and verifying neighbor adjacencies.

## Installing FRR with OSPF Support

FRR is a modular routing suite. Each protocol has its own daemon. For OSPF, you need the `ospfd` daemon enabled.

## Step 1: Install FRR and Enable OSPF Daemon

```bash
# Install FRR on Ubuntu/Debian

sudo apt-get update
sudo apt-get install -y frr

# Enable the OSPF daemon (and optionally bgpd, zebra is always required)
sudo sed -i 's/ospfd=no/ospfd=yes/' /etc/frr/daemons

# The zebra daemon (master routing daemon) must also be enabled
sudo sed -i 's/zebra=no/zebra=yes/' /etc/frr/daemons

# Restart FRR to load the OSPF daemon
sudo systemctl restart frr
sudo systemctl enable frr

# Verify OSPF daemon is running
sudo systemctl status frr
ps aux | grep ospfd
```

## Step 2: Enable IP Forwarding on Linux

```bash
# Enable IPv4 forwarding
sudo sysctl -w net.ipv4.ip_forward=1

# Make persistent
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-forwarding.conf
```

## Step 3: Configure OSPF via vtysh

Access the FRR CLI with vtysh:

```bash
sudo vtysh
```

Configure OSPF:

```text
hostname# configure terminal

! Start OSPF process
hostname(config)# router ospf

! Set Router ID explicitly
hostname(config-router)# ospf router-id 1.1.1.1

! Advertise networks into OSPF Area 0
hostname(config-router)# network 10.0.0.0/24 area 0
hostname(config-router)# network 192.168.1.0/24 area 0

! Set passive interface on LAN-facing interface (no OSPF Hellos to hosts)
hostname(config-router)# passive-interface eth1

hostname(config-router)# end

! Save the configuration
hostname# write memory
```

## Step 4: Configure OSPF on a Specific Interface

Alternatively, configure OSPF directly on the interface:

```text
hostname# configure terminal

! Activate OSPF on eth0 in Area 0
hostname(config)# interface eth0
hostname(config-if)# ip ospf area 0
hostname(config-if)# ip ospf cost 10
hostname(config-if)# ip ospf hello-interval 10
hostname(config-if)# ip ospf dead-interval 40
hostname(config-if)# end
```

## Step 5: Configure OSPF via Config File

Edit `/etc/frr/frr.conf` directly for batch configuration:

```bash
# /etc/frr/frr.conf
frr version 9.0
frr defaults traditional

interface eth0
 ip ospf area 0
 ip ospf cost 10
!
interface eth1
 ip ospf area 0
 ip ospf passive
!
router ospf
 ospf router-id 1.1.1.1
 passive-interface default
 no passive-interface eth0
!
```

Reload FRR after changes:

```bash
sudo systemctl reload frr
```

## Step 6: Verify OSPF Neighbors

```bash
sudo vtysh -c "show ip ospf neighbor"

# Expected output:
# Neighbor ID     Pri State           Dead Time Address         Interface
# 2.2.2.2           1 Full/DR         30.989s   10.0.0.2        eth0:10.0.0.1
```

## Step 7: Check OSPF Routes in the Routing Table

```bash
# Show OSPF routes from FRR CLI
sudo vtysh -c "show ip route ospf"

# Show routes in the Linux kernel routing table (populated by FRR)
ip route show proto ospf

# Expected output:
# 172.16.0.0/24 via 10.0.0.2 dev eth0 proto ospf metric 20
```

## Step 8: Add OSPF Authentication

```text
hostname# configure terminal
hostname(config)# interface eth0
! MD5 authentication
hostname(config-if)# ip ospf authentication message-digest
hostname(config-if)# ip ospf message-digest-key 1 md5 OSPFSecret!
hostname(config-if)# end
```

## Conclusion

FRR brings production-quality OSPF to Linux routers. Enable the `ospfd` daemon, configure it via `vtysh` using familiar Cisco-like syntax, and ensure Linux IP forwarding is active. FRR integrates OSPF routes directly into the Linux kernel routing table, making it suitable for software routers, network appliances, and Kubernetes nodes.
