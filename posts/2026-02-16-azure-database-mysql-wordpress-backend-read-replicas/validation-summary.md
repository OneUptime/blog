# Validation Summary: How to Configure Azure Database for MySQL as a WordPress Backend

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Database for MySQL Flexible Server
- Azure CLI
- MySQL 8.0
- WordPress
- HyperDB
- Azure Monitor
- MySQL read replicas

## Sources Consulted
- Microsoft Learn: az mysql flexible-server replica commands: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server/replica
- Microsoft Learn: CLI script to create and manage read replicas: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/scripts/sample-cli-read-replicas
- Microsoft Learn: Troubleshoot replication latency in Azure Database for MySQL Flexible Server: https://learn.microsoft.com/en-us/azure/mysql/how-to-troubleshoot-replication-latency
- Microsoft Learn: Monitoring data reference for Azure Database for MySQL Flexible Server: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-monitor-mysql-reference
- Microsoft Learn: High availability in Azure Database for MySQL Flexible Server: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-high-availability
- Microsoft Learn: Server parameters in Azure Database for MySQL Flexible Server: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-server-parameters
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS statement: https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual: removed query cache variables: https://dev.mysql.com/doc/refman/8.0/en/mysql-nutshell.html
- Automattic HyperDB repository and sample configuration: https://github.com/Automattic/HyperDB

## Issues Found
- The post configured `query_cache_type` and `query_cache_size` for MySQL 8.0. MySQL 8.0 removed the query cache, so these parameters are not valid for the server version used in the article. I removed those CLI commands and added a note to use WordPress caching and InnoDB buffer pool tuning instead.
- The architecture diagram referred to a read replica load balancer. Azure Database for MySQL read replicas expose separate server endpoints and HyperDB performs application-level routing. I changed the diagram label to "HyperDB Read Router."
- The post claimed replication lag is typically under a second. Azure documentation states that lag depends on network latency, transaction volume, compute tier, and workload. I changed the wording to describe lag as workload-dependent.
- The HyperDB configuration path was shown as `wp-content/db-config.php`. HyperDB expects `db.php` in `wp-content`, but `db-config.php` belongs in the directory containing `wp-config.php` unless `DB_CONFIG_FILE` is defined. I corrected the setup text and code comment.
- The HyperDB read priority explanation was reversed. HyperDB tries lower numbered read groups first. I changed replicas to `read => 1`, the primary fallback to `read => 2`, and corrected the explanation.
- The logged-in user example used `$wpdb->stickywrite`, which is not a HyperDB API. I replaced it with HyperDB's `send_reads_to_masters()` method and guarded it with `method_exists()`.
- The monitoring command used deprecated MySQL 8.0 replication terminology: `SHOW SLAVE STATUS` and `Seconds_Behind_Master`. I updated it to `SHOW REPLICA STATUS` and `Seconds_Behind_Source`.
- The post said each replica can be a different SKU from the primary. Azure documentation states replicas are created with the same configuration as the source server and can be changed after creation. I updated the sentence to reflect that sequence.

## Review Notes
The Azure CLI command shapes for creating and listing Flexible Server read replicas match Microsoft Learn. Some deployment details, such as firewall/private networking, SSL settings, region/SKU availability, and using managed identities or Key Vault instead of embedded passwords, could be expanded in a future revision, but they are outside the narrow technical corrections required for this validation.
