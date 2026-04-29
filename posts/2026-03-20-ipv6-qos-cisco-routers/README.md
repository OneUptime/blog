# How to Configure IPv6 QoS Policies on Cisco Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, IPv6, QoS, DSCP, MQC, IOS, Router, Quality of Service

Description: Configure IPv6 Quality of Service policies on Cisco IOS routers using Modular QoS CLI (MQC), including traffic classification, DSCP marking, and queuing policies.

---

Cisco IOS uses Modular QoS CLI (MQC) for IPv6 QoS configuration. The same MQC framework that handles IPv4 QoS also applies to IPv6, with IPv6-specific match conditions for protocol and address matching.

## IPv6 Class Maps for Traffic Classification

```text
! Cisco IOS - IPv6 QoS Class Maps

! Match VoIP media over IPv6
class-map match-any IPV6-VOIP-MEDIA
 match dscp ef
 ! Or match by protocol/port:
 ! match protocol rtp audio
 description "IPv6 VoIP RTP Traffic"

! Match SIP signaling over IPv6
class-map match-any IPV6-VOIP-SIGNALING
 match dscp cs5
 match dscp af31

! Match interactive traffic
class-map match-any IPV6-INTERACTIVE
 match dscp cs3
 match dscp af21

! Match video streaming
class-map match-any IPV6-VIDEO
 match dscp af41
 match dscp af42
 match dscp af43

! Match IPv6 network control
class-map match-any IPV6-CONTROL
 match dscp cs6
 match dscp cs7
 match protocol ipv6-icmp

! Match IPv6 bulk data (low priority)
class-map match-any IPV6-BULK
 match dscp cs1
 match dscp af11

! Default class
class-map match-any IPV6-DEFAULT
 match any
```

## IPv6 Policy Maps for QoS Actions

```text
! Cisco IOS - IPv6 QoS Policy Maps

! Egress policy for WAN interface
policy-map IPV6-WAN-EGRESS
 !
 class IPV6-VOIP-MEDIA
  priority percent 20
  police cir percent 20
   conform-action transmit
   exceed-action drop
 !
 class IPV6-VOIP-SIGNALING
  bandwidth percent 5
  queue-limit 32 packets
 !
 class IPV6-VIDEO
  bandwidth percent 15
  fair-queue
 !
 class IPV6-INTERACTIVE
  bandwidth percent 10
 !
 class IPV6-CONTROL
  bandwidth percent 5
 !
 class IPV6-BULK
  bandwidth percent 5
  shape average 512000
 !
 class class-default
  bandwidth percent 15
  fair-queue
```

## Applying IPv6 QoS Policy to Interface

```text
! Apply policy to WAN interface
interface GigabitEthernet0/0
 description "WAN Interface"
 ipv6 address 2001:db8::1/64
 service-policy output IPV6-WAN-EGRESS

! For ingress marking/policing
policy-map IPV6-LAN-INGRESS
 class IPV6-VOIP-MEDIA
  set dscp ef
 class IPV6-VOIP-SIGNALING
  set dscp cs5
 class class-default
  set dscp default

interface GigabitEthernet0/1
 description "LAN Interface"
 ipv6 address 2001:db8:1:1::1/64
 service-policy input IPV6-LAN-INGRESS
```

## DSCP Remarking for IPv6

```text
! Remark inbound IPv6 DSCP for policy compliance
policy-map IPV6-REMARK
 class IPV6-VOIP-MEDIA
  set dscp ef
 class IPV6-VIDEO
  set dscp af41
 class IPV6-INTERACTIVE
  set dscp af31
 class class-default
  set dscp default

! Apply on ingress from untrusted network
interface GigabitEthernet0/2
 description "Internet Ingress"
 ipv6 address 2001:db8:1:2::1/64
 service-policy input IPV6-REMARK
```

## Monitoring IPv6 QoS

```text
! Verify QoS policy application
show policy-map interface GigabitEthernet0/0

! Expected output shows:
! - Class name
! - Packet/byte counts per class
! - Queue drops
! - Police conform/exceed stats

! Show policy configuration for a specific class
show policy-map IPV6-WAN-EGRESS class IPV6-VOIP-MEDIA

! Check DSCP remarking statistics on ingress
show policy-map interface GigabitEthernet0/2

! Show IPv6 protocol counters
show ipv6 traffic

! Queue depth and drop counters are also visible in show policy-map interface output
```

## IPv6 LLQ (Low-Latency Queuing) for VoIP

```text
! Low-Latency Queuing ensures VoIP gets strict priority

policy-map IPV6-LLQ
 class IPV6-VOIP-MEDIA
  priority 384        ! 384 kbps strict priority (LLQ)
 class IPV6-VIDEO
  bandwidth 768       ! 768 kbps guaranteed bandwidth
 class class-default
  fair-queue

interface Serial0/1/0
 description "T1 WAN Link"
 ipv6 address 2001:db8:1:3::1/64
 service-policy output IPV6-LLQ
```

Cisco's MQC framework applies uniformly to IPv6 QoS with the same `class-map`, `policy-map`, and `service-policy` commands, with DSCP-based classification working identically against the IPv6 Traffic Class field and the IPv4 DS field.
