# MySQL InnoDB Cluster Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, High Availability, Failover, Database

Description: Configure and manage MySQL InnoDB Cluster for automatic failover and high availability database deployments.

---

MySQL InnoDB Cluster provides a complete high availability solution for MySQL databases, combining Group Replication, MySQL Router, and MySQL Shell into an integrated package. When properly configured, InnoDB Cluster automatically handles failover scenarios, ensuring your applications remain available even when database nodes fail.

Group Replication is the foundation of InnoDB Cluster, providing synchronous replication with automatic conflict detection and resolution. It operates in either single-primary mode, where one node handles writes while others serve reads, or multi-primary mode, where all nodes accept writes. Single-primary mode is recommended for most use cases due to its simpler conflict handling.

Automatic failover occurs when the primary node becomes unavailable. The remaining cluster members automatically elect a new primary through a consensus algorithm, typically completing the process within seconds. MySQL Router, acting as a proxy between applications and the cluster, automatically redirects traffic to the new primary without application changes.

Setting up InnoDB Cluster involves deploying at least three MySQL instances (for fault tolerance), configuring Group Replication, deploying MySQL Router instances, and using MySQL Shell's AdminAPI to create and manage the cluster. The AdminAPI provides commands for adding nodes, checking cluster status, and handling various operational tasks.

Monitoring cluster health is critical for reliable operations. Key metrics include replication lag, network partitions, and member states. Proper handling of split-brain scenarios, planned maintenance procedures, and disaster recovery planning ensure your database infrastructure remains resilient.
