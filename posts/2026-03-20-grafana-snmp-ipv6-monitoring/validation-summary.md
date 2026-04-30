# Validation Summary: How to Monitor IPv6 with SNMP using Grafana

## Status
validated

## Post Type
Guide

## Technologies Covered
- SNMP
- Prometheus SNMP Exporter
- Prometheus
- Grafana
- IPv6
- Net-SNMP
- RFC 4293 IP-MIB
- RFC 4292 IP-FORWARD-MIB

## Sources Consulted
- Prometheus SNMP Exporter README: https://github.com/prometheus/snmp_exporter
- Prometheus SNMP Exporter generator README: https://github.com/prometheus/snmp_exporter/tree/main/generator
- Prometheus SNMP Exporter generator format: https://raw.githubusercontent.com/prometheus/snmp_exporter/main/generator/FORMAT.md
- Latest SNMP Exporter release metadata: https://api.github.com/repos/prometheus/snmp_exporter/releases/latest
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Grafana dashboard import documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/import-dashboards/
- Grafana dashboard API documentation: https://grafana.com/docs/grafana/latest/http_api/dashboard/
- Grafana.com dashboard 11169: https://grafana.com/grafana/dashboards/11169-snmp-stats/
- RFC 4293, Management Information Base for the Internet Protocol (IP): https://www.rfc-editor.org/rfc/rfc4293
- RFC 4292, IP Forwarding Table MIB: https://www.rfc-editor.org/rfc/rfc4292.html
- Net-SNMP common command documentation: https://www.net-snmp.org/docs/man/snmpcmd.html

## Issues Found
- The SNMP Exporter install command used a wildcard download URL and moved a nonexistent path. I replaced it with the current official release asset URL and the correct extracted binary path.
- The generator workflow was inaccurate. The upstream project requires building the generator separately, so I added the official `git clone`, `make generator mibs`, and `./generator generate -m ./mibs -g ./generator.yml -o ./snmp.yml` flow.
- The `generator.yml` example used an outdated structure with a handwritten `metrics` list. I replaced it with the current `auths` and `modules` format documented by `snmp_exporter`.
- The `snmp.yml` example used the old schema where auth lived inside each module. I updated it to the current split `auths` and `modules` format.
- The post mixed older IPv6-specific objects with RFC 4293 while claiming RFC 4293 coverage. RFC 4293 consolidates IPv4 and IPv6 counters into `ipSystemStatsTable` and `ipIfStatsTable`, so I replaced the old `ipv6If*` examples with the correct IP-MIB objects.
- The route count example used `ipv6RouteNumber`, which RFC 4293 removes from IP-MIB. I replaced it with an IPv6-specific count over `inetCidrRouteTable` from RFC 4292.
- The transmit-rate query used a request counter that measures packets handed to IP, not packets actually transmitted to lower layers. I replaced it with `ipIfStatsHCOutTransmits`, which matches the panel description.
- The Grafana import example posted directly to `/api/dashboards/import`, which is not the supported documented dashboard API path. I replaced it with the supported UI import flow and a separate JSON download command from Grafana.com.
- The verification commands used invalid or incomplete IPv6 target syntax. I replaced them with valid Net-SNMP `udp6:` syntax for `snmpwalk` and a `curl -G --data-urlencode` example for `snmp_exporter`.

## Review Notes
- Walking `inetCidrRouteTable` can be high-cardinality on large routers, so scrape size and dashboard cost may increase on devices with very large routing tables.
- Some vendors still expose older IPv6-specific objects from earlier MIB revisions, but the corrected post now aligns with the current RFC 4293 and RFC 4292 model and with the current `snmp_exporter` configuration format.
