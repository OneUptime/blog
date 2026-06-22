# Validation Summary: How to Set Up PostgreSQL with Patroni for High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL 16
- Patroni
- etcd / etcd3
- HAProxy
- Prometheus alerting
- systemd

## Sources Consulted
- Patroni 4.1.3 installation documentation: https://patroni.readthedocs.io/en/latest/installation.html
- Patroni 4.1.3 YAML configuration documentation: https://patroni.readthedocs.io/en/latest/yaml_configuration.html
- Patroni 4.1.3 REST API documentation: https://patroni.readthedocs.io/en/latest/rest_api.html
- Patroni 4.1.3 patronictl documentation: https://patroni.readthedocs.io/en/latest/patronictl.html
- etcd v3.5 configuration documentation: https://etcd.io/docs/v3.5/op-guide/configuration/
- HAProxy health check documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/

## Issues Found
- The post installed `patroni[etcd]` and used the `etcd:` Patroni configuration section while the etcd example used etcd 3.5. Current Patroni documentation requires `patroni[etcd3]` and an `etcd3:` section when using etcd API v3, so both examples were updated.
- The Patroni switchover example used `--master`, which is no longer accepted by current Patroni. It was changed to `--leader`.
- The HAProxy and REST API examples used `/master`. Current Patroni health check documentation uses `/primary` for the primary-with-leader-lock endpoint, so the examples were updated.
- The Prometheus alert examples referenced nonexistent current Patroni metrics: `patroni_cluster_healthy`, `patroni_is_leader`, and `patroni_replication_lag`. They were replaced with metrics documented by Patroni's `/metrics` endpoint: `patroni_postgres_running`, `patroni_primary`, `patroni_replica`, and `patroni_postgres_streaming`.
- The best-practice note said to use an odd number of nodes for quorum. Quorum applies to the DCS cluster rather than PostgreSQL data nodes, so it was clarified to "DCS nodes."

## Review Notes
- The guide is still a high-level production setup. It intentionally leaves environment-specific hardening, TLS, secret handling, package repository setup, and OS-specific service details to the operator.
- The PostgreSQL package names assume a distribution/repository where `postgresql-16` and `postgresql-contrib-16` are available.
