# Validation Summary: How to Configure IPv6 QoS Policies on Juniper Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Juniper Junos
- IPv6
- Class of Service (CoS)
- DSCP and DSCP IPv6
- Scheduler maps and forwarding classes
- Junos firewall filters

## Sources Consulted
- Juniper Networks, `dscp (Class of Service)` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/dscp-edit-class-of-service.html
- Juniper Networks, `dscp-ipv6 (Class of Service)` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/dscp-ipv6-edit-cos.html
- Juniper Networks, `buffer-size (Schedulers)` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/buffer-size-edit-cos.html
- Juniper Networks, `show class-of-service interface` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-class-of-service-interface.html
- Juniper Networks, `show class-of-service classifier` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-class-of-service-classifier.html
- Juniper Networks, `show interfaces queue` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-interfaces-queue.html
- Juniper Networks, `Guidelines for Configuring Firewall Filters`: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/firewall-filter-stateless-guidelines-for-configuring.html
- Juniper Networks, `Applying DSCP and DSCP IPv6 Classifiers on ACX Series Routers`: https://www.juniper.net/documentation/us/en/software/junos/cos/topics/concept/cos-applying-ba-classifiers-acx-series.html
- Juniper Networks, `Junos OS Class of Service User Guide for Routers`: https://www.juniper.net/documentation/us/en/software/junos/cos/cos.pdf

## Issues Found
- The post claimed IPv6 QoS configuration was identical to IPv4 and used `dscp` objects throughout. I corrected the explanation and changed the IPv6-specific examples to use `dscp-ipv6` classifiers and rewrite rules, which is the correct Junos syntax for IPv6-specific DSCP handling.
- The classifier examples used `code-point` under classifier definitions. I changed these to `code-points`, which is the correct Junos classifier syntax.
- The scheduler example used `buffer-size temporal 5ms`. I changed this to `buffer-size temporal 5000` because Junos expects the temporal buffer value in microseconds.
- The scheduler example used `random-early-detection medium`, which is not valid Junos scheduler syntax. Junos configures RED/WRED through drop profiles and `drop-profile-map`, so I removed the invalid line.
- The rewrite-rule example only defined mappings for a subset of the forwarding classes used elsewhere in the post. I added the missing `VOIP-SIGNAL` and `DATA` rewrite mappings so the example is internally consistent.
- The monitoring section used `monitor interface ge-0/0/0` and `test class-of-service dscp-classifier ...`, which are not valid as written for this use. I replaced them with valid operational commands: `monitor interface traffic ge-0/0/0` and `show interfaces queue ge-0/0/0`.
- The interface application example attached `dscp` objects to the IPv6 interface. I updated those interface bindings to `dscp-ipv6`.

## Review Notes
- CoS support is platform-specific in Junos. Forwarding classes, queue numbers, and whether DSCP or DSCP IPv6 is applied at physical or logical interface level can vary by router family and release.
- Some Junos platforms can use one DSCP or DSCP IPv6 classifier/rewrite object for both IPv4 and IPv6 traffic on a physical interface, but the IPv6-specific object type remains `dscp-ipv6`; the original “single IPv4-style classifier for everything” explanation was too broad.
