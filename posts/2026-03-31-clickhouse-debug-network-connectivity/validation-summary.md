# Validation Summary: How to Debug ClickHouse Network Connectivity Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- ClickHouse (server, native TCP protocol, HTTP interface, interserver HTTP port, TLS)
- Linux networking tools (ss, netstat, telnet, nc, nmap, tcpdump)
- Firewall tools (ufw, iptables)
- openssl (TLS diagnostics)
- Wireshark (pcap analysis)
- curl (HTTP testing)

## Sources Consulted
- ClickHouse server settings documentation — https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings (default ports: 8123 HTTP, 9000 native TCP, 9009 interserver HTTP, 9440 TLS native)
- ClickHouse `system.clusters` system table — https://clickhouse.com/docs/en/operations/system-tables/clusters (verified columns: cluster, shard_num, host_name, port, is_local, errors_count, slowdowns_count)
- ClickHouse interserver authentication / `interserver_http_credentials` — https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#interserver-http-credentials (uses HTTP Basic Auth)
- ClickHouse HTTP interface — https://clickhouse.com/docs/en/interfaces/http
- ClickHouse default log paths — `/var/log/clickhouse-server/clickhouse-server.err.log`
- man pages for ss, netstat, tcpdump, openssl s_client, nmap, iptables, ufw

## Issues Found
- **Step 6 (Inter-Node Authentication)**: The original command used `-H "X-ClickHouse-User: default"` against port 9009. The interserver HTTP port does not authenticate via the `X-ClickHouse-User` header (that header is for the regular HTTP interface on port 8123). Interserver communication authenticates via HTTP Basic Auth using the user/password in `interserver_http_credentials`. Additionally, port 9009 does not serve arbitrary SQL queries, so `?query=SELECT+1` is not a meaningful endpoint there. Replaced with `curl -u 'interserver_user:interserver_password' "http://ch-node-2:9009/"` and updated the description to mention HTTP Basic Auth.

## Review Notes
- Default ports referenced (8123, 9000, 9009, 9440) are all correct ClickHouse defaults.
- `system.clusters` column names used in the diagnostic SQL are all current and correct.
- Error log path `/var/log/clickhouse-server/clickhouse-server.err.log` is the correct default for package installs on Debian/Ubuntu/RHEL.
- The `ss`/`netstat` expected output showing `clickhouse-serv` (truncated from `clickhouse-server`) is realistic — both tools truncate long process names.
- The `tcpdump` BPF filter syntax is correct.
- The openssl commands for TLS handshake and certificate expiry are standard and correct.
