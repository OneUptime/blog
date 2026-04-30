# Validation Summary: How to Configure IPv6 Firewall Rules on MikroTik RouterOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- MikroTik RouterOS
- IPv6
- ICMPv6
- Neighbor Discovery Protocol (NDP)
- DHCPv6 Prefix Delegation
- RouterOS firewall filter
- RouterOS IPv6 address lists

## Sources Consulted
- MikroTik RouterOS documentation, "Filter" - https://help.mikrotik.com/docs/spaces/ROS/pages/48660574/Filter
- MikroTik RouterOS documentation, "Common Firewall Matchers and Actions" - https://help.mikrotik.com/docs/spaces/ROS/pages/250708064/Common%2BFirewall%2BMatchers%2Band%2BActions
- MikroTik RouterOS documentation, "Building Advanced Firewall" - https://help.mikrotik.com/docs/spaces/ROS/pages/328513/Building%2BAdvanced%2BFirewall
- MikroTik RouterOS documentation, "Address-lists" - https://help.mikrotik.com/docs/spaces/ROS/pages/130220135/Address-lists
- MikroTik RouterOS documentation, "Connection rate" - https://help.mikrotik.com/docs/spaces/ROS/pages/131366985/Connection%2Brate
- MikroTik RouterOS documentation, "Connection tracking" - https://help.mikrotik.com/docs/spaces/ROS/pages/130220087/Connection%20tracking
- MikroTik RouterOS documentation, "IP Addressing" - https://help.mikrotik.com/docs/spaces/ROS/pages/328247/IP%2BAddressing
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)" - https://www.rfc-editor.org/rfc/rfc4861
- RFC 4291, "IP Version 6 Addressing Architecture" - https://www.rfc-editor.org/rfc/rfc4291

## Issues Found
- The description claimed the post covered input, forward, and output chains, but the content only documented input and forward rules. I corrected the description so it matches the actual examples.
- The management IPv6 examples used invalid literals such as `fd00:mgmt::/48` and `2001:db8:admin::1/128`. IPv6 hextets must be hexadecimal, so I replaced them with valid example addresses.
- The NDP examples restricted ICMPv6 types 133-136 to `src-address=fe80::/10`. That is too strict for Neighbor Solicitation and can break valid traffic such as Duplicate Address Detection, because RFC 4861 allows the unspecified source address for some NS messages. I replaced the source-address restriction with `hop-limit=equal:255`, which matches MikroTik's documented strict ICMPv6 approach for on-link ND traffic.
- The post dropped all other input traffic without documenting the DHCPv6 client exception MikroTik shows for prefix delegation. I added the UDP/546 accept rule for DHCPv6 client replies when DHCPv6-PD is in use.
- The connection-limit example used `connection-limit=5,32` while describing it as per `/128`. In RouterOS, the netmask portion defines the prefix size being counted, so I corrected it to `connection-limit=5,128` and added `connection-state=new` per MikroTik's guidance.
- The connection-rate example used invalid syntax (`connection-rate=100/1s`) and described connection-rate as if it were a new-connection rate limiter. RouterOS documents connection-rate as a throughput matcher with range syntax, so I changed the example to a valid connection-rate match and renamed the section accordingly.
- The rule-management commands used `remove numbers=`, `set numbers=`, and `move numbers=... destination=...`, which are not the documented common command forms in RouterOS CLI references. I replaced them with the standard item-id forms: `remove 5`, `disable 5`, `enable 5`, and `move 5 2`.
- The summary said to allow NDP types 133-137 from link-local only and to always log before drop. I corrected that summary to reflect the fixed NDP behavior, the DHCPv6-PD exception, and MikroTik's note that logging every drop can add CPU load.

## Review Notes
- The examples are now technically consistent with current RouterOS documentation, but interface names such as `bridge1` and `ether1-wan` still assume a particular local naming scheme and may need to be adjusted on a real router.
- MikroTik's simple firewall example accepts ICMPv6 broadly, while the advanced firewall guide shows stricter type-based matching. The post remains in the stricter style, which is valid once the ND handling is corrected.
