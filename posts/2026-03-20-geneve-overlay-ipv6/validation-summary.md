# Validation Summary: How to Configure Geneve Overlay with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Geneve
- VXLAN
- IPv6
- Linux `iproute2`
- Open Virtual Network (OVN)
- Open vSwitch (OVS)

## Sources Consulted
- RFC 8926: Geneve: Generic Network Virtualization Encapsulation - https://www.rfc-editor.org/rfc/rfc8926
- RFC 7348: Virtual eXtensible Local Area Network (VXLAN) - https://www.rfc-editor.org/rfc/rfc7348
- `ip-link(8)` local man page and `ip link help geneve`
- OVN Docker/overlay setup documentation - https://docs.ovn.org/en/latest/howto/docker.html
- `ovn-controller(8)` - https://www.ovn.org/support/dist-docs/ovn-controller.8.html
- `ovn-architecture(7)` - https://www.ovn.org/support/dist-docs/ovn-architecture.7.html
- `ovsdb(7)` connection methods - https://docs.openvswitch.org/en/stable/ref/ovsdb.7/

## Issues Found
- The post said Geneve "supersedes VXLAN and NVGRE". RFC 8926 does not frame it that way; it describes Geneve as building on the common data-plane functionality of existing overlay protocols. I changed the wording to avoid overstating the standards relationship.
- The manual `ip link add ... type geneve` example annotated a "local VTEP" even though the shown `iproute2` syntax only sets `remote` for Geneve and leaves source-address selection to routing. I corrected the comment to describe the remote VTEP actually configured by the command.
- The point-to-point MTU example used `1442` with a `58`-byte overhead comment. For a standard Ethernet Geneve device over IPv6, the effective reduction is `70` bytes, so the example MTU should be `1430`. I corrected both the MTU value and the explanation.
- The OVN example incorrectly stored `ovn-encap-type` and `ovn-encap-ip` in `other_config`. OVN documents these under `external_ids`, so I moved the keys there and updated the verification command to read `external_ids`.
- The OVN example used `ssl:[2001:db8::db]:6642` without any accompanying TLS configuration. Since `ssl:` connection methods require certificate, key, and CA configuration, I changed the example to `tcp:[2001:db8::db]:6642` to keep the snippet technically correct as shown.
- The tunnel verification commands used `ovs-vsctl show | grep ...`, which is not a reliable way to enumerate Geneve interfaces. I replaced them with `ovs-vsctl -- --columns=name,type,options list Interface`, which accurately exposes interface type and tunnel options.
- The overhead section claimed base Geneve over IPv6 is `70` bytes while VXLAN over IPv6 is `62` bytes. RFC 8926 and RFC 7348 both define 8-byte base tunnel headers, so the base overlay reduction is the same for Geneve and VXLAN in this Ethernet-over-IPv6 context. I corrected the comparison and clarified that OVN typically adds one 8-byte Geneve TLV.
- The monitoring section said the `traceroute` command "verify encapsulation", but the command as written traces the IPv6 underlay path between tunnel endpoints. I corrected the description and made the IPv6 family explicit with `-6`.

## Review Notes
- OVN's preferred encapsulation between hypervisors is Geneve because it can carry the extra metadata OVN needs in TLV options.
- The MTU example in the post now reflects base Geneve overhead. OVN deployments usually need to budget for the additional Geneve option used for OVN metadata, which brings the typical total to `78` bytes.
- If the deployment uses TLS for the Southbound database, `ssl:` is appropriate, but it must be paired with the required Open vSwitch SSL configuration.
