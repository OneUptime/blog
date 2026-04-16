# Validation Summary: How to Configure ClickHouse for IPv4 and IPv6 Dual Stack

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (server config.xml, `listen_host`, remote_servers)
- IPv4 / IPv6 networking (dual-stack, IPV6_V6ONLY, IPv4-mapped IPv6)
- Linux networking tools (`ss`, `curl`)
- ClickHouse SQL (`IPv4` / `IPv6` data types, `toIPv6`, `isIPv4String`, MergeTree)

## Sources Consulted
- ClickHouse Server Settings documentation: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse IP Address Functions: https://clickhouse.com/docs/en/sql-reference/functions/ip-address-functions
- ClickHouse IPv6 data type: https://clickhouse.com/docs/en/sql-reference/data-types/ipv6
- Official ClickHouse default `config.xml`: https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/config.xml
- Altinity KB on connection defaults: https://kb.altinity.com/altinity-kb-setup-and-maintenance/connection-problems/

## Issues Found
1. **Incorrect default listening behavior.** The post claimed ClickHouse listens on `0.0.0.0` by default. Per the official default `config.xml` and docs, the shipped default is localhost only (`127.0.0.1` and `::1`) — explicit `listen_host` entries are needed to accept external connections. Updated the "Default Listening Behavior" section to reflect the correct defaults.

2. **Buggy "IPv6 only" filter query.** The original query used `WHERE isIPv4String(toString(client_ip)) = 0` to select "IPv6 only" rows. Because `client_ip` is stored as `IPv6`, `toString` always returns an IPv6-formatted string (e.g. `::ffff:192.168.1.1` for IPv4-mapped values, or `2001:db8::1` for native IPv6). `isIPv4String` returns 0 for both formats, so the filter matches every row and does not actually exclude IPv4-mapped addresses. Replaced it with a range check against the IPv4-mapped block: `WHERE client_ip NOT BETWEEN toIPv6('::ffff:0.0.0.0') AND toIPv6('::ffff:255.255.255.255')`, which correctly excludes IPv4-mapped IPv6 addresses.

## Review Notes
- The `ss -tlnp | grep clickhouse` example output is stylized/simplified for readability (the real output includes additional columns like `Recv-Q`, `Send-Q`, `Peer Address`, and a process descriptor). This is acceptable for illustration.
- The `IPV6_V6ONLY` note is accurate: on most Linux distributions the kernel default is 0, so binding to `::` accepts IPv4 connections via IPv4-mapped addresses; explicitly listing both `0.0.0.0` and `::` is the safe/portable choice.
- `toIPv6('192.168.1.1')` does produce an IPv4-mapped IPv6 address (`::ffff:192.168.1.1`), consistent with the post's "IPv4-in-IPv6 format" description.
- The `remote_servers` XML snippet is a minimal example; production configs typically include `internal_replication`, `user`, `password`, and multiple replicas/shards. That's out of scope for this post.
