# Validation Summary: Percona Replication or XtraDB Cluster: Which HA Topology Fits?

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered

- Percona Server for MySQL 8.4
- MySQL asynchronous and semisynchronous replication
- MySQL Group Replication
- MySQL Router and replication-aware connection routing
- Percona XtraDB Cluster 8.4
- Galera write-set replication, certification, quorum, SST, and IST
- ProxySQL and Galera Arbitrator (`garbd`)
- GTID-based replication and Performance Schema replication monitoring

## Sources Consulted

- [Percona Server for MySQL 8.4 feature comparison](https://docs.percona.com/percona-server/8.4/feature-comparison.html)
- [MySQL 8.4 replication configuration](https://dev.mysql.com/doc/refman/8.4/en/replication-configuration.html)
- [MySQL 8.4 `SHOW REPLICA STATUS`](https://dev.mysql.com/doc/refman/8.4/en/show-replica-status.html)
- [MySQL 8.4 semisynchronous replication](https://dev.mysql.com/doc/refman/8.4/en/replication-semisync.html)
- [MySQL 8.4 Group Replication](https://dev.mysql.com/doc/refman/8.4/en/group-replication.html)
- [MySQL 8.4 Group Replication requirements](https://dev.mysql.com/doc/refman/8.4/en/group-replication-requirements.html)
- [MySQL 8.4 Group Replication limitations](https://dev.mysql.com/doc/refman/8.4/en/group-replication-limitations.html)
- [MySQL 8.4 Group Replication single-primary mode](https://dev.mysql.com/doc/refman/8.4/en/group-replication-single-primary-mode.html)
- [MySQL 8.4 Group Replication fault tolerance](https://dev.mysql.com/doc/refman/8.4/en/group-replication-fault-tolerance.html)
- [MySQL 8.4 Group Replication member statistics](https://dev.mysql.com/doc/refman/8.4/en/group-replication-replication-group-member-stats.html)
- [Percona XtraDB Cluster 8.4 certification](https://docs.percona.com/percona-xtradb-cluster/8.4/certification.html)
- [Percona XtraDB Cluster 8.4 high availability](https://docs.percona.com/percona-xtradb-cluster/8.4/high-availability.html)
- [Percona XtraDB Cluster 8.4 limitations](https://docs.percona.com/percona-xtradb-cluster/8.4/limitation.html)
- [Percona XtraDB Cluster 8.4 cluster failover and arbitrator guidance](https://docs.percona.com/percona-xtradb-cluster/8.4/failover.html)
- [Percona XtraDB Cluster 8.4 wsrep status variables](https://docs.percona.com/percona-xtradb-cluster/8.4/wsrep-status-index.html)
- [Percona XtraDB Cluster 8.4 ProxySQL load balancing](https://docs.percona.com/percona-xtradb-cluster/8.4/load-balance-proxysql.html)

## Issues Found

- The asynchronous replication table implied a strict temporal order by saying that the source commits before replicas apply. It now states the actual guarantee: the source does not wait for replica receipt or application.
- The Group Replication discussion referred vaguely to "distributed-lock caveats." It now identifies the documented limitation precisely: certification does not account for table locks or named locks.
- The description of PXC's virtually synchronous behavior could imply that every remote node physically commits a transaction before the client commit completes. It now distinguishes the write-set replication and certification requirement from physical commit on every node.
- The PXC recovery-point claim was broader than its stated failure scope. It now limits the effectively zero RPO claim to loss of a node while a Primary Component survives.
- The capacity recommendation said all voting nodes should have comparable capacity, but `garbd` is a lightweight voting member that stores no data. The recommendation now applies to data-bearing nodes.
- The PXC routing statement made ProxySQL sound like the only valid mechanism. It now also allows equivalent connector or application routing, consistent with the post's earlier client-failover explanation.
- The listed wsrep health variables do not by themselves override MySQL's `read_only` or `super_read_only` settings. The post now tells operators to verify those settings against the intended routing policy before treating a node as writable.

## Review Notes

The SQL examples are valid for MySQL and Percona 8.4. `SHOW REPLICA STATUS\G` uses the current source/replica terminology, and `\G` is the MySQL client vertical-output terminator. The Performance Schema columns and wsrep status variable names are current. The documented nine-member Group Replication maximum, majority requirement, single-primary default, PXC three-member recommendation, `garbd` behavior, flow-control warning, and certification failure error 1213 were all confirmed. All links in the post resolve to the intended official 8.4 documentation.
