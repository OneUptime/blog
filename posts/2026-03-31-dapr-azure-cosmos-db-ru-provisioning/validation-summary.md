# Validation Summary: How to Configure Azure Cosmos DB RU Provisioning for Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (state store component, resiliency policies)
- Azure Cosmos DB (SQL API, autoscale provisioning, Request Units)
- Azure CLI (`az cosmosdb` commands)
- Python (RU estimation script)

## Sources Consulted
- Azure Cosmos DB Request Units documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/request-units
- Azure Cosmos DB autoscale documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/provision-throughput-autoscale
- Azure CLI `az cosmosdb` reference: https://learn.microsoft.com/en-us/cli/azure/cosmosdb
- Dapr state store component reference (Azure Cosmos DB): https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr resiliency policies documentation: https://docs.dapr.io/operations/resiliency/policies/

## Issues Found

### 1. Incorrect Python output comment
- **What was wrong:** The comment showing the expected output of `estimate_ru_requirements(500, 2.0, 0.7)` claimed `{"estimatedRUPerSecond": 2380, "recommendedProvisionedRU": 2500}`, but the actual computation produces `{"estimatedRUPerSecond": 2800, "recommendedProvisionedRU": 3400}`. The math: read_ru = 350 * 2.0 * 1.0 = 700, write_ru = 150 * 2.0 * 7.0 = 2100, total = 2800, with 20% buffer = 3360 rounded to 3400.
- **What was changed:** Updated the output comment to `{"estimatedRUPerSecond": 2800, "recommendedProvisionedRU": 3400}`.

### 2. Incorrect Dapr resiliency retry field name
- **What was wrong:** The resiliency YAML used `initialInterval: 200ms` which is not a documented field in the Dapr resiliency retry policy spec. The correct field for setting the initial/base retry interval is `duration`.
- **What was changed:** Replaced `initialInterval: 200ms` with `duration: 200ms`.

## Review Notes
- The post sets `--max-throughput` at both the database level and the container level. When a container has dedicated throughput (`--max-throughput` on the container), it does not use the database-level shared throughput. This means the database-level autoscale (400-4000 RU/s) is unused unless other containers are added. This is technically valid but potentially wasteful for a single-container setup. A future revision could simplify by removing `--max-throughput` from the database create command.
- The Dapr component configuration includes `consistencyLevel: Strong` as a metadata field. This is not listed in the official Dapr Cosmos DB state store component documentation as a supported metadata field. It may be silently ignored. The Cosmos DB account is created with Session consistency, so if this field is ignored, reads will use Session consistency, not Strong. Readers relying on Strong consistency should verify this works with their Dapr version.
- The RU cost estimates (~1 RU/KB for reads, ~5-10 RU/KB for writes) are reasonable rough approximations. Actual costs vary based on indexing policy, consistency level, and query complexity. The 1 RU baseline specifically applies to point reads of 1 KB items by ID and partition key.
