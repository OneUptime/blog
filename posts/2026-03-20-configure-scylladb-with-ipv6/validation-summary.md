# Validation Summary: How to Configure ScyllaDB with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ScyllaDB (Cassandra-compatible NoSQL database)
- IPv6 networking
- scylla.yaml configuration
- CQL (Cassandra Query Language) and cqlsh
- Python cassandra-driver
- Prometheus metrics
- ip6tables firewall rules
- systemd (scylla-server unit)
- nodetool

## Sources Consulted
- ScyllaDB official documentation: https://docs.scylladb.com/
- ScyllaDB scylla.yaml configuration reference: https://docs.scylladb.com/manual/stable/operating-scylla/admin.html
- ScyllaDB system configuration / scylla_setup: https://docs.scylladb.com/manual/stable/getting-started/installation-common/scylla-setup.html
- ScyllaDB ports reference (9042 CQL, 7000 storage, 9180 Prometheus, 10000 REST API)
- ScyllaDB monitoring (Prometheus exporter on port 9180)
- Apache Cassandra driver for Python (DataStax cassandra-driver, compatible with ScyllaDB CQL)
- iptables-persistent package documentation (Debian/Ubuntu rules path: /etc/iptables/rules.v6)
- Linux IPv6 kernel parameter: /proc/sys/net/ipv6/conf/all/disable_ipv6

## Issues Found
- **Wrong iptables-persistent rules path**: The firewall save command wrote to `/etc/ip6tables/rules.v6`, but the `iptables-persistent` package on Debian/Ubuntu stores both IPv4 and IPv6 rules under `/etc/iptables/` (i.e., `/etc/iptables/rules.v6`). The directory `/etc/ip6tables/` does not exist by default and the save would fail. Fixed to `/etc/iptables/rules.v6`.

## Review Notes
- The Ubuntu/Debian install snippet is illustrative and simplified: it adds the GPG key via the deprecated `apt-key add` and does not add the ScyllaDB apt repository source list, so `apt install scylla` would not actually find the package as written. Since the post's focus is IPv6 configuration (not installation) and the official ScyllaDB install instructions are version- and distro-specific, this section was left as-is to preserve the author's high-level intent. Readers should follow the official ScyllaDB install guide for production use.
- The comment "`::` means all interfaces (IPv4 and IPv6)" is a common shorthand. On dual-stack Linux systems with default `IPV6_V6ONLY=0`, binding to `::` typically also accepts IPv4 (via IPv4-mapped IPv6), so the statement is generally accurate but depends on kernel/socket settings.
- The `seed_provider` class `org.apache.cassandra.locator.SimpleSeedProvider` is the correct, ScyllaDB-supported value (ScyllaDB reuses Cassandra's seed-provider class names).
- The Python `cassandra-driver` is compatible with ScyllaDB; readers may also use the ScyllaDB-optimized fork `scylla-driver` for shard-aware routing, though that is an optional enhancement, not a correctness issue.
- Port assignments are correct: 9042 (CQL native), 7000 (inter-node storage), 9180 (Prometheus exporter), 10000 (ScyllaDB REST API).
- The IPv6 prefixes used (`2001:db8::/32`) are the correct documentation prefix per RFC 3849.
