# How to Configure Zone-Based Firewall on Cisco IOS for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, Zone-Based Firewall, ZBF, IPv4, IOS, Security, Stateful Inspection

Description: Configure Cisco IOS Zone-Based Firewall (ZBF) to perform stateful IPv4 inspection between security zones, replacing legacy ip inspect with policy-based traffic control.

## Introduction

Zone-Based Firewall (ZBF) replaces the legacy `ip inspect` model. Interfaces are assigned to zones; traffic between zones is controlled by zone-pair policies with inspect, drop, or pass actions. Traffic between user-defined zones is denied by default unless explicitly permitted.

## Zone Definition and Interface Assignment

```cisco
! Define security zones
zone security INSIDE
 description Internal LAN
zone security DMZ
 description Demilitarized Zone
zone security OUTSIDE
 description Internet

! Assign interfaces to zones
interface GigabitEthernet0/0
 description Internet-WAN
 zone-member security OUTSIDE

interface GigabitEthernet0/1
 description Internal-LAN
 zone-member security INSIDE

interface GigabitEthernet0/2
 description DMZ-Servers
 zone-member security DMZ
```

## Class Maps and Policy Maps

```cisco
! Match traffic for inspection
class-map type inspect match-any INSIDE-TO-OUTSIDE-TRAFFIC
 match protocol http
 match protocol https
 match protocol dns
 match protocol tcp
 match protocol udp
 match protocol icmp

class-map type inspect match-any DMZ-SERVICES
 match protocol http
 match protocol https
 match protocol smtp

! Define inspection policy
policy-map type inspect INSIDE-TO-OUTSIDE-POLICY
 class type inspect INSIDE-TO-OUTSIDE-TRAFFIC
  inspect                    ! Stateful inspection - allow return traffic
 class class-default
  drop log

policy-map type inspect OUTSIDE-TO-DMZ-POLICY
 class type inspect DMZ-SERVICES
  inspect
 class class-default
  drop

policy-map type inspect INSIDE-TO-DMZ-POLICY
 class type inspect INSIDE-TO-OUTSIDE-TRAFFIC
  inspect
 class class-default
  drop
```

## Zone-Pair Configuration

```cisco
! Apply policies to zone pairs
zone-pair security INSIDE-TO-OUTSIDE source INSIDE destination OUTSIDE
 service-policy type inspect INSIDE-TO-OUTSIDE-POLICY

zone-pair security OUTSIDE-TO-DMZ source OUTSIDE destination DMZ
 service-policy type inspect OUTSIDE-TO-DMZ-POLICY

zone-pair security INSIDE-TO-DMZ source INSIDE destination DMZ
 service-policy type inspect INSIDE-TO-DMZ-POLICY
```

## Verify ZBF

```cisco
! Show zone-pair policies
show zone-pair security

! Show policy statistics
show policy-map type inspect zone-pair INSIDE-TO-OUTSIDE

! Show active sessions
show policy-map type inspect zone-pair sessions

! Show zone assignments
show zone security
```

## Conclusion

Zone-Based Firewall provides stateful IPv4 inspection using a clean policy model. Define zones, assign interfaces, create class maps to match traffic, build inspect policy maps, and bind them to zone-pairs. Traffic not explicitly matched and inspected or passed is dropped by default, following a deny-by-default security posture.
