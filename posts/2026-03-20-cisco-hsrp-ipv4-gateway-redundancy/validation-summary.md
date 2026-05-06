# Validation Summary: How to Configure HSRP for IPv4 Gateway Redundancy on Cisco

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco HSRP
- Cisco IOS / IOS XE interface configuration
- IPv4 default gateway redundancy
- HSRPv1 and HSRPv2
- BFD with HSRP

## Sources Consulted
- Cisco: Understand the Hot Standby Router Protocol Features and Functionality - https://www.cisco.com/c/en/us/support/docs/ip/hot-standby-router-protocol-hsrp/9234-hsrpguidetoc.html
- Cisco: HSRP Version 2 - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipapp_fhrp/configuration/15-s/fhp-15-s-book/HSRP-Version-2.html
- Cisco: Review Hot Standby Router Protocol (HSRP) FAQ - https://www.cisco.com/c/en/us/support/docs/ip/hot-standby-router-protocol-hsrp/9281-3.html
- Cisco: Cisco IOS IP Application Services Command Reference, `standby authentication`, `standby timers`, `standby track`, `standby version` - https://www.cisco.com/c/en/us/td/docs/ios/ipapp/command/reference/iap_s5.html
- Cisco: Cisco IOS First Hop Redundancy Protocols Command Reference, `standby bfd` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipapp_fhrp/command/fhp-cr-book/fhp-s2.html
- Cisco: Cisco IOS IP Application Services Command Reference, `show standby` - https://www.cisco.com/c/en/us/td/docs/ios/ipapp/command/reference/iap_s4.html
- Cisco: Configuring HSRP - https://www.cisco.com/en/US/docs/ios-xml/ios/ipapp_fhrp/configuration/15-0s/fhp-hsrp.html

## Issues Found
- The introduction said the standby router takes over "immediately." I changed this to say failover occurs after HSRP detects the failure, because default HSRP failover depends on hello and hold timers unless faster detection such as BFD is in use.
- The interface tracking example used incorrect syntax: `standby 1 track GigabitEthernet0/1 20`. I corrected it to `standby 1 track GigabitEthernet0/1 decrement 20`, which matches Cisco's command reference for interface tracking with an explicit priority decrement.
- The Router 2 multi-VLAN example was incomplete as a working configuration. I added the missing subinterface encapsulation, IPv4 addresses, virtual IP statements, and `preempt` lines so the mirrored HSRP example is technically usable as shown.
- The BFD example used `standby 1 bfd`, which does not match Cisco's documented command syntax. I corrected it to `standby bfd` and clarified that HSRP BFD peering is enabled by default when BFD is configured, so this command is only needed to re-enable it if it was disabled.
- The conclusion used the shorthand command `standby preempt`, which is not the correct syntax for a numbered HSRP group. I changed it to `standby <group> preempt` so the command reference is technically accurate.

## Review Notes
- The MD5 key string example is syntactically valid, but Cisco recommends using at least 16 characters for HSRP MD5 key strings in production.
- The post now accurately references HSRP BFD peering, but it still assumes BFD itself has been configured separately on the device or interface.
- The millisecond timer example is consistent with the post's HSRPv2 guidance; HSRPv2 advertises and learns millisecond timer values, unlike HSRPv1.
