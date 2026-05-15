# Validation Summary: How to Configure Quality of Service (QoS) with Traffic Control on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux Traffic Control (`tc`)
- HTB qdisc and classes
- u32 filters
- fq_codel
- DSCP, EF, and AF41 markings

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Linux traffic control": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/linux-traffic-control_configuring-and-managing-networking
- `tc(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/tc.8.html
- `tc-htb(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/tc-htb.8.html
- `tc-u32(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/tc-u32.8.html
- `tc-fq_codel(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/tc-fq_codel.8.html
- RFC 2598, "An Expedited Forwarding PHB": https://www.rfc-editor.org/rfc/rfc2598
- RFC 2597, "Assured Forwarding PHB Group": https://www.rfc-editor.org/rfc/rfc2597
- Local `tc` help output for HTB, u32, and fq_codel syntax.

## Issues Found
- The post described the example flow as "Incoming Packets", but a root qdisc on an interface controls traffic before transmission. Changed the introduction and diagram label to make the example explicitly about traffic leaving an interface.
- Several port filters matched only destination ports. Added matching source-port filters for DNS, HTTP, HTTPS, API port 8080, rsync, and FTP so egress traffic is classified correctly whether the host is acting as a client or server.
- The "Complete QoS Script" omitted filters for API port 8080 and FTP that were shown earlier in the step-by-step configuration. Added those filters and the corresponding source-port matches.
- The monitoring section described `overlimits` as borrowed bandwidth. Red Hat documents `overlimits` as times the configured link capacity is filled, so the description was corrected.

## Review Notes
The examples are syntactically consistent with current `tc`, HTB, u32, and fq_codel usage. The DSCP EF and AF41 values and the shifted TOS values are correct for IPv4 DS field matching with `u32 match ip tos` and mask `0xfc`.
