# Validation Summary: How to Use K3s with External Database

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- K3s
- Kubernetes
- PostgreSQL
- MySQL
- MariaDB
- etcd
- HAProxy
- systemd
- Kubernetes CronJob

## Sources Consulted
- K3s Cluster Datastore documentation: https://docs.k3s.io/datastore
- K3s High Availability External DB documentation: https://docs.k3s.io/datastore/ha
- K3s server CLI documentation: https://docs.k3s.io/cli/server
- etcd configuration documentation: https://etcd.io/docs/v3.6/op-guide/configuration/
- Kubernetes etcd administration and snapshot documentation: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- MySQL native authentication documentation: https://dev.mysql.com/doc/refman/8.4/en/native-pluggable-authentication.html

## Issues Found
- PostgreSQL setup created the database before the K3s user and only granted database privileges. Changed it to create the user first and create the database with that user as owner so K3s can create and manage its schema on modern PostgreSQL installations.
- PostgreSQL connection example included `pool_max_conns`, which is not part of the lib/pq-style connection parameters referenced by K3s. Removed it and kept `connect_timeout`.
- MySQL setup forced `mysql_native_password`, which is deprecated in MySQL 8.0.34, disabled by default in MySQL 8.4, and removed in MySQL 9.0. Changed the example to use the server default authentication plugin.
- MySQL datastore examples used `tls=true`, `tls=custom`, and `tls-ca` in the DSN. K3s documentation notes that the MySQL `tls` parameter cannot be set in the datastore endpoint due to a known issue. Replaced those examples with `datastore-cafile` usage and removed the unsupported DSN parameters.
- External etcd K3s config included `disable-etcd` and `cluster-init: false`. `cluster-init` initializes embedded etcd and is not part of external datastore setup; `disable-etcd` is not needed for an external datastore endpoint. Removed both entries.
- External database HA first-server setup used `cluster-init: true`, which is for embedded etcd, not external PostgreSQL/MySQL/etcd datastores. Removed it.
- PostgreSQL and MySQL backup scripts referenced `DB_PASSWORD` without defining or requiring it. Added explicit environment-variable validation.
- Kubernetes CronJob backup example used `$DB_HOST` and `$DB_USER` without setting them. Added the missing environment variables.

## Review Notes
- K3s documentation recommends setting datastore connection parameters through environment variables rather than command-line arguments so credentials do not appear in process listings. The post still shows CLI examples for readability, but the production configuration examples use config files.
- Current K3s docs certify external datastore support against etcd 3.5.21, MySQL 8.0/8.4, MariaDB 10.11/11.4, and PostgreSQL 15.12/16.7/17.3 as of this review.
