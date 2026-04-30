# Validation Summary: How to Configure Flexible NetFlow to Monitor Specific IPv4 Traffic Flows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cisco Flexible NetFlow (FNF)
- Cisco IOS / IOS XE CLI configuration
- NetFlow v9 and IPFIX
- Linux flow collection with `nfdump` / `nfcapd`
- ntopng flow analysis

## Sources Consulted
- Cisco IOS XE 17 Flexible NetFlow configuration guide: https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/fnf-avc/flexible-netflow-configuration-guide.html
- Cisco IOS XE 17 Network Services Configuration Guide, Flexible NetFlow overview: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ntw-servs/b-network-services/m_fnf-fnetflow.html
- Cisco IOS XE 17 Flexible NetFlow IPFIX export format guide: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ntw-servs/b-network-services/m_fnf-ipfix-export.html
- Cisco IOS Flexible NetFlow command reference: https://www.cisco.com/c/en/us/td/docs/ios/fnetflow/command/reference/fnf_book/fnf_02.html
- Cisco IOS Flexible NetFlow command reference (`collect ipv4`, exporter syntax, related commands): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fnetflow/command/fnf-cr-book/fnf-c1.html
- RFC 3954, Cisco Systems NetFlow Services Export Version 9: https://datatracker.ietf.org/doc/html/rfc3954
- RFC 7011, IPFIX Protocol Specification: https://www.rfc-editor.org/rfc/rfc7011.html
- Official `nfdump` project documentation / README: https://github.com/phaag/nfdump
- ntopng documentation: https://www.ntop.org/guides/ntopng/what_is_ntopng.html
- ntopng `nProbe` flow collection documentation: https://www.ntop.org/guides/ntopng/flows/nprobe.html

## Issues Found
- The post used `ip flow record`, `ip flow exporter`, and `ip flow monitor` for the top-level Flexible NetFlow objects. Cisco documentation uses `flow record`, `flow exporter`, and `flow monitor` in global configuration mode, so those commands were corrected.
- The exporter example labeled UDP port `9999` as a "standard NetFlow UDP port." NetFlow collectors commonly use configurable UDP ports, so the wording was corrected to describe `9999` as an example collector port.
- The exporter comment implied `ipfix` was simply "v10." That wording was imprecise and platform-dependent, so it was corrected to keep the example on `netflow-v9` and note that some Cisco platforms also support IPFIX.
- The Linux collector comment described `10.0.0.50` as if it were the Cisco device's source IPv4 address. In the `nfcapd` command shown, `-b 10.0.0.50` is the collector-side bind/listen address, so the comment was corrected.
- The takeaway about capturing "bidirectional traffic" was too loose. Flexible NetFlow records are unidirectional; applying monitors to both directions captures ingress and egress traffic separately, so the wording was corrected.
- No further technical issues were found after these corrections.

## Review Notes
- Flexible NetFlow field support can vary by Cisco platform and IOS / IOS XE release. The revised wording now avoids implying that IPFIX support is universal across all platforms.
- ntopng can collect flows directly, but ntop documents nProbe as the preferred collector/normalizer for larger deployments and for certain protocol-translation scenarios.
