# Validation Summary: How to Compare NetFlow vs sFlow vs IPFIX for Your Network

## Status
validated

## Post Type
Guide / comparison

## Technologies Covered
- NetFlow v5/v9
- Cisco Flexible NetFlow (FNF)
- sFlow
- IPFIX
- tcpdump
- nfdump
- ElastiFlow
- ntopng
- Telegraf
- PMacct
- Open vSwitch

## Sources Consulted
- RFC 3954, Cisco Systems NetFlow Services Export Version 9: https://www.rfc-editor.org/rfc/rfc3954.html
- RFC 7011, Specification of the IPFIX Protocol: https://datatracker.ietf.org/doc/html/rfc7011
- RFC 3176, InMon Corporation's sFlow: https://www.rfc-editor.org/rfc/rfc3176.html
- sFlow.org developer specifications: https://sflow.org/developers/specifications.php
- sFlow packet sampling guidance: https://sflow.org/packetSamplingBasics/
- IANA service name and port registry for IPFIX: https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=ipfix
- IANA service name and port registry for sFlow: https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=sflow
- IANA service name and port registry showing port 2055 assignment: https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=2055
- Cisco NetFlow configuration guide for Cisco 8000 Series Routers: https://www.cisco.com/c/en/us/td/docs/iosxr/cisco8000/netflow/configuration/b-netflow-configuration-ios-xr-8000/monitor-traffic-using-netflow.html
- Cisco IOS NetFlow overview: https://www.cisco.com/c/en/us/td/docs/ios/12_4/netflow/configuration/guide/onf_ov.html
- Cisco Flexible NetFlow command reference: https://www.cisco.com/c/en/us/td/docs/ios/fnetflow/command/reference/fnf_book/fnf_02.html
- nfdump official repository: https://github.com/phaag/nfdump
- nfcapd man page: https://manpages.debian.org/bookworm/nfdump/nfcapd.1.en.html
- ElastiFlow flow collector documentation: https://www.elastiflow.com/docs/6.2/flowcoll/supported_ie/
- ntopng documentation: https://www.ntop.org/guides/ntopng/what_is_ntopng.html
- Telegraf netflow input plugin: https://docs.influxdata.com/telegraf/v1/input-plugins/netflow/
- Telegraf sflow input plugin: https://docs.influxdata.com/telegraf/v1/input-plugins/sflow/
- PMacct project site: https://www.pmacct.net/
- Open vSwitch features: https://www.openvswitch.org/features/

## Issues Found
- The comparison table presented NetFlow and IPFIX accuracy as if they always export all flows and described protocol-level link speed limits. I changed these to unsampled/exporter-dependent wording because the standards do not define 10G-style protocol limits and both NetFlow/IPFIX can be sampled or unsampled depending on exporter behavior.
- The table listed NetFlow as `2055 (UDP)` without qualification and IPFIX as `4739 (UDP/TCP)` only. I clarified that NetFlow export ports are configurable with `2055/UDP` being common, and I corrected IPFIX transport to include `SCTP`, which is defined in RFC 7011 and registered by IANA.
- The NetFlow verification example used an SNMP OID/comment that was not reliable as a generic NetFlow cache verification method. I replaced it with a generic `tcpdump` check on a common NetFlow export port so the command matches the behavior being described.
- The sFlow section said sampled headers can see application data and gave a fixed `10G -> 1:2000 -> ~5000 samples/sec` rule. I narrowed this to sampled packet headers and replaced the numeric example with guidance that samples per second depend on packet size and traffic mix.
- The IPFIX section described IPFIX as the standardized version of NetFlow v9 and said collectors must handle template negotiation. I corrected this to say IPFIX is based on NetFlow v9 and that collectors must cache and decode exporter templates; the protocol uses templates, but this is not a negotiation mechanism.
- The NetFlow recommendation mentioned `BGP AS-path` visibility. I changed this to `BGP AS, next-hop, or MPLS label visibility` because NetFlow/FNF exports BGP-related fields such as AS numbers and next hop, not the full AS path attribute.
- The collector matrix said `nfdump/nfcapd` does not support sFlow. I corrected the row to `nfdump (nfcapd/sfcapd)` with sFlow support, matching the current nfdump project documentation.

## Review Notes
- `2055/UDP` is commonly used for NetFlow in Cisco-oriented deployments, but it is not an IANA-assigned NetFlow-specific port. `4739` is the IANA-assigned default for IPFIX.
- Telegraf currently documents both `inputs.sflow` and `inputs.netflow`; the current docs recommend `inputs.netflow` as the more modern implementation while still documenting the dedicated sFlow input.
