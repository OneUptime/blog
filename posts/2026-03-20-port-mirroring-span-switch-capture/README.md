# How to Set Up Port Mirroring (SPAN) on a Switch for Packet Capture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Span, Port Mirroring, Switch, Packet Capture, Network Monitoring

Description: Learn how to configure Switched Port Analyzer (SPAN) port mirroring on Cisco, Arista, and Linux bridge switches to copy traffic from monitored ports to a capture device running Wireshark or tcpdump.

## What Is SPAN/Port Mirroring?

SPAN (Switched Port Analyzer) copies traffic from one or more source ports to a destination port where a packet capture device is connected. The capture device receives a copy of all traffic - not just traffic destined for it.

```mermaid
graph LR
    A[Server A<br/>GE0/1] --> SW[Switch]
    B[Server B<br/>GE0/2] --> SW
    SW --> C[Capture Device<br/>GE0/10 - SPAN destination]

    SW -.->|mirror copy| C
```

## Step 1: Configure SPAN on Cisco IOS

```text
! Monitor a single port (GigabitEthernet0/1)
! Send copy to GigabitEthernet0/10 (where capture device is connected)

Switch# configure terminal

! Create SPAN session 1
Switch(config)# monitor session 1 source interface GigabitEthernet0/1 both
Switch(config)# monitor session 1 destination interface GigabitEthernet0/10

! Options for source direction:
! both  = capture TX and RX
! tx    = capture only transmitted (leaving the port)
! rx    = capture only received (arriving at the port)

! Verify
Switch# show monitor session 1
!
! Session 1
! ---------
! Type                   : Local Session
! Source Ports           :
!     Both               : Gi0/1
! Destination Ports      : Gi0/10
!     Encapsulation      : Native
!         Ingress        : Disabled
```

## Step 2: Mirror Multiple Source Ports

```text
! Mirror multiple specific ports
Switch(config)# monitor session 1 source interface GigabitEthernet0/1 - 5 both

! Or mirror traffic entering or leaving VLAN 100
Switch(config)# monitor session 1 source vlan 100

! Or mirror traffic entering or leaving multiple VLANs
Switch(config)# monitor session 1 source vlan 100, 200, 300

! Cisco IOS does not allow source interfaces and source VLANs
! to be combined in the same SPAN session

! Remove a SPAN session
Switch(config)# no monitor session 1
```

## Step 3: Configure RSPAN (Remote SPAN Across Switches)

```text
! RSPAN sends mirrored traffic across the network to a remote switch

! Source switch configuration
Switch-Source(config)# vlan 999
Switch-Source(config-vlan)# remote-span
Switch-Source(config-vlan)# exit

Switch-Source(config)# monitor session 1 source interface GigabitEthernet0/1 both
Switch-Source(config)# monitor session 1 destination remote vlan 999

! Destination switch (where capture device is)
Switch-Dest(config)# vlan 999
Switch-Dest(config-vlan)# remote-span
Switch-Dest(config-vlan)# exit

Switch-Dest(config)# monitor session 1 source remote vlan 999
Switch-Dest(config)# monitor session 1 destination interface GigabitEthernet0/10
```

## Step 4: Configure Port Mirroring on Linux with tc

```bash
# Linux interface mirroring with tc (traffic control)

# Add mirror rule: copy all traffic from eth1 to eth2 (capture device)

sudo tc qdisc add dev eth1 clsact
sudo tc filter add dev eth1 ingress matchall \
    action mirred egress mirror dev eth2

# Mirror outgoing traffic too
sudo tc filter add dev eth1 egress matchall \
    action mirred egress mirror dev eth2

# Verify mirrors are active
tc filter show dev eth1 ingress
tc filter show dev eth1 egress

# Remove mirror
sudo tc qdisc del dev eth1 clsact
```

## Step 5: Configure on Arista EOS

```text
! Arista EOS SPAN configuration

Switch# configure
Switch(config)# monitor session 1 source Ethernet1 both
Switch(config)# monitor session 1 destination Ethernet10

! Verify
Switch# show monitor session 1
Session 1
------------------------
Source Ports:
  Both:        Et1
Destination Port: Et10
```

## Step 6: Capture and Analyze Mirrored Traffic

```bash
# On the capture device connected to SPAN destination port
# The capture NIC must accept frames not addressed to it.
# tcpdump enables promiscuous mode by default unless you use -p.

# Enable promiscuous mode
sudo ip link set eth0 promisc on

# Verify
ip link show eth0 | grep -o 'PROMISC'

# Capture all mirrored traffic
sudo tcpdump -i eth0 -n -w /tmp/span-capture.pcap

# Capture with filter (even on mirrored traffic)
sudo tcpdump -i eth0 -n 'host 192.168.1.50' -w /tmp/server-traffic.pcap

# Open in Wireshark
wireshark /tmp/span-capture.pcap
```

## Step 7: SPAN Best Practices and Limitations

```text
Limitations:
1. SPAN destination port is typically dedicated to monitoring traffic
2. SPAN may drop packets during congestion (hardware limit)
3. Too many source ports can oversubscribe destination
4. SPAN session limits are platform-dependent and can be low on some switches

Best Practices:
1. Use RX-only mirroring when possible to reduce capture load
2. Filter at SPAN level if your platform supports filtered mirroring:
   Switch(config)# monitor session 1 filter ip access-group ACL_NAME

3. Monitor SPAN session health:
   Switch# show monitor session all

4. Use a dedicated NIC for the capture device so mirrored traffic does not interfere with normal host traffic
```

## Conclusion

SPAN/port mirroring copies traffic from source ports to a capture device at the switch hardware level. Configure on Cisco IOS with `monitor session 1 source interface Gi0/1 both` + `monitor session 1 destination interface Gi0/10`. On Linux, use `tc filter` with `action mirred egress mirror`. The capture NIC must accept mirrored frames; `tcpdump` normally enables promiscuous mode unless `-p` is used. Use RSPAN to extend port mirroring across multiple switches to a centralized capture location.
