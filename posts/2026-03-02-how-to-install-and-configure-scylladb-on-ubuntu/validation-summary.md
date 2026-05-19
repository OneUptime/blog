# Validation Summary: How to Install and Configure ScyllaDB on Ubuntu

## Status
validated

## Post Type
Tutorial / installation and configuration guide

## Technologies Covered
- Ubuntu 22.04 and 24.04
- ScyllaDB 2026.1
- APT package repositories
- ScyllaDB configuration (`scylla.yaml`)
- CQL and cqlsh
- nodetool
- Prometheus metrics

## Sources Consulted
- ScyllaDB Linux package installation documentation: https://docs.scylladb.com/manual/stable/getting-started/install-scylla/install-on-linux.html
- ScyllaDB OS support matrix: https://docs.scylladb.com/stable/versioning/os-support-per-version.html
- ScyllaDB configuration parameter reference: https://docs.scylladb.com/manual/stable/reference/configuration-parameters.html
- ScyllaDB administration guide for `scylla.yaml`: https://docs.scylladb.com/manual/stable/operating-scylla/admin.html
- ScyllaDB system configuration and setup scripts: https://docs.scylladb.com/manual/stable/getting-started/system-configuration.html
- ScyllaDB authentication documentation: https://docs.scylladb.com/manual/stable/operating-scylla/security/authentication.html
- ScyllaDB authorization documentation: https://docs.scylladb.com/manual/stable/operating-scylla/security/enable-authorization.html
- ScyllaDB CQL data definition reference: https://docs.scylladb.com/manual/stable/cql/ddl.html
- ScyllaDB CQL consistency levels reference: https://docs.scylladb.com/manual/stable/cql/consistency.html
- ScyllaDB materialized views reference: https://docs.scylladb.com/manual/stable/cql/mv.html
- ScyllaDB cqlsh reference: https://docs.scylladb.com/manual/stable/cql/cqlsh.html
- ScyllaDB monitoring interfaces documentation: https://monitoring.docs.scylladb.com/stable/reference/monitoring-apis.html

## Issues Found
- The APT repository setup used an outdated repository URL and keyring flow. Updated it to the current ScyllaDB 2026.1 Linux package instructions using `/etc/apt/keyrings`, key `c503c686b007f39e`, and the official `scylla-2026.1.list` repository file.
- The section heading mentioned `systemd-resolved`, but the section only covered swap. Renamed the heading to match the actual technical content.
- The `scylla_setup` comment block had a malformed CPU governor bullet and overstated huge page setup as a general setup-script item. Corrected the bullet and described the remaining setup as other system tuning.
- The `scylla.yaml` sample included `read_consistency` and `write_consistency`, which are not current `scylla.yaml` parameters. Replaced them with a note that consistency levels are normally set per query or driver statement.
- The `scylla.yaml` sample included `row_cache_size_in_mb`, which is not a current documented ScyllaDB configuration parameter. Replaced it with the documented `index_cache_fraction` cache tuning parameter.
- The initial CQL setup created a keyspace with replication factor 3 before the tutorial's three-node cluster setup. Changed the example to use `replication_factor: 1` so it works in the single-node tutorial flow.

## Review Notes
The remaining commands and CQL examples are broadly consistent with current ScyllaDB documentation. For future production-hardening, the post could add firewall port guidance, rack/datacenter configuration in `cassandra-rackdc.properties`, and an explicit `ALTER KEYSPACE` example for moving the tutorial keyspace from RF=1 to RF=3 after all three nodes are running.
