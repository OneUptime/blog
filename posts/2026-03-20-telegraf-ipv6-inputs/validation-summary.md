# Validation Summary: How to Configure Telegraf with IPv6 Inputs

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Telegraf
- InfluxDB v2 output plugin
- Telegraf net, nstat, netstat, prometheus, http_response, ping, and dns_query input plugins
- IPv6 URL literals and IPv6 DNS AAAA records
- Linux `/proc/net/snmp6` network counters

## Sources Consulted
- Telegraf InfluxDB v2 output plugin documentation: https://docs.influxdata.com/telegraf/v1/output-plugins/influxdb_v2/
- Telegraf Network input plugin documentation: https://docs.influxdata.com/telegraf/v1/input-plugins/net/
- Telegraf Kernel Network Statistics input plugin documentation: https://docs.influxdata.com/telegraf/v1/input-plugins/nstat/
- Telegraf Network Connection Statistics input plugin documentation: https://docs.influxdata.com/telegraf/v1/input-plugins/netstat/
- Telegraf Prometheus input plugin documentation: https://docs.influxdata.com/telegraf/v1/input-plugins/prometheus/
- Telegraf HTTP Response input plugin documentation: https://docs.influxdata.com/telegraf/v1/input-plugins/http_response/
- Telegraf Ping input plugin documentation: https://docs.influxdata.com/telegraf/v1/input-plugins/ping/
- Telegraf DNS Query input plugin documentation: https://docs.influxdata.com/telegraf/v1/input-plugins/dns_query/
- Telegraf command-line flags documentation: https://docs.influxdata.com/telegraf/v1/commands/
- RFC 3986 URI syntax: https://datatracker.ietf.org/doc/html/rfc3986/
- RFC 4291 IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291/

## Issues Found
- The InfluxDB output example used `http://[2001:db8::influx]:8086`, which is not a valid IPv6 literal because IPv6 address segments are hexadecimal. Changed it to `http://[2001:db8::1]:8086`.
- Step 1 said Telegraf was configured to "listen" on IPv6, but the snippet configures an output connection to InfluxDB. Updated the heading to describe writing to an IPv6 InfluxDB endpoint.
- The post said `inputs.kernel` collects `/proc/net/snmp6`; Telegraf's `inputs.nstat` plugin is the documented plugin for `/proc/net/netstat`, `/proc/net/snmp`, and `/proc/net/snmp6`. Replaced `[[inputs.kernel]]` with `[[inputs.nstat]]` and corrected the comments.
- The `inputs.netstat` comment claimed per-protocol `tcp6` and `udp6` counts, but the documented plugin reports aggregate TCP connection states and UDP socket counts. Updated the comment.
- The Prometheus `metric_version = 2` comment described it as a namespace setting. Updated it to reflect that it controls Prometheus-to-Telegraf metric mapping.
- The HTTP response examples used the deprecated/removed `address` option. Updated them to the documented `urls = [...]` option and kept the examples as IPv6 literal endpoints.
- The DNS Query timeout used a bare integer. Updated it to the documented duration string form, `timeout = "5s"`.
- The metric examples used Prometheus-style names and one incorrect ping field name (`ping_packet_loss_percent`). Replaced them with Telegraf line protocol examples using the documented `net`, `http_response`, and `ping` field names.

## Review Notes
The post uses `2001:db8::/32` documentation addresses for examples; these are appropriate for documentation but must be replaced with real reachable IPv6 addresses in production. The local environment did not have the `telegraf` binary installed, so validation was performed against current official documentation rather than by executing `telegraf --test`.
