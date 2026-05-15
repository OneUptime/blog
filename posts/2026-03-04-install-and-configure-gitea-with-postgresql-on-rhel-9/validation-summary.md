# Validation Summary: How to Install and Configure Gitea with PostgreSQL on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Gitea
- PostgreSQL
- systemd
- Git

## Sources Consulted
- Gitea documentation, Installation from binary: https://docs.gitea.com/installation/install-from-binary
- Gitea documentation, Run as a Linux service: https://docs.gitea.com/installation/linux-service
- Gitea documentation, Database Preparation for PostgreSQL: https://docs.gitea.com/1.22/installation/database-prep
- Gitea documentation, Command Line secret generation: https://docs.gitea.com/1.26/administration/command-line
- Red Hat documentation, RHEL 9 Configuring and using database servers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/configuring_and_using_database_servers

## Issues Found
- The original post did not install Gitea. Added the official binary installation flow, including Git dependency, Gitea system user, directory creation, binary download, GPG verification, and installation to `/usr/local/bin/gitea`.
- The original post used placeholders such as `/etc/<service>/config.conf` and `<service-name>`, which would not work. Replaced them with real Gitea paths and the `gitea.service` systemd unit.
- The original post listed PostgreSQL as a prerequisite while also installing PostgreSQL in the first step. Updated the prerequisite and made PostgreSQL installation, initialization, enablement, and startup explicit.
- The original post did not create a PostgreSQL role or database for Gitea. Added `CREATE ROLE` and `CREATE DATABASE` commands matching Gitea's PostgreSQL preparation guidance.
- The original post did not configure PostgreSQL authentication for Gitea. Added a `pg_hba.conf` rule for `giteadb` and `scram-sha-256` password authentication.
- The original post did not create a Gitea `app.ini`. Added a minimal working PostgreSQL-backed configuration with generated `SECRET_KEY` and `INTERNAL_TOKEN` values.
- The original service start, verification, logging, and troubleshooting commands referenced placeholders. Updated them to use `gitea.service` and added a local HTTP check.

## Review Notes
- The post now uses Gitea 1.26.1 in the example commands because that was the current version shown in the official Gitea documentation at review time. Future updates should verify the current Gitea version and download URLs.
- For production, administrators should replace `localhost` in `ROOT_URL`, `DOMAIN`, and `SSH_DOMAIN` with the real hostname and consider TLS termination, firewall rules, backups, and stricter PostgreSQL transport security.
