# Validation Summary: How to Configure PostgreSQL Patroni Cluster on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 22.04 / 24.04 LTS
- PostgreSQL 16
- Patroni (3.x / 4.x)
- etcd (distributed configuration store)
- HAProxy (connection routing / load balancing)
- pgBackRest (backup and PITR)
- Prometheus postgres_exporter
- systemd

## Sources Consulted
- Patroni installation documentation — https://patroni.readthedocs.io/en/latest/installation.html
- Patroni REST API / HAProxy docs — https://patroni.readthedocs.io/
- Ubuntu package index (etcd / noble) — https://packages.ubuntu.com/etcd and https://www.ubuntuupdates.org/package/core/noble/universe/security/etcd-server
- PostgreSQL PGDG apt repository docs — https://www.postgresql.org/download/linux/ubuntu/
- PostgreSQL system functions (pg_stat_replication, pg_wal_lsn_diff, recovery functions) — https://www.postgresql.org/docs/16/
- pgBackRest configuration reference — https://pgbackrest.org/configuration.html

## Issues Found

1. **etcd package name on Ubuntu 24.04 (incorrect / would fail).** The post states it uses Ubuntu 24.04 but installed etcd with `sudo apt install -y etcd`. The transitional `etcd` metapackage was removed in Ubuntu 24.04 (noble); only `etcd-server` and `etcd-client` are shipped. The original command fails on 24.04, and `etcdctl` (used later for verification) comes from `etcd-client`. Changed the command to `sudo apt install -y etcd-server etcd-client`, which works on both 22.04 and 24.04, and added a brief explanatory comment.

2. **Patroni pip extra mismatched with config.** The installation used `pip install patroni[etcd]` while every `patroni.yml` uses the `etcd3:` (etcd API v3) configuration section. Patroni documents `etcd3` as the matching extra for the v3 API used with etcd 3.4+. Changed to `patroni[etcd3]` so the installed extra matches the configuration. (Both extras currently resolve to the same `python-etcd` dependency, so the original would likely have worked, but the corrected form is the documented and unambiguous choice.)

## Review Notes
- The `pg_hba` rules use `md5` authentication and include an open `0.0.0.0/0` rule. This is functional and matches many existing tutorials, but `scram-sha-256` and a tighter network scope would be preferable for production. Left as-is since it is not technically incorrect and the post already calls out password/network hardening in the Best Practices section.
- `ETCD_ENABLE_V2="true"` is set in the etcd config but is unnecessary because Patroni connects via the etcd v3 API (`etcd3:`). It is harmless on the etcd 3.4/3.5 versions shipped by Ubuntu, so it was left unchanged.
- The `option httpchk OPTIONS /primary` style HAProxy health checks use the older single-line syntax. It still works in current HAProxy releases (and matches Patroni's own examples), though HAProxy 2.2+ also supports the newer `http-check send` form.
- The custom monitoring script checks `role == "master"` from the `/patroni` endpoint. Recent Patroni versions may report `"primary"` instead of `"master"`; the script's colorized fallback still handles this gracefully, so it was left unchanged.
- Versions referenced (PostgreSQL 16, postgres_exporter v0.15.0, etcd 2379/2380, Patroni ports 8008) are all accurate and current as of the post date.
