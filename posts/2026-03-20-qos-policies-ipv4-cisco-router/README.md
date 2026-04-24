# How to Configure QoS Policies for IPv4 on a Cisco Router

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, QoS, IPv4, MQC, Networking, DSCP

Description: Configure Modular QoS CLI (MQC) on a Cisco IOS router to classify, mark, and prioritize IPv4 traffic with class maps and policy maps.

Cisco IOS uses Modular QoS CLI (MQC) for traffic shaping, policing, and prioritization. The process involves defining class-maps (traffic classifiers), policy-maps (actions), and applying them to interfaces.

## Step 1: Define Class Maps

Class maps identify traffic based on matching criteria:

```text
! Match VoIP traffic (RTP or DSCP EF)
class-map match-any VOIP
 match ip dscp ef
 match protocol rtp

! Match interactive web traffic
class-map match-any WEB
 match protocol http
 match protocol secure-http

! Match SSH traffic
class-map match-any MANAGEMENT
 match protocol ssh
 match protocol telnet
```

## Step 2: Create a Policy Map

Policy maps define what to do with traffic that matches each class:

```text
! Define the QoS policy
policy-map WAN-QOS

 ! VoIP traffic: strict priority queue
 class VOIP
  priority percent 30
  ! Strict-priority treatment for up to 30% of link bandwidth during congestion

 ! Web traffic: minimum bandwidth guarantee
 class WEB
  bandwidth percent 40
  ! 40% guaranteed; can borrow unused bandwidth

 ! Management traffic: minimum guarantee
 class MANAGEMENT
  bandwidth percent 10

 ! Everything else: minimum 20% with per-flow fairness
 class class-default
  fair-queue
  bandwidth percent 20
```

## Step 3: Apply the Policy to an Interface

```text
interface GigabitEthernet0/0
 description WAN Link
 ip address 203.0.113.1 255.255.255.252
 ! Allow the policy's class percentages to total 100%
 max-reserved-bandwidth 100
 ! Apply QoS outbound on the WAN interface
 service-policy output WAN-QOS
```

For inbound policing:

```text
policy-map INBOUND-POLICE
 class class-default
  police cir 50000000
   conform-action transmit
   exceed-action drop

interface GigabitEthernet0/0
 service-policy input INBOUND-POLICE
```

## Step 4: DSCP Marking

Mark traffic at the edge router so downstream devices honor the markings:

```text
policy-map DSCP-MARKING
 class VOIP
  set ip dscp ef
 class WEB
  set ip dscp af21
 class MANAGEMENT
  set ip dscp cs6
 class class-default
  set ip dscp default

interface GigabitEthernet0/1
 description LAN Interface
 service-policy input DSCP-MARKING
```

## Verification Commands

```text
! View all QoS policy configurations
show policy-map

! View QoS applied to an interface
show policy-map interface GigabitEthernet0/0

! Check statistics including matched packets and drops per class
show policy-map interface GigabitEthernet0/0 output

! View class map details
show class-map

! Reset QoS counters
clear counters GigabitEthernet0/0
```

## Sample Output of show policy-map interface

```text
GigabitEthernet0/0
  Service-policy output: WAN-QOS

    Class-map: VOIP (match-any)
      0 packets, 0 bytes
      30 second offered rate 0 bps, drop rate 0 bps
      Match: ip dscp ef (46)
      Queueing
        priority level 1
        (total drops) 0

    Class-map: WEB (match-any)
      1500 packets, 1234567 bytes
      30 second offered rate 4560 bps, drop rate 0 bps
      Queueing
        queue limit 64 packets
        (total drops) 0
```

Cisco MQC provides a consistent approach to QoS across IOS router platforms and integrates with DSCP-based end-to-end QoS designs.
