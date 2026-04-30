# Validation Summary: How to Configure IPv6 for Cross-Data-Center Replication - Datacenter

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and subnetting
- Cisco IOS BGP and VRF configuration
- Linux `tc` HTB and `u32` traffic classification
- MySQL replication over IPv6
- PostgreSQL streaming replication over IPv6
- Bash-based replication lag monitoring

## Sources Consulted
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- Cisco IOS, IPv6 Routing: Multiprotocol BGP Extensions for IPv6: https://www.cisco.com/en/US/docs/ios-xml/ios/iproute_bgp/configuration/15_0sy/ip6-mbgp-ext.html
- Cisco IOS XE, Implementing Multiprotocol BGP for IPv6: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9400/software/release/16-8/configuration_guide/rtng/b_168_rtng_9400_cg/b_168_rtng_9400_cg_chapter_01111.html
- `tc-htb(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-htb.8.html
- `tc-u32(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/tc-u32.8.html
- MySQL 8.0, Configuring the MySQL Server to Permit IPv6 Connections: https://dev.mysql.com/doc/refman/8.0/en/ipv6-server-config.html
- MySQL 8.0, Connecting Using IPv6 Nonlocal Host Addresses: https://dev.mysql.com/doc/refman/8.0/en/ipv6-remote-connections.html
- MySQL 8.0, Command Options for Connecting to the Server: https://dev.mysql.com/doc/refman/8.0/en/connection-options.html
- MySQL 8.0, CHANGE REPLICATION SOURCE TO Statement: https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0, SHOW REPLICA STATUS Statement: https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0, START REPLICA Statement: https://dev.mysql.com/doc/refman/8.0/en/start-replica.html
- PostgreSQL 14, Connections and Authentication: https://www.postgresql.org/docs/14/runtime-config-connection.html
- PostgreSQL 14, The `pg_hba.conf` File: https://www.postgresql.org/docs/14/auth-pg-hba-conf.html
- PostgreSQL 14, `pg_basebackup`: https://www.postgresql.org/docs/14/app-pgbasebackup.html
- PostgreSQL 14, `recovery.conf` file merged into `postgresql.conf`: https://www.postgresql.org/docs/14/recovery-config.html
- PostgreSQL 14, Replication Settings: https://www.postgresql.org/docs/14/runtime-config-replication.html

## Issues Found
- Several IPv6 examples used non-hexadecimal hextets such as `storage`, `dbreplica`, `transit`, and `repl`, which are not valid IPv6 literals. Replaced them with valid documentation-prefix subnets and host addresses while keeping the original topology intact.
- The Cisco BGP VRF example configured `neighbor ... remote-as` inside the IPv6 address-family and omitted `neighbor ... activate`. Updated it to the Cisco-documented pattern: define the neighbor in BGP router mode, then activate it under `address-family ipv6 vrf REPLICATION`.
- The Linux HTB example set `default 30` without defining a matching `1:30` class, which would misclassify unfiltered traffic. Changed the default class to `10` so it matches the existing production class, and fixed the replication bandwidth comment to match the `rate 1gbit ceil 2gbit` settings.
- The MySQL replication snippet used deprecated terminology and statements: `CHANGE MASTER TO`, `START SLAVE`, and `SHOW SLAVE STATUS`. Updated them to `CHANGE REPLICATION SOURCE TO`, `START REPLICA`, and `SHOW REPLICA STATUS`, and changed the status field in the monitoring script from `Seconds_Behind_Master` to `Seconds_Behind_Source`.
- The MySQL monitoring command used square brackets with `mysql -h`, but the MySQL client host option takes a raw IPv6 literal rather than bracket notation. Removed the brackets.
- The PostgreSQL replication section referenced `recovery.conf`, which PostgreSQL removed in version 12. Updated the example to `postgresql.auto.conf`, which is what `pg_basebackup --write-recovery-conf` populates on PostgreSQL 14.

## Review Notes
- The PostgreSQL example is explicitly versioned to 14 by file path. The `md5` entry in `pg_hba.conf` remains valid there, though newer PostgreSQL guidance prefers `scram-sha-256` and current releases deprecate MD5-encrypted passwords.
- The lag-monitoring script assumes both databases return numeric lag values. In real deployments, startup or failure states can return blank or `NULL` values, so additional guards would make the script more production-safe.
