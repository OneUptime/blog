# Validation Summary: How to Write IPv6 Threat Detection Rules in SIEM

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6 / Neighbor Discovery Protocol (NDP)
- Router Advertisements
- DHCPv6
- Sigma
- Splunk SPL
- Elastic Security threshold rules
- Elastic EQL
- IBM QRadar AQL
- MITRE ATT&CK

## Sources Consulted
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://datatracker.ietf.org/doc/html/rfc8415
- RFC 4380, Teredo: Tunneling IPv6 over UDP through NATs: https://datatracker.ietf.org/doc/rfc4380/
- IANA Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers
- Sigma Conditions documentation: https://sigmahq.io/docs/basics/conditions.html
- Sigma Correlations documentation: https://sigmahq.io/docs/meta/correlations.html
- Sigma Getting Started documentation: https://sigmahq.io/docs/guide/getting-started.html
- Sigma Backends documentation: https://sigmahq.io/docs/digging-deeper/backends
- Sigma CLI repository documentation: https://github.com/SigmaHQ/sigma-cli
- Sigma Splunk backend documentation: https://github.com/SigmaHQ/pySigma-backend-splunk
- Sigma Elasticsearch backend documentation: https://github.com/SigmaHQ/pySigma-backend-elasticsearch
- IBM QRadar AQL Sigma backend documentation: https://github.com/IBM/pySigma-backend-QRadar-AQL
- Splunk `cidrmatch` documentation: https://help.splunk.com/en/splunk-cloud-platform/search/search-reference/10.0.2503/evaluation-functions/comparison-and-conditional-functions
- Elastic threshold rule documentation: https://www.elastic.co/docs/solutions/security/detect-and-alert/threshold
- Elastic EQL rule documentation: https://www.elastic.co/docs/solutions/security/detect-and-alert/eql
- Elastic EQL function reference (`cidrMatch`): https://www.elastic.co/docs/reference/query-languages/eql/eql-function-ref
- Elastic ECS network field reference: https://www.elastic.co/docs/reference/ecs/ecs-network
- MITRE ATT&CK T1557, Adversary-in-the-Middle: https://attack.mitre.org/techniques/T1557
- MITRE ATT&CK T1498, Network Denial of Service: https://attack.mitre.org/techniques/T1498/

## Issues Found
- The Sigma NDP flood example used deprecated/invalid inline aggregation in the `detection` block. I replaced it with a valid Sigma base rule plus a Sigma correlation rule using `event_count`, because current Sigma documents event counting under correlations rather than plain `detection` conditions.
- The NDP flood Sigma rule tagged the behavior as `attack.t1499` (Endpoint DoS). I changed it to `attack.t1498` because neighbor-cache exhaustion against network infrastructure aligns better with Network Denial of Service.
- The Router Advertisement Sigma rule used `attack.t1557.001`, which is specifically LLMNR/NBT-NS poisoning and SMB relay. I changed it to the parent technique `attack.t1557` because RA spoofing is an adversary-in-the-middle pattern but not that specific Windows name-resolution sub-technique.
- The Router Advertisement allowlist used an invalid placeholder prefix (`2001:db8:infra::/48`) and an incorrect operational assumption. I replaced it with explicit link-local router source addresses because RFC 4861 requires Router Advertisements to use the router’s link-local source address.
- Multiple placeholder IPv6 addresses in the tuning section were syntactically invalid (`infra`, `internal`, `security`, `backup` are not valid hexadecimal groups). I replaced them with valid documentation prefixes under `2001:db8::/32`.
- The Splunk blocks contained pseudo-comment lines beginning with `| SPL:` that were not valid SPL. I removed those lines.
- The Splunk tunnel example labeled all protocol 41 traffic as `6to4`. I changed the label to `proto41_ipv6_encap` because protocol 41 is generic IPv6-in-IPv4 encapsulation and is not specific to 6to4.
- The Elastic threshold rule grouped on `destination.ip`, which would not detect a source scanning many destinations. I corrected it to group on `source.ip` and added a `destination.ip` cardinality condition to match the stated scan-detection behavior.
- The Elastic threshold rule structure was incomplete for current rule examples. I added `language`, `index`, and corrected the `threshold.field` structure to match Elastic’s documented rule format.
- The Elastic EQL example used `CIDR_MATCH` instead of the documented EQL `cidrMatch` function and excluded all `fe80::/10` sources, which would suppress legitimate and rogue Router Advertisements alike. I corrected the function name and changed the logic to allowlist only expected router link-local addresses.
- The Sigma conversion commands used outdated package-install instructions and an inappropriate `ecs_windows` pipeline for network/firewall examples. I updated the commands to current Sigma CLI backend installation/conversion patterns and limited the QRadar conversion example to a simple base rule.
- The tuning Sigma snippet used invalid inline counting syntax. I converted it to a valid base rule plus `value_count` correlation over `dst_ip` grouped by `src_ip`.
- The DHCPv6 starvation explanation referred to unique MAC addresses. I corrected this to unique client identifiers (DUIDs), which is the protocol-native identifier in DHCPv6 per RFC 8415.
- The conclusion said the IPv6 scan threshold was “from one /64,” but the provided examples group by source IP, not source prefix. I corrected the conclusion to say “from one source IP.”
- The conclusion referenced `not filter_legitimate_routers`, but the rule actually used `filter_legitimate`. I corrected the text to match the example.

## Review Notes
- The examples are technically consistent after correction, but field names such as `protocol`, `icmpv6_type`, and `event.action` still depend on how a given firewall, packet sensor, or log pipeline normalizes data.
- Sigma correlation support is backend-dependent. The post now reflects that count-based Sigma correlation examples are appropriate for supported backends such as Splunk, while QRadar is shown only with a simple base-rule conversion path.
