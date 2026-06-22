# Validation Summary: How to Set Up PostgreSQL for PCI DSS Compliance

## Status
validated

## Post Type
Guide

## Technologies Covered
- PostgreSQL
- PCI DSS
- SSL/TLS
- pgcrypto
- PostgreSQL roles and row-level security
- pgAudit
- PostgreSQL logging
- pg_hba.conf
- SCRAM-SHA-256 authentication

## Sources Consulted
- PostgreSQL documentation: SSL support - https://www.postgresql.org/docs/current/libpq-ssl.html
- PostgreSQL documentation: Connections and authentication settings - https://www.postgresql.org/docs/current/runtime-config-connection.html
- PostgreSQL documentation: The pg_hba.conf file - https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- PostgreSQL documentation: pgcrypto - https://www.postgresql.org/docs/current/pgcrypto.html
- PostgreSQL documentation: Row security policies - https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- PostgreSQL documentation: Error reporting and logging - https://www.postgresql.org/docs/current/runtime-config-logging.html
- pgAudit official documentation - https://github.com/pgaudit/pgaudit
- PCI DSS v4.0.1, PCI Security Standards Council - https://www.pcisecuritystandards.org/document_library/

## Issues Found
- The pgAudit example omitted `shared_preload_libraries = 'pgaudit'`. pgAudit requires being loaded through `shared_preload_libraries`; otherwise the extension will not audit correctly. Added the required `postgresql.conf` setting before `CREATE EXTENSION pgaudit`.
- The pgAudit snippet enabled `pgaudit.log_parameter = on`, which can log bound parameter values and expose cardholder data in audit logs. Changed it to `off` to avoid logging sensitive parameter values.
- The logging configuration used `log_min_duration_statement = 0`, which logs every statement and can expose sensitive SQL literals in logs. Changed it to a slow-statement threshold of `1000` milliseconds while leaving pgAudit responsible for audit events.
- The pgcrypto example used a literal encryption key in SQL. Replaced it with `current_setting('app.encryption_key')` so the example does not hard-code the encryption key in the statement.

## Review Notes
The post is a high-level configuration guide and does not by itself establish PCI DSS compliance. In a production PCI DSS assessment, organizations still need documented scope, key management, log protection and retention, vulnerability management, access reviews, backup encryption, and evidence collection outside PostgreSQL configuration.
