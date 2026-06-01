# Validation Summary: How to Migrate a Cassandra Database to Azure Cosmos DB Cassandra API

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Azure Cosmos DB for Apache Cassandra
- Apache Cassandra and CQL
- Azure CLI
- cqlsh
- Apache Spark and Spark Cassandra Connector
- Python Cassandra driver
- TLS/SSL configuration

## Sources Consulted
- Azure Cosmos DB for Apache Cassandra supported features: https://learn.microsoft.com/en-us/azure/cosmos-db/cassandra/support
- Azure Cosmos DB for Apache Cassandra migration tutorial: https://learn.microsoft.com/en-us/azure/cosmos-db/cassandra/migrate-data
- Azure Cosmos DB for Apache Cassandra live migration with dual-write proxy and Spark: https://learn.microsoft.com/en-us/azure/cosmos-db/cassandra/migrate-data-dual-write-proxy
- Azure Cosmos DB for Apache Cassandra Spark configuration: https://learn.microsoft.com/en-us/azure/cosmos-db/cassandra/connect-spark-configuration
- Azure Cosmos DB for Apache Cassandra throughput provisioning: https://learn.microsoft.com/en-us/azure/cosmos-db/cassandra/how-to-provision-throughput
- Azure Cosmos DB autoscale throughput documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/provision-throughput-autoscale
- Azure CLI `az cosmosdb` reference: https://learn.microsoft.com/en-us/cli/azure/cosmosdb
- Azure CLI `az cosmosdb keys` reference: https://learn.microsoft.com/en-us/cli/azure/cosmosdb/keys
- Azure Database Migration Service supported scenarios: https://learn.microsoft.com/en-us/azure/dms/resource-scenario-status

## Issues Found
- The post said materialized views are not supported. Current Azure documentation lists materialized views as supported in preview, so I updated the assessment checklist and limitations section to describe preview support and production caveats.
- The post described "Azure Cosmos DB Live Data Migrator" as a Cassandra online migration option. The official Cassandra guidance is dual writes plus Spark, commonly using the open-source Cassandra dual-write proxy, so I replaced that option.
- The post listed Azure Database Migration Service as supporting Cassandra-to-Cosmos DB Cassandra API migration. Current DMS supported scenarios do not list Cassandra as a source for Cosmos DB Cassandra API, so I removed that migration method.
- The `cqlsh COPY` import example omitted `--protocol-version=4` and only set `CHUNKSIZE`. Azure documentation recommends protocol version 4 for Cosmos DB Cassandra API and throughput-limiting options such as `CHUNKSIZE`, `INGESTRATE`, and `MAXATTEMPTS`, so I updated the command.
- The Python validation script created an SSL context manually without loading default CA certificates. I changed it to `ssl.create_default_context()` so certificate verification has a default trust store.
- The limitations section understated LWT support and misstated batch behavior. I updated it to match current documentation: LWT is supported except on accounts with multiple-region writes enabled, and batches are supported as unlogged batches only.

## Review Notes
The examples remain illustrative. For a production migration, users should also validate table options such as `gc_grace_seconds`, protocol version compatibility, partition-key distribution, RU throttling behavior, and whether preserving Cassandra `writetime` or per-cell TTL requires Cosmos DB migration-specific table flags before loading data.
