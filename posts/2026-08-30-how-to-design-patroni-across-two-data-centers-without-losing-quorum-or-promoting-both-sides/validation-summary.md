# Validation Summary: How to Design Patroni Across Two Data Centers Without Losing Quorum or Promoting Both Sides

## Status

validated

## Post Type

Technical architecture and disaster-recovery guide

## Technologies Covered

- Patroni 4.1 standby clusters, dynamic configuration, DCS failsafe mode, and cluster promotion/demotion
- PostgreSQL streaming and cascading replication, synchronous replication, WAL archiving, physical replication slots, failover, and `pg_rewind`
- etcd 3.7 Raft quorum, voting members, failure tolerance, and network partitions
- YAML Patroni configuration and `patronictl` commands
- Multi-data-center high availability, fencing/STONITH, RPO, and RTO

## Sources Consulted

- [Patroni 4.1.5 multi-data-center HA guidance](https://patroni.readthedocs.io/en/latest/ha_multi_dc.html)
- [Patroni 4.1.5 standby-cluster documentation](https://patroni.readthedocs.io/en/latest/standby_cluster.html)
- [Patroni 4.1.5 replication modes](https://patroni.readthedocs.io/en/latest/replication_modes.html)
- [Patroni 4.1.5 dynamic configuration](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni 4.1.5 `patronictl` reference](https://patroni.readthedocs.io/en/latest/patronictl.html)
- [Patroni 4.1.0 release notes](https://patroni.readthedocs.io/en/latest/releases.html#version-4-1-0)
- [Patroni DCS failsafe mode](https://patroni.readthedocs.io/en/latest/dcs_failsafe_mode.html)
- [etcd 3.7 quorum and failure-tolerance FAQ](https://etcd.io/docs/v3.7/faq/)
- [etcd 3.7 failure modes](https://etcd.io/docs/v3.7/op-guide/failures/)
- [etcd 3.7 learner and voting-member design](https://etcd.io/docs/v3.7/learning/design-learner/)
- [PostgreSQL 18 log-shipping, streaming, cascading, and synchronous replication](https://www.postgresql.org/docs/current/warm-standby.html)
- [PostgreSQL 18 standby failover and STONITH guidance](https://www.postgresql.org/docs/current/warm-standby-failover.html)
- [PostgreSQL 18 replication configuration](https://www.postgresql.org/docs/current/runtime-config-replication.html)
- [PostgreSQL 18 `pg_rewind`](https://www.postgresql.org/docs/current/app-pgrewind.html)

## Issues Found

- The architecture diagram called each three-member etcd deployment a "three-member etcd quorum." In a three-member etcd cluster the quorum is two members. Both diagram labels now say "three-member etcd cluster."
- The third-location discussion used "witness" ambiguously and said that co-locating it in an existing failure domain changes nothing. It now specifies a voting DCS member and explains that co-location biases quorum toward one site without creating an independent third failure domain.
- The `pg_rewind` prerequisites omitted `full_page_writes=on` and described the WAL requirement too generally. The post now states the target-side checksum/`wal_log_hints` condition, the `full_page_writes` requirement, examination of both timeline histories, and the need for target WAL back to the divergence point in `pg_wal` or retrievable from an archive with `pg_rewind -c`.

## Review Notes

- The `bootstrap.dcs.standby_cluster` YAML hierarchy and the `host`, `port`, `primary_slot_name`, and `create_replica_methods` keys match current Patroni documentation.
- The shown `patronictl -c /etc/patroni/dc2.yml promote-cluster dc2-ha` syntax is valid. It intentionally prompts for confirmation because `--force` is omitted. Patroni introduced `promote-cluster` and `demote-cluster` in 4.1.0.
- Patroni's documentation confirms the two-independent-DCS standby-cluster topology, separate DCS scopes, manual promotion after STONITH, cascading replicas, remote-slot responsibility, and globally unique member-name requirement.
- The etcd 2+1 and 2+2 partition outcomes, asynchronous/synchronous RPO trade-offs, slot-retained-WAL risk, and DCS failsafe limitations are technically correct.
- All external links in the post returned HTTP 200 and resolved to the intended official documentation or author page during validation.
