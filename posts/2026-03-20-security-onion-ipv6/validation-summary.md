# Validation Summary: How to Configure SecurityOnion for IPv6

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Security Onion
- IPv6 network monitoring
- Suricata NIDS configuration and rules
- Zeek network metadata logs
- Security Onion Console, Hunt, Alerts, Dashboards, and Kibana
- Security Onion PCAP import and full packet capture
- Elasticsearch / Elastic Common Schema fields
- tcpdump and jq command-line analysis

## Sources Consulted
- Security Onion 3 documentation: Download - https://docs.securityonion.net/en/3/main/download/
- Security Onion 3 documentation: Installation - https://docs.securityonion.net/en/3/main/installation/
- Security Onion 3 documentation: Configuration - https://docs.securityonion.net/en/3/main/configuration/
- Security Onion 3 documentation: Directory Structure - https://docs.securityonion.net/en/3/main/directory/
- Security Onion 3 documentation: Suricata - https://docs.securityonion.net/en/3/main/suricata/
- Security Onion 3 documentation: NIDS - https://docs.securityonion.net/en/3/main/nids/
- Security Onion 3 documentation: Zeek - https://docs.securityonion.net/en/3/main/zeek/
- Security Onion 3 documentation: Zeek Fields - https://docs.securityonion.net/en/3/main/zeek-fields/
- Security Onion 3 documentation: PCAP - https://docs.securityonion.net/en/3/main/pcap/
- Security Onion 3 documentation: Full Packet Capture - https://docs.securityonion.net/en/3/main/full-packet-capture/
- Security Onion 3 documentation: so-import-pcap - https://docs.securityonion.net/en/3/main/so-import-pcap/
- Security Onion 3 documentation: so-monitor-add - https://docs.securityonion.net/en/3/main/so-monitor-add/
- Security Onion 3 documentation: so-status - https://docs.securityonion.net/en/3/main/so-status/
- Security Onion 3 documentation: Elasticsearch - https://docs.securityonion.net/en/3/main/elasticsearch/
- Security Onion 3 documentation: Notifications - https://docs.securityonion.net/en/3/main/notifications/
- Suricata documentation: Rules Format - https://docs.suricata.io/en/latest/rules/intro.html
- Suricata documentation: Header and ICMP keywords - https://docs.suricata.io/en/latest/rules/header-keywords.html
- Suricata documentation: Thresholding - https://docs.suricata.io/en/latest/rules/thresholding.html
- Zeek documentation: conn.log, dns.log, and http.log field definitions - https://docs.zeek.org/en/master/scripts/base/protocols/conn/main.zeek.html, https://docs.zeek.org/en/master/scripts/base/protocols/dns/main.zeek.html, https://docs.zeek.org/en/master/scripts/base/protocols/http/main.zeek.html
- RFC 4861: Neighbor Discovery for IP version 6 - https://datatracker.ietf.org/doc/html/rfc4861

## Issues Found
- The setup command used `sudo so-setup`, but current Security Onion installation docs show manually restarting ISO setup with `sudo SecurityOnion/setup/so-setup iso`. I updated the command and deployment choices to the documented `IMPORT`, `EVAL`, `STANDALONE`, and `DISTRIBUTED` options.
- The post instructed readers to edit `/opt/so/conf/suricata/suricata.yaml` directly. Security Onion docs warn that `/opt/so/conf` is Salt-managed, so I changed the guidance to use SOC Administration -> Configuration for Suricata and Zeek `HOME_NET`.
- The Suricata example set `EXTERNAL_NET` to `!$HOME_NET`. Security Onion defaults `EXTERNAL_NET` to `any` to preserve lateral movement detection, so I corrected the example.
- The post only configured Suricata `HOME_NET`, but Security Onion has a separate Zeek `HOME_NET` setting. I added the Zeek SOC configuration path and updated the closing paragraph.
- The rule-management commands `so-rule --list` and `so-rule --reload` are not documented current Security Onion utilities. I replaced them with the supported SOC Detections workflow and the documented `so-suricata-testrule` utility for testing rules against a PCAP.
- The custom Suricata rules used `icmp6`, which is not the documented Suricata protocol name. I changed both rules to `icmpv6`.
- The ICMPv6 Router Advertisement and Neighbor Solicitation rules targeted only `$HOME_NET`, which can miss multicast Neighbor Discovery traffic. I changed the destination to `[ff02::/16,$HOME_NET]`.
- The threshold syntax was tightened to Suricata's documented format with explicit spacing after `threshold:`.
- The Zeek commands used a non-documented `so-zeek-logs` utility and awk field numbers, but Security Onion stores Zeek logs as JSON under `/nsm/zeek/logs`. I replaced those examples with `jq` filters for `conn.log`, `dns.log`, and `http.log`.
- The DNS jq example handles `answers` as an array and joins it before TSV output, avoiding a jq `@tsv` runtime error.
- The SOC search example used non-ECS field names such as `data.srcip` and referenced OpenSearch. I changed the examples to use Security Onion's ECS-style fields such as `network.type`, `source.ip`, and `destination.ip`.
- The PCAP capture command used an undocumented `so-capture` utility. I replaced it with `tcpdump` for manual capture and kept the documented `so-import-pcap` command for importing PCAP files.
- The sensor deployment section referenced a non-documented `/opt/so/conf/sensor/sensor.yaml` example. I replaced it with the documented `so-monitor-add` utility and a `tcpdump` verification command on `bond0`.
- The alerting section referenced `so-alert --test` and `/opt/so/conf/so-alert.yaml`, neither of which matches current Security Onion notification guidance. I replaced that with SOC Alerts/Hunt queries, a `so-elasticsearch-query` example, `so-status`, and a note that outbound email notifications require Security Onion Pro configuration.

## Review Notes
- I could not run Security Onion-specific utilities or Suricata rule tests locally because this workspace is not a Security Onion sensor/manager and `suricata` is not installed. I verified the command names and workflows against official Security Onion documentation.
- I locally syntax-checked the revised `jq` filters against sample JSON records.
- The example IPv6 prefix `2001:db8::/32` is a documentation prefix. Production deployments should replace it with the organization's actual IPv6 allocations.
