# Validation Summary: How to Test Database Connectivity over IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 networking
- ICMP ping
- netcat / nc
- PostgreSQL psql and pg_isready
- MySQL / MariaDB mysql and mysqladmin
- Redis and RESP
- MongoDB mongosh
- Bash scripting
- Python socket programming
- Elasticsearch, Cassandra, CockroachDB, and InfluxDB default service ports

## Sources Consulted
- iputils ping man page: https://manpages.debian.org/testing/iputils-ping/ping6.8.en.html
- OpenBSD nc manual: https://man.openbsd.org/nc.1
- PostgreSQL psql documentation: https://www.postgresql.org/docs/current/app-psql.html
- PostgreSQL pg_isready documentation: https://www.postgresql.org/docs/current/app-pg-isready.html
- PostgreSQL libpq connection documentation: https://www.postgresql.org/docs/current/libpq-connect.html
- MySQL IPv6 connection documentation: https://dev.mysql.com/doc/refman/8.4/en/ipv6-remote-connections.html
- MySQL mysql client options: https://dev.mysql.com/doc/refman/8.4/en/mysql-command-options.html
- MySQL mysqladmin documentation: https://dev.mysql.com/doc/refman/8.4/en/mysqladmin.html
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis protocol specification: https://redis.io/docs/latest/develop/reference/protocol-spec/
- MongoDB mongosh options: https://www.mongodb.com/docs/mongodb-shell/reference/options/
- MongoDB connection string documentation: https://www.mongodb.com/docs/current/reference/connection-string/
- RFC 3986 URI host syntax: https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.2
- Python socket documentation: https://docs.python.org/3/library/socket.html
- RFC 3849 IPv6 documentation prefix: https://datatracker.ietf.org/doc/html/rfc3849
- Elasticsearch API usage documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/_api_usage.html
- Apache Cassandra port documentation: https://cassandra.apache.org/doc/stable/cassandra/overview/faq/index.html
- CockroachDB connection parameters: https://www.cockroachlabs.com/docs/stable/connection-parameters
- InfluxDB port documentation: https://docs.influxdata.com/influxdb/v1/administration/config/

## Issues Found
- The ICMP example used `ping6`. Current iputils documents IPv6 selection through `ping -6`, and notes that the `ping6` binary was merged into `ping`. Updated the example and summary to use `ping -6`.
- The raw Redis TCP example used `echo "PING" | nc -6 ...`, which sends LF rather than the RESP CRLF terminator and may wait indefinitely on clients that keep the socket open. Updated it to `printf "PING\r\n" | nc -6 -w 5 ...`.
- The final troubleshooting sentence implied that a successful TCP check followed by a failed database client connection usually means authentication/access control. Broadened this to application-layer causes such as authentication, TLS, protocol settings, or database access control.

## Review Notes
The commands and code examples are otherwise technically sound. The examples use `2001:db8::10`, which is the RFC 3849 documentation prefix; readers must replace it with a reachable IPv6 address assigned in their own environment.
