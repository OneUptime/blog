# Validation Summary: How to Configure IPv6 Firewall Rules on Cisco ASA

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco ASA
- IPv6
- Access control lists (ACLs)
- ICMPv6
- Cisco ASA Modular Policy Framework (MPF) / service policies

## Sources Consulted
- Cisco Secure Firewall ASA Firewall CLI Configuration Guide, 9.20 - Access Control Lists: https://www.cisco.com/c/en/us/td/docs/security/asa/asa920/configuration/firewall/asa-920-firewall-config/access-acls.html
- Cisco Secure Firewall ASA Firewall CLI Configuration Guide, 9.20 - Access Rules: https://www.cisco.com/c/en/us/td/docs/security/asa/asa919/configuration/firewall/asa-919-firewall-config/access-rules.html
- Cisco Secure Firewall ASA Firewall CLI Configuration Guide, 9.20 - Connection Settings: https://www.cisco.com/c/en/us/td/docs/security/asa/asa920/configuration/firewall/asa-920-firewall-config/conns-connlimits.html
- Cisco Secure Firewall ASA Series Command Reference - `ipv6 enable` / `ipv6 icmp`: https://www.cisco.com/c/en/us/td/docs/security/asa/asa-cli-reference/I-R/asa-command-ref-I-R/m_ipv-ir.html
- Cisco Secure Firewall ASA Series Command Reference - `inspect icmp` / `inspect icmp error`: https://www.cisco.com/c/en/us/td/docs/security/asa/asa-cli-reference/I-R/asa-command-ref-I-R/m_inspect-a-inspect-z.html
- Cisco Secure Firewall ASA Series Command Reference - `show conn`: https://www.cisco.com/c/en/us/td/docs/security/asa/asa-cli-reference/S/asa-command-ref-S/show-b-to-show-cq-commands.html
- Cisco Secure Firewall ASA Series Command Reference - `show access-list`: https://www.cisco.com/c/en/us/td/docs/security/asa/asa-cli-reference/S/asa-command-ref-S/show-aa-to-show-asr-commands.html
- Cisco Secure Firewall ASA Series Command Reference - object groups: https://www.cisco.com/c/en/us/td/docs/security/asa/asa-cli-reference/I-R/asa-command-ref-I-R/o-commands.html
- Cisco Support - Configure the ASA to Pass IPv6 Traffic: https://www.cisco.com/c/en/us/support/docs/security/adaptive-security-appliance-asa-software/119012-configure-asa-00.html
- RFC 4291: IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 4890: Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html

## Issues Found
- The post used deprecated `ipv6 access-list` syntax and `show ipv6 access-list` verification commands. I replaced them with unified `access-list` / `show access-list` syntax because ASA 9.0(1) and later merged IPv4 and IPv6 ACLs into the same ACL structure.
- The interface and ACL examples used invalid IPv6 literals such as `2001:db8:wan::1`, `2001:db8:lan::1`, `fd00:mgmt::/48`, and host labels embedded in addresses. I replaced them with valid IPv6 documentation addresses because IPv6 text notation only allows hexadecimal fields.
- The post said to enable IPv6 with `ipv6 unicast-routing` and `ipv6 enable` on each addressed interface. I removed that guidance and clarified that on ASA, assigning a global IPv6 address enables IPv6 processing; `ipv6 enable` is used when you want link-local only.
- The inbound ACL included `permit tcp any any established`, NDP/RA/RS entries, and an SSH rule aimed at the ASA interface address. I removed or replaced those because ASA is already stateful for TCP/UDP return traffic, neighbor discovery is not configured as normal transit ACL traffic, and ASA management access is configured separately from transit ACLs.
- The ICMP inspection section mixed ICMP error handling guidance with a custom inspection example that did not match Cisco’s documented configuration. I replaced it with a documented `inspect icmp` service-policy example and noted `inspect icmp error` as the error-only alternative.
- The post used invalid command forms `show conn ipv6`, `show conn ipv6 detail`, and `packet-tracer input outside ipv6 ...`. I corrected them to documented ASA forms: `show conn`, `show conn detail`, and `packet-tracer input outside tcp <src> <sport> <dst> <dport> detailed`.
- The object-group ACL example used `object-group-network` syntax, and the connection-limits section reused an object name in a conflicting way while omitting the actual `set connection` policy. I corrected the object-group syntax and rewrote the connection-limit example to use a documented `class-map` / `policy-map` / `set connection embryonic-conn-max` configuration.
- The bogon filtering section attached a second inbound ACL to the same interface. I changed it to insert bogon deny entries into the existing outside ACL because ASA allows one extended ACL per interface per direction.

## Review Notes
- The post is now accurate for modern ASA 9.x syntax. Readers maintaining pre-9.0 ASA software should expect older IPv6 ACL syntax in legacy documentation.
- The examples use RFC 3849 documentation space (`2001:db8::/32`) and are illustrative only.
- ASA management access to the firewall itself uses dedicated management commands such as `ssh`, `http`, or `icmp` / `ipv6 icmp`; it is separate from transit ACLs.
