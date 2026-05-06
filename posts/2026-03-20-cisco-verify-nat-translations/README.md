# How to Verify NAT Translations on a Cisco Router

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, NAT, IPv4, IOS, Troubleshooting, Verification

Description: Verify NAT translations on a Cisco IOS router using show and debug commands to confirm correct address mapping, translation counts, and identify NAT-related connectivity issues.

## Introduction

After configuring NAT, verification is essential. Cisco provides several show commands to inspect active translation tables, hit counters, and NAT statistics. Debug commands provide real-time translation logging for troubleshooting.

## Show Commands

```cisco
! Show all active NAT translations
show ip nat translations

! Show with more detail (interface, timeout, flags)
show ip nat translations verbose

! Show NAT statistics (hits, misses, drops)
show ip nat statistics

! Show only translations for a specific protocol
show ip nat translations tcp
show ip nat translations udp
show ip nat translations icmp
```

## Interpreting the Translation Table

```yaml
show ip nat translations

Pro  Inside global      Inside local        Outside local       Outside global
tcp  203.0.113.2:1024   10.1.0.10:45678     8.8.8.8:53          8.8.8.8:53
tcp  203.0.113.2:1025   10.1.0.11:51234     93.184.216.34:80    93.184.216.34:80
---  203.0.113.5        10.1.10.100         ---                 ---

Column definitions:
  Inside global:  translated (public) IP:port
  Inside local:   original private IP:port
  Outside local:  external destination (same as outside global for basic NAT)
  Outside global: actual external IP:port
```

## NAT Statistics

```cisco
show ip nat statistics

! Example output:
! Total active translations: 47 (2 static, 45 dynamic; 45 extended)
! Outside interfaces: GigabitEthernet0/0
! Inside interfaces:  GigabitEthernet0/1, Vlan10
! Hits: 25430   Misses: 12
! CEF Translated packets: 25418, CEF Punted packets: 12
! Expired translations: 1234
! Dynamic mappings:
!  -- Inside Source
!     access-list NAT-INSIDE interface GigabitEthernet0/0 refcount 45
```

## Debug NAT (Use with Caution on Production)

```cisco
! Enable debug - shows real-time NAT decisions
debug ip nat

! Filtered debug for a specific host
access-list 10 permit host 10.1.0.10
debug ip nat 10

! Stop debug
no debug ip nat
! Or
undebug all

! Example debug output:
! NAT: s=10.1.0.10->203.0.113.2, d=8.8.8.8 [1025]
! NAT*: s=8.8.8.8, d=203.0.113.2->10.1.0.10 [1025]
```

## Clearing Stale Translations

```cisco
! Clear all dynamic translations
clear ip nat translation *

! Clear specific entry
clear ip nat translation inside 203.0.113.2 10.1.0.10 forced

! Clear by protocol and port
clear ip nat translation tcp inside 203.0.113.2 1024 10.1.0.10 45678 outside 8.8.8.8 53 8.8.8.8 53
```

## Troubleshooting Checklist

```text
[ ] Are inside/outside interfaces correctly marked?
    show ip interface GigabitEthernet0/0 | include NAT

[ ] Is the ACL matching the correct source traffic?
    show ip access-lists NAT-INSIDE

[ ] Does the routing table have a default route toward the NAT outside interface?
    show ip route 0.0.0.0 0.0.0.0

[ ] Are translations being created (hits incrementing)?
    show ip nat statistics

[ ] Is CEF enabled on the platform? (useful for confirming the expected forwarding path)
    show ip cef
```

## Conclusion

Use `show ip nat translations` to confirm active mappings and `show ip nat statistics` to verify hit counts and identify drops. Use `debug ip nat` briefly on production (it generates high CPU) and, if possible, filter it with a standard ACL that matches the host you are testing to limit output. Clear the translation table when troubleshooting or after configuration changes.
