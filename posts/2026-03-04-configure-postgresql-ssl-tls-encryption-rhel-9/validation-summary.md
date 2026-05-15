# Validation Summary: How to Configure PostgreSQL with SSL/TLS Encryption on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- PostgreSQL
- SSL/TLS
- firewalld
- OpenSSL certificates

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and using database servers - Installing PostgreSQL and configuring PostgreSQL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/configuring_and_using_database_servers
- Red Hat Enterprise Linux 9 documentation: Configuring TLS encryption on a PostgreSQL server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/configuring_and_using_database_servers#configuring-tls-encryption-on-a-postgresql-server_using-postgresql
- PostgreSQL documentation: Secure TCP/IP Connections with SSL: https://www.postgresql.org/docs/current/ssl-tcp.html
- PostgreSQL documentation: The pg_hba.conf File: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- PostgreSQL documentation: libpq SSL support and sslmode behavior: https://www.postgresql.org/docs/current/libpq-ssl.html
- Red Hat Enterprise Linux 9 documentation: Using and configuring firewalld: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The post title and description promised PostgreSQL SSL/TLS configuration, but the original steps covered generic PostgreSQL, MariaDB, and MySQL setup without enabling TLS. Removed the unrelated MariaDB/MySQL commands and focused the procedure on PostgreSQL.
- The original PostgreSQL configuration section only mentioned general tuning. Added the required certificate/key placement, ownership, private-key permissions, and `ssl = on` setting according to Red Hat and PostgreSQL documentation.
- The original user creation command created a PostgreSQL role without a password, which would not work with the documented password authentication method. Replaced it with `CREATE ROLE ... WITH LOGIN PASSWORD`.
- The original network access section did not show a TLS-requiring authentication rule. Added `hostssl` `pg_hba.conf` entries with `scram-sha-256`, including localhost entries for the verification command and a note to place them before broader matching `host` entries.
- The original verification command used a normal connection and did not prove TLS was in use. Updated it to use `sslmode=require` and query `pg_stat_ssl` for the current backend.
- The summary used lowercase `postgresql` and claimed SSL/TLS had been configured even though the original content did not do so. Updated the procedure so the claim is accurate and corrected the product capitalization.

## Review Notes
- The example uses a restricted sample client network (`192.0.2.0/24`) and tells readers to replace it with their real client network. Production deployments should use a CA-issued certificate and client-side verification such as `sslmode=verify-full` with a trusted root certificate.
