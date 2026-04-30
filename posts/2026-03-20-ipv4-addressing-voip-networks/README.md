# How to Plan IPv4 Addressing for Voice Over IP (VoIP) Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, VoIP, Network Design, QoS, VLAN, SIP, RTP

Description: Design dedicated IPv4 subnets for VoIP networks with separate VLANs for phones and call servers, QoS marking, and DHCP option 150/66 for phone provisioning.

## Introduction

VoIP traffic is sensitive to latency (< 150 ms), jitter (< 30 ms), and packet loss (< 1%). Placing phones on a dedicated IPv4 subnet and VLAN, separate from data traffic, makes it possible to enforce QoS policies that protect voice quality.

## VoIP Network Architecture

```text
Data VLAN   (VLAN 10):  10.1.10.0/24   - workstations
Voice VLAN  (VLAN 20):  10.1.20.0/24   - IP phones
Call Server (VLAN 30):  10.1.30.0/24   - PBX, SIP proxy, voicemail
```

## Subnet Sizing for VoIP

```python
import ipaddress, math

def voip_subnet(phone_count: int) -> str:
    """Minimum subnet for phone_count phones + PBX + gateways."""
    total = phone_count + 5  # PBX, TFTP, NTP, admin, spare
    bits = math.ceil(math.log2(total + 2))
    prefix = 32 - bits
    return f"/{prefix}  ({2**bits - 2} usable)"

for count in [20, 50, 100, 250, 500]:
    print(f"{count:4d} phones → {voip_subnet(count)}")
```

## DHCP Configuration with Options 66 and 150

```text
# ISC DHCP for voice VLAN

subnet 10.1.20.0 netmask 255.255.255.0 {
  range 10.1.20.10 10.1.20.200;
  option routers 10.1.20.1;
  option domain-name-servers 10.1.1.10;
  option tftp-server-name "10.1.30.5";    # Option 66
  option tftp-server-address 10.1.30.5;  # Option 150
  default-lease-time 86400;
  max-lease-time    172800;
}
```

## Cisco Switch Voice VLAN

```cisco
mls qos
!
! Access port - data + voice
interface GigabitEthernet1/0/1
 description IP-Phone-Port
 switchport mode access
 switchport access vlan 10
 switchport voice vlan 20
 mls qos trust cos
 spanning-tree portfast
!
! Layer 3 SVI for voice
interface Vlan20
 description Voice-VLAN
 ip address 10.1.20.1 255.255.255.0
 ip helper-address 10.1.1.20    ! DHCP server
```

## QoS Policy for VoIP Traffic

```cisco
! Example: mark RTP voice traffic in a common UDP port range as EF (DSCP 46)
ip access-list extended VOICE-RTP
 permit udp 10.1.20.0 0.0.0.255 any range 16384 32767

class-map match-all VOICE
 match access-group name VOICE-RTP

policy-map QOS-POLICY
 class VOICE
  priority percent 30          ! Strict priority queue
  set dscp ef
 class class-default
  fair-queue

interface GigabitEthernet0/1
 service-policy output QOS-POLICY
```

## NAT Considerations for SIP

```text
SIP and SDP can advertise private IPv4 addresses that break signaling or media across NAT.
With NAT, use one of:
  1. Session Border Controller (SBC) at the network edge or provider edge
  2. ICE with STUN/TURN for endpoint and media traversal
  3. NAT keepalives and symmetric RTP, depending on platform support
  4. SIP ALG only if your provider or platform specifically requires it

Disable SIP ALG if using a dedicated SBC:
  (Cisco): no ip nat service sip
```

## Sample IPv4 Plan for 200-Person Office

```text
VLAN 20 - Voice:    10.1.20.0/24  (200 phones, 54 spare)
VLAN 30 - Servers:  10.1.30.0/28  (PBX, TFTP, Voicemail, NTP)
VLAN 10 - Data:     10.1.10.0/23  (workstations - separate)
```

## Conclusion

Dedicate a separate IPv4 subnet and VLAN to VoIP, configure DHCP option 150/66 for phone auto-provisioning, enforce QoS DSCP EF marking, and use strict-priority queuing for RTP streams. Keep the voice subnet isolated from data to prevent broadcast storms and security incidents from impacting call quality.
