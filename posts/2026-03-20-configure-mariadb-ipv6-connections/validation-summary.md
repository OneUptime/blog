# Validation Summary: How to Configure MariaDB for IPv6 Connections

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- MariaDB Server (bind_address, user accounts, IPv6 host patterns)
- MariaDB Galera Cluster (wsrep_cluster_address with IPv6)
- systemd (service management)
- ss (socket statistics)
- mysql / mysqladmin CLI clients
- pymysql (Python client library)
- firewalld (rich rules for IPv6)
- ip6tables / iptables-persistent

## Sources Consulted
- MariaDB Server System Variables — https://mariadb.com/kb/en/server-system-variables/
- MariaDB Remote Connection Guide — https://mariadb.com/docs/server/mariadb-quickstart-guides/mariadb-remote-connection-guide
- Galera Cluster Address — https://mariadb.com/kb/en/galera-cluster-address/
- mariadbd binary documentation — https://mariadb.com/kb/en/mariadbd/
- MariaDB 10.4 → 10.5 upgrade notes (mysqld → mariadbd rename)
- CREATE USER — https://mariadb.com/kb/en/create-user/
- MDEV-27275 (Galera IPv6 bracket parsing) — https://jira.mariadb.org/browse/MDEV-27275
- iptables-persistent path conventions on Debian/Ubuntu

## Issues Found

1. **Multiple bind-address version claim was wrong.** The post stated "Bind to both IPv4 and IPv6 (MariaDB 10.3+)" with a comment "Use multiple bind-address lines or :: for all". Multiple bind addresses via comma-separated list were introduced in **MariaDB 10.11**, not 10.3, and MariaDB does NOT support multiple `bind-address` lines (the last one wins). Updated the comment to "Bind to multiple specific addresses (MariaDB 10.11+)" with a comma-separated example: `bind-address = 2001:db8::10,192.0.2.10`.

2. **`grep mysql` would miss MariaDB 10.5+ processes.** Since MariaDB 10.5.2, the binary is `mariadbd`, so `ss -6 -tlnp | grep mysql` would not match the process name in modern installs. Changed to `ss -6 -tlnp | grep -E 'mariadb|mysql'` so the command works on both modern (`mariadbd`) and older (`mysqld`) installs.

3. **Wrong path for IPv6 iptables persistence.** The post wrote `ip6tables-save > /etc/ip6tables/rules.v6`. The `/etc/ip6tables/` directory does not exist on Debian/Ubuntu; the `iptables-persistent` package uses `/etc/iptables/rules.v4` and `/etc/iptables/rules.v6`. Corrected to `/etc/iptables/rules.v6`.

## Review Notes

- **Galera cluster address ports:** The example `gcomm://[2001:db8::10],[2001:db8::11],[2001:db8::12]` works (default Galera port 4567 is implied), but in production deployments it is more reliable to be explicit, e.g. `gcomm://[2001:db8::10]:4567,[2001:db8::11]:4567`. Some older MariaDB/Galera versions had bracket-parsing edge cases (MDEV-27275). The current example is technically correct and was left as-is.
- **`bind-address = ::` semantics:** Before MariaDB 10.6, `::` accepted both IPv4 and IPv6 (IPv4-mapped via `::ffff:` form). From 10.6.0 onward, `::` is strictly IPv6. The post's comment "Bind to all interfaces (IPv4 and IPv6)" is broadly correct for typical Linux dual-stack behavior but could be more precise on newer versions. Left unchanged since the practical effect on most Linux dual-stack systems matches the description.
- **IPv6 host wildcards:** MariaDB uses LIKE-style matching for the host portion, so `'dbuser'@'2001:db8::%'` works as the post describes. Note that, unlike IPv4, MariaDB does not support CIDR/netmask notation for IPv6 — only literal addresses and `%`/`_` wildcards.
- **Python example:** The pymysql code is syntactically correct. Note that `pymysql` accepts a bare IPv6 string for `host=` without brackets, which is what the post does.
