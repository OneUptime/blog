# How to Configure BGP on FRRouting (FRR) for Linux Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, FRRouting, FRR, Linux, Routing, Open Source

Description: Learn how to install and configure BGP on FRRouting (FRR), the open-source routing suite for Linux, including neighbor peering and prefix advertisement.

## What Is FRRouting?

FRRouting (FRR) is an open-source routing protocol suite for Linux that supports BGP, OSPF, IS-IS, RIP, and more. It is widely used in network operating systems, cloud infrastructure, and software-defined networking. FRR's configuration syntax closely mirrors Cisco IOS, making it familiar to network engineers.

## Step 1: Install FRRouting on Ubuntu/Debian

```bash
# Add the FRR repository and install

sudo apt-get update
sudo apt-get install -y curl lsb-release

# Add FRR apt repository (current frr-stable track)
curl -s https://deb.frrouting.org/frr/keys.gpg | \
  sudo tee /usr/share/keyrings/frrouting.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/frrouting.gpg] https://deb.frrouting.org/frr $(lsb_release -s -c) frr-stable" | \
  sudo tee /etc/apt/sources.list.d/frr.list

sudo apt-get update
sudo apt-get install -y frr frr-pythontools

# Enable Zebra and BGP daemons
sudo sed -i 's/zebra=no/zebra=yes/' /etc/frr/daemons
sudo sed -i 's/bgpd=no/bgpd=yes/' /etc/frr/daemons

# Start FRR
sudo systemctl enable frr
sudo systemctl start frr
```

## Step 2: Configure FRR via vtysh

FRR uses `vtysh` as the unified CLI, similar to Cisco's IOS prompt:

```bash
# Enter the FRR CLI
sudo vtysh

# You'll see a prompt similar to:
# hostname#
```

## Step 3: Configure BGP

Inside vtysh, configure BGP the same way as Cisco IOS:

```text
hostname# configure terminal

! Set up BGP with AS 65001
hostname(config)# router bgp 65001

! Set the Router ID
hostname(config-router)# bgp router-id 1.1.1.1

! Configure eBGP neighbor
hostname(config-router)# neighbor 203.0.113.1 remote-as 65100
hostname(config-router)# neighbor 203.0.113.1 description Upstream-ISP
hostname(config-router)# neighbor 203.0.113.1 password MyBGPSecret

! Configure address family
hostname(config-router)# address-family ipv4 unicast

! Activate the neighbor in this address family
hostname(config-router-af)# neighbor 203.0.113.1 activate

! Advertise a network that already exists in the local routing table
hostname(config-router-af)# network 192.168.0.0/16

hostname(config-router-af)# exit-address-family
hostname(config-router)# end
```

## Step 4: Save the Configuration

```text
# Save from vtysh
hostname# write memory

# Or use the equivalent write file command
hostname# write file

# Verify the configuration
hostname# show running-config
```

## Step 5: Verify BGP Neighbors

```text
hostname# show bgp summary

Neighbor        V         AS MsgRcvd MsgSent   TblVer  InQ OutQ  Up/Down State/PfxRcd
203.0.113.1     4      65100      45      45        5    0    0 00:20:00            1

hostname# show bgp neighbors 203.0.113.1
```

## Step 6: Enable IP Forwarding on Linux

FRR handles the routing protocol, but Linux must be configured to actually forward packets:

```bash
# Enable IPv4 forwarding
sudo sysctl -w net.ipv4.ip_forward=1

# Make it permanent
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-ip-forward.conf
sudo sysctl -p /etc/sysctl.d/99-ip-forward.conf
```

## Step 7: View BGP Routes in the FRR Table

```text
! Show BGP routes
hostname# show bgp ipv4 unicast

! Show the Linux kernel routing table (populated by FRR)
hostname# show ip route bgp

! Or from the Linux shell:
$ ip route show proto bgp
```

## Direct Configuration via Config File

Alternatively, edit `/etc/frr/frr.conf` directly. The prefix you advertise with `network` must already exist in the local routing table:

```text
# /etc/frr/frr.conf
frr version 10.6
frr defaults traditional

router bgp 65001
 bgp router-id 1.1.1.1
 neighbor 203.0.113.1 remote-as 65100
 neighbor 203.0.113.1 description Upstream-ISP
 !
 address-family ipv4 unicast
  neighbor 203.0.113.1 activate
  network 192.168.0.0/16
 exit-address-family
!
```

After editing, reload FRR:

```bash
sudo systemctl reload frr
```

## Conclusion

FRRouting brings Cisco IOS-like BGP configuration to Linux routers. Install FRR, enable the Zebra and BGP daemons, configure peers and networks via `vtysh`, and ensure Linux IP forwarding is active. FRR is production-grade and used in platforms like Cumulus Linux, SONiC, and VyOS.
