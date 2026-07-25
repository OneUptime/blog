# Validation Summary: Percona Server 8.4 and `mysql_native_password`: Migrate Clients Safely

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered

- Percona Server for MySQL 8.4
- MySQL 8.4 authentication plugins
- `mysql_native_password`
- `caching_sha2_password`
- MySQL client TLS and RSA password exchange
- MySQL account management
- MySQL asynchronous replication

## Sources Consulted

- [Percona Server for MySQL 8.4 authentication methods](https://docs.percona.com/percona-server/8.4/authentication-methods.html)
- [Percona Server for MySQL 8.4 upgrade checklist](https://docs.percona.com/percona-server/8.4/upgrade-checklist-8.4.html)
- [MySQL 8.4 native pluggable authentication](https://dev.mysql.com/doc/refman/8.4/en/native-pluggable-authentication.html)
- [MySQL 8.4 caching SHA-2 pluggable authentication](https://dev.mysql.com/doc/refman/8.4/en/caching-sha2-pluggable-authentication.html)
- [MySQL 8.4 pluggable authentication and client/server compatibility](https://dev.mysql.com/doc/refman/8.4/en/pluggable-authentication.html)
- [MySQL 8.4 connection options and TLS modes](https://dev.mysql.com/doc/refman/8.4/en/connection-options.html)
- [MySQL 8.4 CREATE USER](https://dev.mysql.com/doc/refman/8.4/en/create-user.html)
- [MySQL 8.4 ALTER USER](https://dev.mysql.com/doc/refman/8.4/en/alter-user.html)
- [MySQL 8.4 CHANGE REPLICATION SOURCE TO](https://dev.mysql.com/doc/refman/8.4/en/change-replication-source-to.html)
- [MySQL 8.4 replication metadata repositories](https://dev.mysql.com/doc/refman/8.4/en/replica-logs-status.html)
- [MySQL 8.4 account user names and passwords](https://dev.mysql.com/doc/refman/8.4/en/user-names.html)
- [MySQL 8.4 information functions](https://dev.mysql.com/doc/refman/8.4/en/information-functions.html)
- [MySQL 8.4.8 release notes](https://dev.mysql.com/doc/relnotes/mysql/8.4/en/news-8-4-8.html)

## Issues Found

- The post said that full `caching_sha2_password` authentication requires TLS or RSA-based password exchange. MySQL also treats Unix socket and shared-memory connections as secure transports. The wording now says that full authentication requires a secure transport, using TLS for TCP as the relevant example, or RSA-based password exchange.
- The post presented `ERROR 1524 (HY000): Plugin 'mysql_native_password' is not loaded` as the expected error for an existing native-password account attempting to connect. Current MySQL 8.4 documentation shows an access-denied error for that case, and error reporting varied in earlier 8.4 patch releases. Error 1524 is reliably documented for `CREATE USER` or `ALTER USER` statements that explicitly name the disabled plugin. The diagnostic text now distinguishes connection rejection from account-management errors and no longer relies on error 1524 to identify a failed login.

## Review Notes

- The compatibility option, deprecation/removal timeline, account inventory queries, account-management statements, TLS mode, authentication-cache behavior, plugin-status query, replication statements, and `USER()`/`CURRENT_USER()` explanation are correct for Percona Server/MySQL 8.4.
- `--ssl-mode=VERIFY_IDENTITY` requires a configured CA file or CA path; the post correctly tells the reader to configure the endpoint's trusted certificate authority.
- The replication example correctly enables encryption and server-certificate verification. MySQL 8.4 limits `SOURCE_PASSWORD` values in `CHANGE REPLICATION SOURCE TO` to 32 characters, which operators should account for when generating replication credentials.
