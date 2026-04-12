# Validation Summary: How to Choose the Right MySQL High Availability Solution

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- MySQL Asynchronous Replication
- MySQL Semi-Synchronous Replication
- MySQL Group Replication
- MySQL InnoDB Cluster
- Galera Cluster (Percona XtraDB Cluster, MariaDB Galera)
- MHA (Master High Availability Manager)
- Orchestrator
- ProxySQL
- HAProxy / Keepalived
- AWS RDS Multi-AZ
- Google Cloud SQL
- PlanetScale (Vitess)

## Sources Consulted
- MySQL 8.0 Reference Manual: Group Replication (https://dev.mysql.com/doc/refman/8.0/en/group-replication.html)
- MySQL 8.0 Reference Manual: InnoDB Cluster (https://dev.mysql.com/doc/refman/8.0/en/mysql-innodb-cluster-introduction.html)
- MySQL 8.0 Reference Manual: Semisynchronous Replication (https://dev.mysql.com/doc/refman/8.0/en/replication-semisync.html)
- Galera Cluster Documentation (https://galeracluster.com/library/documentation/)
- AWS RDS Multi-AZ Documentation (https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html)
- PlanetScale / Vitess Architecture Documentation (https://vitess.io/docs/)

## Issues Found

### Issue 1: InnoDB Cluster Multi-Primary incorrectly listed as "No"
- **What was wrong:** The comparison table listed InnoDB Cluster as not supporting multi-primary mode. InnoDB Cluster is built on Group Replication and supports multi-primary mode (though single-primary is the default and recommended). The post's own text also correctly stated that "MySQL Group Replication or InnoDB Cluster ... supports multi-primary mode," contradicting the table.
- **What was changed:** Changed Multi-Primary from "No" to "Yes (limited)" to be consistent with Group Replication's entry and the post's own text.

### Issue 2: Galera Cluster described as "synchronous"
- **What was wrong:** Galera Cluster was described as providing "synchronous multi-primary replication." Galera's own documentation explicitly describes its replication model as "virtually synchronous." The distinction matters: Galera uses certification-based replication where transactions commit locally first and writesets are then applied on other nodes, which is not the same as traditional synchronous 2PC replication.
- **What was changed:** Changed "synchronous" to "virtually synchronous."

### Issue 3: PlanetScale Multi-Primary incorrectly listed as "Yes"
- **What was wrong:** PlanetScale was listed as supporting multi-primary writes. PlanetScale is built on Vitess, which uses horizontal sharding where each shard has a single MySQL primary. This is fundamentally different from multi-primary replication (as provided by Group Replication or Galera) where multiple nodes accept writes for the same data set with conflict detection. PlanetScale provides concurrent writes to different shards, not multi-primary writes to overlapping data.
- **What was changed:** Changed Multi-Primary from "Yes" to "No."

## Review Notes
- MHA (Master High Availability Manager) has not been actively maintained since approximately 2018. While it remains functional and widely deployed, readers should be aware it may not receive updates for newer MySQL versions.
- The AWS RDS Multi-AZ RTO of 60s is at the optimistic end of AWS's stated range of "one to two minutes" for failover completion. This is not incorrect but readers should plan for up to 120s.
- The post correctly identifies the layered nature of MySQL HA (replication + topology management + routing) which is a key architectural insight often missed in simpler comparisons.
