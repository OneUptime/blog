# Validation Summary: How to Configure IPv6 for Cross-Data-Center Replication

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing
- PostgreSQL streaming replication
- MySQL Group Replication
- Linux `ip6tables`
- Ceph networking and monitor discovery
- Linux TCP/sysctl tuning
- Prometheus and exporters

## Sources Consulted
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- PostgreSQL standby and streaming replication docs: https://www.postgresql.org/docs/16/warm-standby.html
- PostgreSQL `pg_hba.conf` docs: https://www.postgresql.org/docs/16/auth-pg-hba-conf.html
- PostgreSQL obsolete `recovery.conf` notice: https://www.postgresql.org/docs/current/recovery-config.html
- PostgreSQL libpq connection parameter docs: https://www.postgresql.org/docs/current/libpq-connect.html
- MySQL Group Replication system variables: https://dev.mysql.com/doc/refman/8.4/en/group-replication-system-variables.html
- MySQL IPv6 support for Group Replication: https://dev.mysql.com/doc/mysql/8.0/en/group-replication-ipv6.html
- MySQL Group Replication IP address permissions: https://dev.mysql.com/doc/refman/8.0/en/group-replication-ip-address-permissions.html
- Ceph network configuration reference: https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Ceph Messenger v2 docs: https://docs.ceph.com/en/pacific/rados/configuration/msgr2/
- Ceph configuration reference for `mon_host` and address formats: https://docs.ceph.com/en/reef/rados/configuration/ceph-conf/
- Linux kernel `/proc/sys/net/core` docs: https://docs.kernel.org/admin-guide/sysctl/net.html
- Linux kernel IP sysctl docs: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `ip6tables(8)` manual: https://www.man7.org/linux/man-pages/man8/ip6tables.8.html
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/
- Prometheus exporters catalog: https://prometheus.io/docs/instrumenting/exporters/

## Issues Found
- The replication subnet examples used `repl` as part of an IPv6 hextet, which is invalid because IPv6 text notation allows only hexadecimal digits. I replaced the example subnets with valid documentation-prefix IPv6 ranges.
- The PostgreSQL standby example referenced `recovery.conf`, which was removed in PostgreSQL 12. I updated the example to use `postgresql.conf` and noted the required `standby.signal` file.
- The MySQL Group Replication example used one local address for all nodes and listed only one seed, which is not a correct group configuration. I changed it to use unique member addresses, a shared seed list, and an IPv6 allowlist for the default XCom stack.
- The MySQL snippet implied runtime changes would apply immediately. I added a note that `group_replication_local_address` and `group_replication_group_seeds` take effect after Group Replication is stopped and started on the member.
- The Ceph example placed `mon_host` under individual monitor sections with legacy-looking per-monitor syntax. I corrected it to use `mon_host` in `[global]`, which matches current Ceph documentation for monitor discovery.
- The latency-tuning section included `net.ipv6.conf.all.use_oif_addrs_only=1`, which affects IPv6 source-address selection rather than TCP replication performance. I replaced it with TCP buffer tuning parameters that match the Linux kernel networking documentation.
- The monitoring section claimed Prometheus plus `node_exporter` could track replication lag directly. I corrected this to require database- or storage-specific exporters, while keeping `node_exporter` for host and network metrics.

## Review Notes
- The examples use the documentation prefix `2001:db8::/32`, which is appropriate for a blog post but is not routable in production.
- The article does not pin software versions. The PostgreSQL fix assumes PostgreSQL 12 or later, the MySQL Group Replication guidance reflects current MySQL 8.4 documentation, and the Ceph monitor guidance reflects current Ceph documentation where `mon_host` is normally configured in `[global]`.
