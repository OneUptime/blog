# Validation Summary: How to Understand IPv6 Tunneling Mechanisms Overview

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv4
- IPv6-in-IPv4 tunneling
- 6in4 / SIT
- 6to4
- 6rd
- Teredo
- ISATAP
- GRE
- Linux networking commands (`ip`, `tcpdump`, `modinfo`)

## Sources Consulted
- RFC 4213: Basic Transition Mechanisms for IPv6 Hosts and Routers - https://www.rfc-editor.org/rfc/rfc4213.html
- RFC 3056: Connection of IPv6 Domains via IPv4 Clouds - https://www.rfc-editor.org/rfc/rfc3056.html
- RFC 5969: IPv6 Rapid Deployment on IPv4 Infrastructures (6rd) -- Protocol Specification - https://www.rfc-editor.org/rfc/rfc5969.html
- RFC 4380: Teredo: Tunneling IPv6 over UDP through Network Address Translations (NATs) - https://www.rfc-editor.org/rfc/rfc4380.html
- RFC 5214: Intra-Site Automatic Tunnel Addressing Protocol (ISATAP) - https://www.rfc-editor.org/rfc/rfc5214.html
- RFC 2784: Generic Routing Encapsulation (GRE) - https://www.rfc-editor.org/rfc/rfc2784.html
- RFC 7526: Deprecating the Anycast Prefix for 6to4 Relay Routers - https://www.rfc-editor.org/rfc/rfc7526.html
- RFC 7123: Security Implications of IPv6 on IPv4 Networks - https://www.rfc-editor.org/rfc/rfc7123.html
- Microsoft Learn: Deprecated features in the Windows client - https://learn.microsoft.com/en-us/windows/whats-new/deprecated-features
- Local command help: `ip tunnel help`
- Local command help: `man pcap-filter`
- Local command output: `modinfo sit`

## Issues Found
- The overview said tunneling in general is deprecated for production use. I narrowed this to automatic transition mechanisms, because manually configured tunnels such as 6in4 and GRE are still valid and documented use cases.
- The 6to4 section said the 192.88.99.1 relay was "decommissioned." I changed this to say the anycast relay mechanism was deprecated, which matches RFC 7526 more precisely.
- The 6rd example labeled a `/64` as a host prefix. I corrected this to `CE IPv4` and `6rd delegated prefix`, which matches RFC 5969 terminology.
- The Teredo section implied that servers sit in the normal data path and used imprecise Windows 11 wording. I corrected the diagram and text to show that servers are used for setup/maintenance while relays forward traffic, and I replaced the Windows note with Microsoft's documented status: deprecated and disabled since Windows 10 version 1803.
- The ISATAP section claimed removal from Windows Server 2022 and later without a supporting authoritative source. I replaced that with Microsoft's documented status that ISATAP is deprecated and has been disabled by default since Windows 10 version 1703.
- The summary overgeneralized the mechanism categories and omitted GRE from the blocking guidance. I softened the categorization and aligned the final blocking recommendation with the earlier security section.

## Review Notes
- The Linux command examples are syntactically valid on the current toolchain checked locally. `tcpdump -i eth0 "proto 41"` is accepted by `pcap-filter`, and the `sit` tunnel commands match current `iproute2` syntax.
- The 6rd example is valid, but actual delegated prefix length depends on the deployment's `6rdPrefixLen` and `IPv4MaskLen` values.
