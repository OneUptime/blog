# Validation Summary: How to Set Up IPFIX Export on Network Devices

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPFIX
- NetFlow v9
- Cisco IOS XE Flexible NetFlow
- Juniper Junos inline active flow monitoring
- Open vSwitch
- GoFlow2
- nfdump / nfcapd

## Sources Consulted
- RFC 7011, IP Flow Information Export (IPFIX): https://www.rfc-editor.org/rfc/rfc7011
- RFC 3954, Cisco Systems NetFlow Services Export Version 9: https://www.rfc-editor.org/rfc/rfc3954.html
- IANA service name and port registry for IPFIX: https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=ipfix
- Cisco IOS XE Flexible NetFlow IPFIX export documentation: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ntw-servs/b-network-services/m_fnf-ipfix-export.html
- Cisco IOS XE Flexible NetFlow v9 export documentation: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ntw-servs/b-network-services/m_fnf-v9-export.pdf
- Juniper IPFIX template and sampling documentation: https://www.juniper.net/documentation/us/en/software/junos/flow-monitoring/topics/concept/services-ipfix-flow-template-flow-aggregation-configuring.html
- Juniper `flow-server` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/flow-server-edit-forwarding-options-sv.html
- Juniper inline flow monitoring overview: https://www.juniper.net/documentation/us/en/software/junos/flow-monitoring/topics/task/inline-flow-monitoring.html
- Open vSwitch `ovs-vswitchd.conf.db(5)` IPFIX table reference: https://www.openvswitch.org/support/dist-docs/ovs-vswitchd.conf.db.5.pdf
- GoFlow2 project README: https://github.com/netsampler/goflow2
- `nfcapd(1)` man page: https://manpages.debian.org/bookworm/nfdump/nfcapd.1.en.html
- `nfdump(1)` man page: https://manpages.debian.org/testing/nfdump/nfdump.1.en.html

## Issues Found
- The Junos example used the wrong hierarchy and omitted required sampling/export statements. I replaced it with a valid inline active flow monitoring example that defines an IPFIX template under `services flow-monitoring`, exports it from `forwarding-options sampling`, and enables interface sampling.
- The GoFlow2 Docker examples exposed UDP 4739 but did not change GoFlow2 from its documented default NetFlow/IPFIX listen port of 2055. I added `-listen 'netflow://:4739'` and corrected the file and Kafka transport flags to documented forms.
- The GoFlow2 file-output example used `-transport.file.path`, which is not the documented flag. I changed it to `-transport.file`.
- The `nfcapd` example used `-T all`, which is not a valid `nfcapd` option. I removed it and kept a valid listener command.
- The `nfdump` examples used `-R` where a simple directory read with `-r` is clearer, and the time-window format used `:now`, which does not match the documented `start-end` syntax. I corrected both commands.
- The transport explanation implied TCP support was a defining difference from NetFlow v9, which is too broad. I replaced that wording with an accurate distinction about standardized IPFIX port assignment.
- The conclusion stated that IPFIX should use 4739 instead of 2055. I corrected this to say 4739 is the IANA-assigned IPFIX port, while other configured ports such as 2055 are also common in practice.
- The verification block was labeled as `bash` even though it mixed Cisco CLI and shell commands. I changed the fence to `text` and aligned the Cisco show command with the documented syntax.

## Review Notes
- Cisco Flexible NetFlow syntax and supported match/collect fields vary somewhat by platform and software release, but the corrected Cisco section is consistent with current IOS XE Flexible NetFlow IPFIX documentation.
- Junos IPFIX configuration is especially platform-specific. The corrected example is appropriate for platforms that use inline active flow monitoring, but operators should still confirm platform support and hierarchy details for their exact hardware and Junos release.
- Open vSwitch IPFIX configuration in the post was technically consistent with the current database schema reference and did not require changes.
