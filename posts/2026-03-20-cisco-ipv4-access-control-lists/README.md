# How to Configure IPv4 Access Control Lists on a Cisco Router

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, IPv4, ACL, Access Control, IOS, Networking, Security

Description: Configure standard and extended IPv4 ACLs on Cisco IOS routers to filter traffic by source address, protocol, and port, and apply them to interfaces in the correct direction.

## Introduction

Cisco IPv4 ACLs filter packets entering or exiting an interface. Standard ACLs match only source IP; extended ACLs match source, destination, protocol, and ports. Correct placement and direction are critical - an ACL applied in the wrong direction or on the wrong interface either blocks legitimate traffic or does nothing.

## Standard ACL - Permit Specific Subnet

```cisco
! Permit only 192.168.1.0/24 - deny everything else
ip access-list standard ALLOW-MGMT
 permit 192.168.1.0 0.0.0.255
 deny   any

! Apply inbound on management VTY lines
line vty 0 4
 access-class ALLOW-MGMT in
```

## Extended ACL - Block Specific Traffic

```cisco
ip access-list extended EDGE-FILTER
 ! Block RFC 1918 sourced traffic from outside
 deny ip 10.0.0.0 0.255.255.255 any
 deny ip 172.16.0.0 0.15.255.255 any
 deny ip 192.168.0.0 0.0.255.255 any
 ! Allow TCP return traffic (ACK/RST set)
 permit tcp any 10.0.0.0 0.255.255.255 established
 ! Allow ICMP ping replies to internal hosts
 permit icmp any 10.0.0.0 0.255.255.255 echo-reply
 ! Allow DNS queries to internal DNS
 permit udp any host 10.1.1.10 eq 53
 ! Explicit final deny with logging
 deny ip any any log

! Apply inbound on WAN interface
interface GigabitEthernet0/0
 description WAN
 ip access-group EDGE-FILTER in
```

## Named ACL - Block a Host

```cisco
ip access-list extended BLOCK-HOST
 deny ip host 203.0.113.5 any log
 permit ip any any

interface GigabitEthernet0/1
 description LAN
 ip access-group BLOCK-HOST in
```

## Verify ACL Configuration

```cisco
! Show ACL entries
show ip access-lists

! Show ACL match counts
show ip access-lists EDGE-FILTER

! Show where ACL is applied
show ip interface GigabitEthernet0/0

! Clear ACL counters
clear ip access-list counters EDGE-FILTER
```

## ACL Direction Reference

```text
Inbound  (in):  Applied as packet arrives on the interface
                Filters traffic ENTERING the router
                Best for: blocking traffic from untrusted sources

Outbound (out): Applied as packet leaves the interface
                Filters traffic LEAVING the router
                Best for: controlling what specific hosts can send
```

## Time-Based ACL

```cisco
time-range BUSINESS-HOURS
 periodic weekdays 08:00 to 18:00

ip access-list extended TIME-BASED
 permit tcp 10.1.0.0 0.0.255.255 any eq 443 time-range BUSINESS-HOURS
 deny   tcp 10.1.0.0 0.0.255.255 any eq 443
 permit ip any any
```

## Conclusion

Standard ACLs filter by source IP and are ideal for VTY protection; extended ACLs can also match destination, protocol, and TCP/UDP ports for granular policies. Place standard ACLs near the destination and extended ACLs near the source, use the `log` keyword selectively on deny entries, and verify match counters with `show ip access-lists` after deployment.
