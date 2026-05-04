# Validation Summary: How to Configure NetFlow v9 (Flexible NetFlow) on Cisco IOS

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Cisco IOS / IOS XE
- Flexible NetFlow (FNF)
- NetFlow v9 export protocol
- Flow records, flow exporters, flow monitors
- NetFlow collectors (UDP 2055)

## Sources Consulted
- [Cisco IOS Flexible NetFlow Command Reference - match interface through ttl](https://www.cisco.com/c/en/us/td/docs/ios/fnetflow/command/reference/fnf_book/fnf_02.html)
- [Cisco IOS Flexible NetFlow Command Reference - cache through match flow](https://www.cisco.com/c/en/us/td/docs/ios/fnetflow/command/reference/fnf_book/fnf_01.html)
- [Flexible NetFlow Configuration Guide, Cisco IOS Release 15M&T - Flexible NetFlow Overview](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fnetflow/configuration/15-mt/fnf-15-mt-book/fnf-fnetflow.html)
- [Cisco IOS XE 17 - Flexible NetFlow Configuration Guide](https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/fnf-avc/flexible-netflow-configuration-guide.html)
- [Customizing Flexible NetFlow Flow Records and Flow Monitors](https://contenthub.cisco.com/chapter.sjs?uri=/searchable/chapter/content/en/us/td/docs/ios-xml/ios/fnetflow/configuration/15-s/fnf-15-s-book/cust-fnflow-rec-mon.html.xml&platform=Cisco+IOS+Software)
- [Flexible NetFlow Output Features on Data Export](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fnetflow/configuration/15-mt/fnf-15-mt-book/fnf-output-features.pdf)
- [RFC 3954 - Cisco Systems NetFlow Services Export Version 9](https://datatracker.ietf.org/doc/html/rfc3954)

## Issues Found

1. **Incorrect protocol match keyword (Step 1 and Step 5).** The post used `match ip protocol`, which is not valid Flexible NetFlow syntax. Per Cisco's FNF command reference, the correct command is `match ipv4 protocol` (with `match ipv6 protocol` for IPv6). Updated both the `MY_FLOW_RECORD` and `BANDWIDTH_RECORD` examples.

2. **Wrong unit in template-timer comment (Step 2).** The original comment described `template data timeout 60` as "resend templates every 60 packets". `template data timeout <seconds>` is time-based (1–86400 seconds); the packet-based equivalent is `template data refresh-rate <packets>`. Corrected the comment to "resend templates every 60 seconds".

3. **Misleading `flow record netflow-original` line (Step 7).** The example showed `flow record netflow-original` followed by referencing it inside a flow monitor. `netflow-original` is a Cisco-predefined record — you reference it directly inside `flow monitor` configuration; you don't (and can't usefully) declare it with `flow record netflow-original`. Removed the spurious declaration line and clarified the comment.

## Review Notes
- The remaining configuration syntax (`flow record`, `flow exporter`, `flow monitor`, `cache timeout active/inactive`, `cache entries`, `destination`, `transport udp`, `export-protocol netflow-v9`, `source Loopback0`, `options interface-table timeout`, `options exporter-stats timeout`, `ip flow monitor <name> input|output`) all matches Cisco's Flexible NetFlow command reference.
- The `show flow monitor ... cache`, `show flow exporter ... statistics`, and `show flow record ...` commands used in Step 6 are correct; the displayed output is illustrative and within reasonable bounds of what real devices print.
- `collect counter bytes long` and `collect counter packets long` (Step 5) correctly use the 64-bit counter variants suitable for high-volume bandwidth monitoring.
- Code-block language hints are inconsistent (`text` vs `bash`) for Cisco CLI snippets — purely cosmetic and not a technical defect.
- UDP/2055 is conventional for NetFlow but not mandated; collectors can listen on any port. The post's choice is fine and matches common practice.
