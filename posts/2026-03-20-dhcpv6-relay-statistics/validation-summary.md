# Validation Summary: How to Monitor DHCPv6 Relay Statistics

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- DHCPv6 relay
- ISC DHCP `dhcrelay`
- Cisco IOS XR DHCPv6 relay CLI
- Juniper Junos DHCPv6 relay CLI
- ISC Kea DHCPv6 HTTP control API
- Python `requests`
- Prometheus Python client
- PromQL
- Grafana

## Sources Consulted
- ISC DHCP 4.4 `dhcrelay` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcrelay
- Cisco IOS XR DHCP commands (`show dhcp ipv6 relay statistics`): https://www.cisco.com/c/en/us/td/docs/iosxr/cisco8000/ip-addresses/b-ip-addresses-cr-8k/m-dhcp-commands-8k.html
- Cisco IOS XR DHCP commands (`clear dhcp ipv6 relay statistics`): https://www.cisco.com/c/en/us/td/docs/iosxr/ncs5500/ip-addresses/b-ip-addresses-cr-ncs5500/dhcp-commands.html
- Cisco IOS XE DHCPv6 relay agent guide (`show ipv6 dhcp interface` on IOS XE): https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_ip6-dhcp-rel-agent-xe-1.html
- Juniper `show dhcpv6 relay statistics`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-dhcpv6-relay-statistics.html
- Juniper `clear dhcpv6 relay statistics`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/clear-dhcpv6-relay-statistics.html
- Kea Management API / HTTP control channel: https://kea.readthedocs.io/en/latest/arm/ctrl-channel.html
- Kea statistics API (`statistic-get-all`): https://kea.readthedocs.io/en/kea-2.1.6/arm/stats.html
- Kea DHCPv6 statistics reference: https://kea.readthedocs.io/en/kea-3.0.0/arm/dhcp6-srv.html
- Microsoft `Get-DhcpServerv6Statistics`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/get-dhcpserverv6statistics?view=windowsserver2025-ps
- Microsoft Windows Server DHCP relay agent deployment: https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/dhcp-deploy-relay-agent
- Prometheus Python client `Counter` and labels docs: https://prometheus.github.io/client_python/instrumenting/counter/ and https://prometheus.github.io/client_python/instrumenting/labels/
- Prometheus PromQL operators and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus query functions (`rate()` then `sum()` guidance): https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The Cisco section labeled the commands as IOS/IOS-XE, but the commands shown were not the documented IOS XE relay-statistics commands. I changed the section to Cisco IOS XR and replaced the examples with the documented `show dhcp ipv6 relay statistics`, `show dhcp ipv6 relay statistics detail`, and `clear dhcp ipv6 relay statistics` forms.
- The Juniper commands used the wrong command form (`dhcp v6`) and an unsupported `group` example. I corrected them to `show dhcpv6 relay statistics`, `clear dhcpv6 relay statistics`, and `show dhcpv6 relay statistics routing-instance CLIENTS`.
- The Windows Server row cited DHCP server statistics, not DHCP relay statistics. I removed that row because it was technically incorrect for relay monitoring.
- The Kea example used an invalid IPv6 literal in the URL and an older Control Agent-style request shape without clarifying direct HTTP control channel usage. I replaced the URL with a valid documentation IPv6 literal, removed the unnecessary `service` selector for a direct HTTP control example, and added response/error handling consistent with current Kea HTTP control behavior.
- The Kea prose implied relay-native statistics, but Kea is a DHCPv6 server. I corrected the wording to describe these as server-side DHCPv6 counters and per-subnet lease statistics relevant to relayed environments.
- The Prometheus exporter defined `dhcpv6_relay_forwarded_total` but never incremented it. I fixed the example to update that counter.
- The exporter polled `journalctl --since "1 minute ago"` on every loop, which can double count or miss events if the loop drifts. I changed the example to track the last poll time and query from that timestamp forward.
- The Grafana and alerting PromQL expressions divided an unlabeled series by a labeled series, which would not match under PromQL's default vector matching rules. I corrected the queries by aggregating `dhcpv6_relay_received_total` with `sum(rate(...))` before division.
- The Grafana section referenced fixed Kea Prometheus metric names that were not backed by any exporter example in the post. I removed those unsupported queries and kept the queries aligned with the exporter metrics actually defined in the article.
- The conclusion overstated platform behavior by claiming Cisco and Juniper provided per-interface relay counters and by referring to `RELAY-FORW`/`RELAY-REPL` alerting that the article did not reliably instrument. I revised the conclusion to match the corrected CLI/API examples and Prometheus metrics.

## Review Notes
- ISC `dhcrelay` does not document a built-in DHCPv6 relay statistics command; the Linux section therefore remains a custom log-based monitoring approach rather than a vendor-native statistics interface.
- In Kea 2.7.2 and later, DHCP servers support HTTP/HTTPS control channels directly, so the Control Agent is no longer required for HTTP API access.
- Kea per-subnet statistics exist, but Prometheus metric names for those values depend on the exporter used. The post now avoids claiming a fixed Prometheus metric name where no exporter was specified.
