# Validation Summary: How to Configure Collectd for IPv6 Metrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Collectd
- Collectd plugins: `interface`, `ping`, `tcpconns`, `network`, `write_graphite`, `unixsock`
- Graphite/Carbon
- InfluxDB OSS v1 Collectd input
- Linux
- systemd

## Sources Consulted
- Collectd official configuration reference: https://collectd.org/documentation/manpages/collectd.conf.html
- Collectd official daemon man page: https://collectd.org/documentation/manpages/collectd.html
- Collectd official unixsock man page: https://collectd.org/documentation/manpages/collectd-unixsock.html
- Collectd official FAQ: https://collectd.org/documentation/faq.html
- Collectd official source for `collectdctl`: https://raw.githubusercontent.com/collectd/collectd/main/src/collectdctl.pod
- Collectd official source for `ping` plugin behavior: https://raw.githubusercontent.com/collectd/collectd/main/src/ping.c
- Collectd official source for `interface` plugin behavior: https://raw.githubusercontent.com/collectd/collectd/main/src/interface.c
- Collectd official source for `tcpconns` plugin behavior: https://raw.githubusercontent.com/collectd/collectd/main/src/tcpconns.c
- Collectd official type definitions: https://raw.githubusercontent.com/collectd/collectd/main/src/types.db
- InfluxDB OSS v1 CollectD protocol support: https://docs.influxdata.com/influxdb/v1/supported_protocols/collectd/
- InfluxDB OSS v1 ports reference: https://docs.influxdata.com/influxdb/v1/administration/ports/

## Issues Found
- The introduction and Step 1 wording implied that the `interface` plugin exposes IPv6-only interface counters. I changed the wording to say it collects per-interface traffic statistics that cover both IPv4 and IPv6 traffic, which matches the official plugin behavior.
- The `tcpconns` section claimed the sample config would collect only listening IPv6 connections. That was incorrect: `tcpconns` counts TCP states by port and includes both IPv4 and IPv6 sockets; it does not filter by address family. I updated the heading/comment and removed `ListeningPorts true`, which would otherwise broaden collection to all listening local ports.
- The `write_graphite` example configured a `write_graphite` block without loading the plugin first. Because Collectd requires explicit `LoadPlugin` statements by default unless `AutoLoadPlugin true` is enabled, I added `LoadPlugin write_graphite`.
- The Graphite example used an invalid IPv6 placeholder address (`2001:db8::graphite`). I replaced it with a valid documentation-prefix IPv6 literal.
- The InfluxDB section incorrectly described the Collectd `network` plugin as sending InfluxDB Line Protocol over UDP/TCP. InfluxDB’s CollectD input accepts Collectd native packets over UDP, so I corrected the protocol description.
- The InfluxDB section was version-ambiguous. The official CollectD listener documentation is for InfluxDB OSS v1, so I updated the heading/comment to make that version scope explicit.
- The InfluxDB server example used invalid IPv6 literal formatting (`[2001:db8::influx]`). I replaced it with a valid IPv6 literal in the format accepted by Collectd’s `network` plugin.
- The unixsock step title incorrectly implied IPv6-specific querying. I changed it to describe local metric queries over the UNIX socket, which is what the plugin actually provides.

## Review Notes
- As of 2026-05-06, InfluxDB 3 Core is the latest stable InfluxDB release, but the official CollectD listener documentation is for InfluxDB OSS v1. The post now makes that version dependency explicit.
- The `ping` plugin requires raw-socket privileges, so Collectd must run as root or with appropriate capabilities for ICMP probing to work.
- The `collectdctl` test commands were checked against the official Collectd source/manpage and are consistent with the documented `listval` and `getval` identifier format.
