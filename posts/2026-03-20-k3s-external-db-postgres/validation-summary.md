# Validation Summary: How to Configure K3s with an External Database (PostgreSQL) - Postgres

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s
- Kubernetes
- PostgreSQL
- Amazon RDS for PostgreSQL
- OpenSSL
- `psql` / `pg_dump`

## Sources Consulted
- K3s Cluster Datastore docs: https://docs.k3s.io/datastore
- K3s High Availability with External DB docs: https://docs.k3s.io/datastore/ha
- K3s Configuration Options docs: https://docs.k3s.io/installation/configuration
- K3s Server CLI docs: https://docs.k3s.io/cli/server
- K3s Agent CLI docs: https://docs.k3s.io/cli/agent
- PostgreSQL `pg_hba.conf` docs: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- PostgreSQL password authentication docs: https://www.postgresql.org/docs/current/auth-password.html
- PostgreSQL SSL server setup docs: https://www.postgresql.org/docs/current/ssl-tcp.html
- PostgreSQL libpq SSL docs: https://www.postgresql.org/docs/current/libpq-ssl.html
- PostgreSQL `pg_stat_statements` docs: https://www.postgresql.org/docs/current/pgstatstatements.html
- Amazon RDS for PostgreSQL SSL docs: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html
- Amazon RDS certificate bundle docs: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html
- `github.com/lib/pq` package docs: https://pkg.go.dev/github.com/lib/pq

## Issues Found
- The `pg_hba.conf` examples used `md5` as the recommended authentication method. PostgreSQL marks MD5 password support as deprecated, and K3s' PostgreSQL driver supports SCRAM. Updated the examples to use `scram-sha-256`.
- The additional server-node example omitted `sudo mkdir -p /etc/rancher/k3s`, which would cause `tee` to fail on a fresh node. Added the missing directory creation step.
- The additional server-node example disabled `servicelb` only on the first server. K3s requires critical flags such as `--disable servicelb` to match across server nodes. Added the same `disable: servicelb` setting to the additional server example.
- The additional server-node `tls-san` comment implied the same hard-coded IP could be reused on every node. Clarified that the per-node IP must be replaced on each server.
- The PostgreSQL SSL certificate commands were incorrect: they referenced a non-existent `privkey.pem`, wrote into the wrong directory, and did not align with PostgreSQL's documented server certificate flow. Replaced them with a working PostgreSQL-style self-signed certificate example in the data directory.
- The SSL section did not explicitly enable PostgreSQL TLS or restart PostgreSQL after changing the server certificate settings. Added `ssl = on`, `ssl_cert_file`, `ssl_key_file`, and a restart step.
- The K3s SSL example used `sslmode=require` while also providing a CA file. Updated it to `sslmode=verify-full` with a hostname-based example so the server certificate is actually verified, and clarified that `datastore-certfile` / `datastore-keyfile` are only needed for client-certificate authentication.
- The Amazon RDS example also used `sslmode=require`. Updated it to `sslmode=verify-full`, which matches AWS guidance when verifying the RDS endpoint certificate with the CA bundle.
- The agent-node example also omitted `sudo mkdir -p /etc/rancher/k3s`. Added it so the config file write works on a new node.
- The monitoring query against `pg_stat_statements` was presented without noting that the extension must be enabled first. Added that prerequisite note.
- The cron backup example was broken because `$(date ...)` would be expanded when creating `/etc/cron.d/k3s-backup`, not when cron runs, and it relied on password authentication that would not work unattended. Reworked the backup examples to run locally on the PostgreSQL host as the `postgres` OS user and fixed the cron quoting.

## Review Notes
- The production TLS example now uses a hostname with `sslmode=verify-full`. If an operator prefers connecting by IP address, the PostgreSQL server certificate must include that IP in its SANs, or the connection should use `verify-ca` instead.
- For Amazon RDS for PostgreSQL, `rds.force_ssl` defaults differ by engine version: AWS documents it as enabled by default for PostgreSQL 15 and later, and disabled by default for 14 and earlier unless you change the parameter group.
