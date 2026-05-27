# Validation Summary: How to Use Ansible to Configure Database Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- PostgreSQL and postgres_exporter
- MySQL and mysqld_exporter
- MongoDB and Percona mongodb_exporter
- Prometheus
- Alertmanager
- Grafana
- systemd

## Sources Consulted
- Ansible community.postgresql.postgresql_user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- Ansible community.mysql.mysql_user module documentation: https://docs.ansible.com/ansible/latest/collections/community/mysql/mysql_user_module.html
- Ansible community.mongodb.mongodb_user module documentation: https://docs.ansible.com/ansible/latest/collections/community/mongodb/mongodb_user_module.html
- Ansible ansible.builtin.systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- prometheus-community/postgres_exporter documentation and v0.15.0 release assets: https://github.com/prometheus-community/postgres_exporter
- prometheus/mysqld_exporter documentation and v0.15.1 release assets: https://github.com/prometheus/mysqld_exporter
- Percona mongodb_exporter documentation and v0.40.0 release assets: https://github.com/percona/mongodb_exporter
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- MongoDB built-in roles documentation: https://www.mongodb.com/docs/current/reference/built-in-roles/

## Issues Found
- The verification play used `hosts: database_servers`, but the inventory did not define a `database_servers` group. Added a `[database_servers:children]` group containing the PostgreSQL, MySQL, and MongoDB host groups.
- The MongoDB exporter play configured the exporter to authenticate as `monitoring`, but it did not create that MongoDB user. Added a `community.mongodb.mongodb_user` task granting `clusterMonitor` on `admin` and `read` on `local`, matching Percona's documented exporter permissions.
- The PostgreSQL key metrics list used `pg_replication_lag` and `pg_database_size_bytes`, but the custom queries in the post expose `pg_replication_lag_lag_seconds` and `pg_database_size_size_bytes`. Updated the metric names to match the shown query configuration.

## Review Notes
- The PostgreSQL exporter's `--extend.query-path` custom-query mechanism is documented as deprecated in favor of built-in collectors or a generic SQL exporter for custom SQL metrics, but it is still supported by the version shown in the post.
- The Prometheus target and alert rule files assume the main Prometheus configuration already references `/etc/prometheus/targets/*.yml` through `file_sd_configs` and `/etc/prometheus/rules/*.yml` through `rule_files`.
