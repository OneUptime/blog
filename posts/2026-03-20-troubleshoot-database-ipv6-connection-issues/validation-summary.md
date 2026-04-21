# Validation Summary: How to Troubleshoot Database IPv6 Connection Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- IPv6 networking
- Linux networking tools: ss, ip, ping, traceroute, nc, mtr
- Linux firewalls: ip6tables, firewalld, UFW
- PostgreSQL and TimescaleDB
- MySQL and MariaDB
- Redis
- MongoDB and mongosh
- Elasticsearch
- Apache Cassandra

## Sources Consulted
- PostgreSQL documentation: `listen_addresses`, `pg_hba.conf`, SCRAM authentication, and libpq connection parameters: https://www.postgresql.org/docs/current/runtime-config-connection.html, https://www.postgresql.org/docs/current/auth-pg-hba-conf.html, https://www.postgresql.org/docs/current/libpq-connect.html
- MySQL documentation: IPv6 support and account host names: https://dev.mysql.com/doc/refman/8.4/en/ipv6-support.html, https://dev.mysql.com/doc/refman/8.4/en/account-names.html
- MariaDB documentation: `bind_address` IPv4/IPv6 behavior: https://mariadb.com/docs/server/server-management/variables-and-modes/server-system-variables
- MongoDB documentation: `net.bindIp`, `net.bindIpAll`, `net.ipv6`, connection strings, and `mongosh --verbose`: https://www.mongodb.com/docs/manual/reference/configuration-options/, https://www.mongodb.com/docs/current/reference/connection-string/, https://www.mongodb.com/docs/mongodb-shell/reference/options/
- Redis documentation: `bind`, protected mode, inline commands, and netcat PING examples: https://redis.io/docs/latest/operate/oss_and_stack/management/security/, https://redis.io/docs/latest/develop/reference/protocol-spec/, https://redis.io/docs/latest/develop/using-commands/pipelining/
- Elasticsearch networking settings and default HTTP port range: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/networking-settings
- Apache Cassandra `native_transport_port` and IPv6 interface preferences: https://cassandra.apache.org/doc/4.1.0/cassandra/configuration/cass_yaml_file.html
- firewalld `firewall-cmd --list-all` documentation: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Ubuntu UFW documentation: https://ubuntu.com/server/docs/how-to/security/firewalls/
- RFC 3986 URI syntax for bracketed IPv6 literals: https://www.rfc-editor.org/rfc/rfc3986
- Local CLI help output for `ss`, `ip`, `nc`, `ping`, `mtr`, `ip6tables`, and `ufw`.

## Issues Found
- The MongoDB configuration check only looked for `bindIp`. MongoDB requires IPv6 support to be enabled with `net.ipv6: true` in addition to binding an IPv6 address or using `net.bindIpAll`, so the grep command and fix summary now mention both.
- The Redis netcat test used `echo "PING" | nc`, which can rely on loose line-ending handling and may hang with clients/servers that keep the TCP connection open. It now uses `printf "PING\r\n" | nc -6 -w 2 ...`, matching Redis inline command examples and adding a timeout.
- The MySQL/MariaDB `bind-address` grep used an imprecise regex and omitted common MySQL config paths on Debian/Ubuntu. It now explicitly matches `bind-address` or `bind_address` and checks common MySQL, MariaDB, and RHEL-style config locations.
- The PostgreSQL `pg_hba.conf` example appended an IPv6 rule but did not reload PostgreSQL in that step. It now reloads PostgreSQL immediately after the example change.
- The guide used legacy IPv6 command aliases (`ping6`, `traceroute6`) in examples. These were updated to the primary command forms `ping -6` and `traceroute -6`.
- The application IPv6 literal guidance showed brackets as universally applicable. It now clarifies that brackets are for URI-style connection strings, while plain IPv6 literals are used where a client option accepts a host value directly.

## Review Notes
The remaining commands are syntactically valid for common Linux distributions, but several paths and service names are distribution-specific. The firewall examples are suitable for troubleshooting but should be tightened for production by limiting source ranges and making the intended persistence model explicit.
