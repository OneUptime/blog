# Validation Summary: How to Build an IPv6 Test Lab in EVE-NG

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- EVE-NG
- EVE-NG API
- IPv6
- FRRouting (FRR)
- Cisco IOS / IOS-XE
- Juniper Junos / vSRX
- OSPFv3
- BGP for IPv6

## Sources Consulted
- EVE-NG API - https://www.eve-ng.net/index.php/how-to-eve-ng-api/
- EVE-NG QEMU image naming - https://www.eve-ng.net/index.php/documentation/qemu-image-namings/
- EVE-NG custom Linux host image workflow - https://www.eve-ng.net/index.php/documentation/howtos/howto-create-own-linux-host-image/
- EVE-NG supported images - https://www.eve-ng.net/index.php/documentation/supported-images/
- EVE-NG feature comparison - https://www.eve-ng.net/index.php/features-compare/
- FRR Basic Setup - https://docs.frrouting.org/en/latest/setup.html
- FRR OSPFv3 documentation - https://docs.frrouting.org/en/latest/ospf6d.html
- FRR BGP documentation - https://docs.frrouting.org/en/latest/bgp.html
- Cisco IOS XE OSPFv3 Address Families - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ip6-route-ospfv3-add-fam-xe.html
- Cisco IOS XE OSPFv3 interface syntax example - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_iro-vrf-lite-pe-ce.html
- Cisco IOS IPv6 Command Reference, `ipv6 ospf network` - https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_08.html
- Cisco IOS IPv6 Command Reference, `show bgp ipv6 unicast summary` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s1.html
- Junos BGP family statement - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/family-edit-protocols-bgp.html
- Junos router ID statement - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/router-id-edit-routing-options.html
- Junos basic BGP routing policies - https://www.juniper.net/documentation/us/en/software/junos/bgp/topics/topic-map/basic-routing-policies.html
- Junos OSPF passive interface statement - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/passive-edit-protocols-ospf.html
- Junos `show route protocol` command - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-route-protocol.html
- Junos `show bgp summary` command - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-bgp-summary.html

## Issues Found
- The overview described EVE-NG as if it only ran KVM router VMs and treated FRR like a native EVE-NG image type. I corrected the wording to match the official EVE-NG model: vendor images plus Linux guests that can run FRR.
- The FRR section used the wrong directory tree (`/opt/unetlab/addons/iol/bin/`) and a custom startup script pattern that is not the documented EVE-NG Linux image workflow. I replaced it with the official Linux QEMU image layout, `virtioa.qcow2`, permission fix, and FRR installation/enabling steps inside the guest.
- The API example used HTTP Basic Auth, but the official EVE-NG API documents a login endpoint that establishes a session cookie. I changed the example to use `requests.Session()` with `/api/auth/login`.
- The lab creation example omitted the required `path` field for `POST /api/labs`. I added `path` to the `create_lab` payload.
- The node creation example omitted `type: "qemu"` and used raw lab paths without URL encoding. I added the node type and encoded the lab path in follow-up API calls.
- The network creation helper labeled the network as a bridge but defaulted to `pnet0`, which is not the documented bridge example. I changed the default network type to `bridge`.
- The Cisco BGP example advertised `2001:db8:1::/48` even though only `2001:db8:1::1/128` was configured locally, so the `network` statement would not originate the route as written. I corrected it to advertise the actual `/128`.
- The Cisco OSPFv3 example used older-style configuration. I updated it to current `router ospfv3` and `ospfv3 ... ipv6 area` syntax documented for modern IOS XE.
- The Junos example lacked an explicit router ID and lacked an export policy for the local loopback prefix. Junos does not export direct or IGP routes to BGP by default, so I added `routing-options router-id` and a simple export policy for the loopback route.
- The validation script assumed every node supported Cisco-style operational commands. I rewrote it to use Cisco, Junos, and FRR-specific verification commands.
- The conclusion incorrectly said Cisco and Juniper image support requires commercial licensing. I corrected it to reflect Community Edition image-template support and positioned Pro as adding workflow and multi-user features.

## Review Notes
- EVE-NG’s own API page notes that some documented parameters can lag the live implementation. The revised example follows the documented login and endpoint patterns, but version-specific UI/API inspection can still be useful.
- The FRR approach remains a Linux guest workflow, not a dedicated FRR appliance template supplied by EVE-NG.
- I did not run a live EVE-NG lab or vendor images in this workspace, so validation is based on official documentation review rather than runtime execution.
