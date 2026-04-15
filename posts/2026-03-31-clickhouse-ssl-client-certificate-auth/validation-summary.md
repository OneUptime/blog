# Validation Summary: How to Use SSL Client Certificate Authentication in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (server configuration, SQL user management, system tables)
- OpenSSL (certificate generation, CA management)
- SSL/TLS (mutual TLS / mTLS authentication)
- clickhouse-client (native CLI client)
- clickhouse-driver (Python driver)
- curl (HTTPS client connections)

## Sources Consulted
- [ClickHouse Configuring SSL-TLS](https://clickhouse.com/docs/guides/sre/tls/configuring-tls) — verified OpenSSL config element names, `tcp_port_secure`, and `disableProtocols`
- [ClickHouse CREATE USER](https://clickhouse.com/docs/sql-reference/statements/create/user) — verified `IDENTIFIED WITH ssl_certificate` syntax and multiple authentication methods
- [ClickHouse ALTER USER](https://clickhouse.com/docs/sql-reference/statements/alter/user) — verified ALTER USER syntax for certificate auth
- [ClickHouse SSL X.509 certificate authentication](https://clickhouse.com/docs/operations/external-authenticators/ssl-x509) — verified users.xml format and CN/SAN matching
- [ClickHouse Configuring SSL user certificate for authentication](https://clickhouse.com/docs/guides/sre/ssl-user-auth) — verified end-to-end mTLS setup workflow
- [ClickHouse system.session_log](https://clickhouse.com/docs/operations/system-tables/session_log) — verified column names and `auth_type` enum values
- [ClickHouse Network ports](https://clickhouse.com/docs/guides/sre/network-ports) — verified default port numbers (9440 for secure TCP, 8443 for HTTPS)
- [clickhouse-driver GitHub / PyPI](https://github.com/mymarilyn/clickhouse-driver) — verified Python client SSL parameters (`ca_certs`, `certfile`, `keyfile`)

## Issues Found

1. **Incorrect config element `<tcp_ssl_port>`**: The blog used `<tcp_ssl_port>9440</tcp_ssl_port>`. The correct ClickHouse config element is `<tcp_port_secure>`. Fixed to `<tcp_port_secure>9440</tcp_port_secure>`.

2. **Non-existent config element `<requireTLSv1_2>`**: The blog used `<requireTLSv1_2>true</requireTLSv1_2>` to enforce TLS 1.2+. This element does not exist in ClickHouse's OpenSSL configuration. The correct approach is `<disableProtocols>sslv2,sslv3,tlsv1,tlsv1_1</disableProtocols>`. Fixed accordingly.

3. **Incorrect `auth_type` value in session_log query**: The blog filtered with `WHERE auth_type = 'SSL Certificate'`. The actual enum value in `system.session_log` is `SSL_CERTIFICATE` (uppercase with underscore). Fixed to `WHERE auth_type = 'SSL_CERTIFICATE'`.

4. **Incorrect `OR` syntax for multiple CN matching**: The blog used `OR ssl_certificate CN 'value'` to specify multiple allowed CNs. ClickHouse uses comma-separated syntax for multiple authentication methods: `IDENTIFIED WITH ssl_certificate CN 'cn1', ssl_certificate CN 'cn2'`. Fixed in both the "Matching on Multiple CNs" section and the "Certificate Rotation" section.

## Review Notes
- The `clickhouse-client` section shows `--certificate`, `--private_key`, and `--ca_certificate` as direct CLI flags. Official ClickHouse documentation primarily shows the config-file approach (setting `<certificateFile>`, `<privateKeyFile>`, `<caConfig>` under `<openSSL><client>` in a client config XML, then passing `--config-file`). These CLI flags may work in newer ClickHouse versions but are not prominently documented. Readers who encounter issues should fall back to the config-file approach.
- The `<loadDefaultCAFile>false</loadDefaultCAFile>` element is placed in the `<server>` section. While this is a valid Poco OpenSSL option and will work, it is more commonly seen in the `<client>` section in official docs.
- OpenSSL commands shown are standard and correct. The key sizes (4096 for CA, 2048 for server/client) and certificate validity periods are reasonable choices.
- The Python `clickhouse-driver` parameters (`ca_certs`, `certfile`, `keyfile`) are confirmed correct per the driver's source code.
- The post correctly notes that ClickHouse supports both CN and SAN matching for certificate authentication.
