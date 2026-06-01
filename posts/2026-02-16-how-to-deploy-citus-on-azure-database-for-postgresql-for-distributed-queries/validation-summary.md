# Validation Summary: How to Deploy Citus on Azure Database for PostgreSQL for Distributed Queries

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Database for PostgreSQL Flexible Server Elastic Clusters
- PostgreSQL
- Citus
- Azure CLI
- SQL DDL and distributed queries

## Sources Consulted
- Microsoft Learn: Elastic clusters in Azure Database for PostgreSQL - https://learn.microsoft.com/en-us/azure/postgresql/elastic-clusters/concepts-elastic-clusters
- Microsoft Learn: Scale out with elastic clusters - https://learn.microsoft.com/en-us/azure/postgresql/scale/how-to-scale-out
- Microsoft Learn: Azure CLI `az postgres flexible-server` reference - https://learn.microsoft.com/en-us/cli/azure/postgres/flexible-server
- Microsoft Learn: Table types on elastic clusters - https://learn.microsoft.com/en-us/azure/postgresql/elastic-clusters/concepts-elastic-clusters-table-types
- Microsoft Learn: Supported PostgreSQL versions in Azure Database for PostgreSQL - https://learn.microsoft.com/en-us/azure/postgresql/configure-maintain/concepts-supported-versions
- Citus documentation: User-defined functions including `create_distributed_table`, `create_reference_table`, `citus_get_active_worker_nodes`, and rebalancing functions - https://docs.citusdata.com/en/stable/develop/api_udf.html
- Citus documentation: Metadata views including `citus_dist_stat_activity` - https://docs.citusdata.com/en/stable/develop/api_metadata.html

## Issues Found
- The post described enabling Citus on a standalone Flexible Server by setting `azure.extensions` and `shared_preload_libraries`. Azure's current managed Citus offering for Azure Database for PostgreSQL is Flexible Server Elastic Clusters, where Azure manages the Citus-backed multi-node cluster as a single resource. Replaced the parameter-setting workflow with `az postgres flexible-server create --cluster-option ElasticCluster --node-count 3`.
- The post described creating separate Flexible Server instances as worker nodes and registering them with `citus_add_node`. In Azure Elastic Clusters, worker nodes are managed as part of the cluster and are scaled with the cluster node count. Replaced the manual worker setup with `az postgres flexible-server update --node-count`.
- The rebalancing section used `citus_add_node` to add a worker. Replaced it with the Elastic Cluster scale-out command, followed by the existing `citus_rebalance_start()` and `citus_rebalance_status()` calls.
- The co-location explanation said all related tables were distributed by the same column name, but the example distributes `companies` by `id` and child tables by `company_id`. Adjusted the wording to say the same tenant identifier, which matches the schema and Citus co-location behavior.
- Updated the description and summary language from manually enabling Citus to creating and using an Elastic Cluster.

## Review Notes
The remaining SQL examples use documented Citus functions and views. The post is intentionally high-level and does not cover production requirements such as networking, firewall/private access, SSL, user permissions, connection strings, or choosing a shard count before distributing tables.
