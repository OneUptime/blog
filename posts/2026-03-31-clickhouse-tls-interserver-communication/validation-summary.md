# Validation Summary: How to Enable TLS for ClickHouse Interserver Communication

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (cluster configuration, replication, distributed queries)
- TLS/SSL (certificate generation, OpenSSL)
- OpenSSL CLI (key generation, CSR creation, certificate signing)
- UFW (firewall configuration)

## Sources Consulted
- ClickHouse official documentation on server configuration settings: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse official documentation on SSL/TLS configuration: https://clickhouse.com/docs/en/guides/sre/configuring-ssl
- ClickHouse official documentation on `system.replicas` table: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse official documentation on `system.query_log` table: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse official documentation on cluster/remote_servers configuration: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#remote_servers
- OpenSSL man pages for `genrsa`, `req`, `x509` commands

## Issues Found

1. **CA certificate path inconsistency**: The certificate generation step used the CA cert at `/etc/ssl/certs/clickhouse-ca.crt` and CA key at `/etc/ssl/private/clickhouse-ca.key`, but the `<caConfig>` elements in the ClickHouse `config.xml` referenced `/etc/clickhouse-server/clickhouse-ca.crt`. Without a copy step mentioned in the post, this would cause ClickHouse to fail to find the CA certificate. Fixed by updating all `<caConfig>` paths to `/etc/ssl/certs/clickhouse-ca.crt` to match the generation step.

2. **Missing `tcp_port_secure` configuration**: The remote_servers section used port 9440 with `<secure>1</secure>`, which requires the target ClickHouse nodes to have `<tcp_port_secure>9440</tcp_port_secure>` configured. This setting was not included in the config.xml section, meaning distributed queries would fail to connect on port 9440. Fixed by adding `<tcp_port_secure>9440</tcp_port_secure>` to the config.xml snippet.

3. **Misleading remote_servers description**: The text described the remote_servers update as "use the HTTPS port," but port 9440 is the secure native TCP port (not an HTTPS port). HTTPS would be port 8443. The interserver HTTPS port (9010) is a separate channel used for replication. Fixed the description to say "use the secure native TCP port for distributed queries."

## Review Notes
- The post correctly distinguishes between interserver replication (port 9009/9010) and distributed query traffic (port 9000/9440), though these are two separate communication channels that could be called out more explicitly for clarity.
- The `verificationMode` is set to `relaxed` in the examples, and the best practices section correctly recommends `strict` for production. This is a reasonable tutorial approach.
- The `disableProtocols` setting only disables SSLv2 and SSLv3. In a hardened production environment, TLSv1.0 and TLSv1.1 should also be disabled (e.g., `sslv2,sslv3,tlsv1,tlsv1_1`), but the current setting is not incorrect.
- The certificate validity of 365 days is short; production deployments often use longer validity periods, but this is a reasonable tutorial default.
- The `system.replicas` query filters on `absolute_delay > 0`, which shows only replicas that are behind. This is a useful diagnostic query but won't confirm TLS is in use — it only confirms replication is working. The `system.query_log` query is more relevant for verifying inter-node traffic.
