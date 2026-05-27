# Validation Summary: How to Use Ansible to Manage Database SSL/TLS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and handlers
- community.crypto Ansible collection
- PostgreSQL SSL/TLS configuration
- MySQL encrypted connection configuration
- MongoDB TLS configuration
- X.509 certificates and certificate rotation

## Sources Consulted
- Ansible community.crypto x509_certificate module: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/x509_certificate_module.html
- Ansible community.crypto x509_certificate_info module: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/x509_certificate_info_module.html
- Ansible lineinfile module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- PostgreSQL 16 SSL documentation: https://www.postgresql.org/docs/16/ssl-tcp.html
- PostgreSQL 16 pg_hba.conf documentation: https://www.postgresql.org/docs/16/auth-pg-hba-conf.html
- MySQL 8.4 encrypted connections documentation: https://dev.mysql.com/doc/refman/8.4/en/using-encrypted-connections.html
- MongoDB TLS/SSL deployment documentation: https://www.mongodb.com/docs/manual/tutorial/configure-ssl/
- MongoDB configuration options reference: https://www.mongodb.com/docs/manual/reference/configuration-options/

## Issues Found
- The certificate generation snippet used `DNS:\1` and `IP:\1` inside Jinja string literals. In Jinja, `\1` is interpreted as a control character rather than a regex backreference, so the SAN list would not be generated correctly. Changed these to `DNS:\\1` and `IP:\\1`.
- The text said the playbook generated server certificates, but the snippet generates one server certificate with SANs for all database hosts. Updated the wording to singular.
- The PostgreSQL `pg_hba.conf` task only covered IPv4 and used a broad `^hostssl` regexp that could replace an unrelated `hostssl` entry. Updated it to manage explicit IPv4 and IPv6 `hostssl` records.
- The PostgreSQL CA task name implied client certificate verification was enabled by itself. PostgreSQL requires `pg_hba.conf` options such as `clientcert` to enforce client certificate checks, so the task name was narrowed to avoid that implication.
- The MySQL verification task ran before the restart handler would normally execute, so it could check the old server configuration. Added `ansible.builtin.meta: flush_handlers` before verification.
- The MongoDB `blockinfile` snippet inserted a second top-level `net:` key into `mongod.conf`, which can produce invalid or misleading YAML. Changed it to insert the TLS block under the existing `net:` key with preserved indentation.

## Review Notes
- The tutorial uses one shared server certificate and private key across all database hosts. That can work when all hostnames/IPs are in the SAN list, but per-host certificates reduce key exposure and are preferable for production.
- The MySQL verification command assumes the local `mysql` client can authenticate without explicit credentials, such as via socket authentication or a configured defaults file.
- The MongoDB snippet assumes `/etc/mongod.conf` already contains a top-level `net:` key, which is true for common packaged configurations but should be verified in custom deployments.
