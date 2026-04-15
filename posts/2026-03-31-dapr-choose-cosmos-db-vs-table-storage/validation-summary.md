# Validation Summary: How to Choose Between Azure Cosmos DB and Azure Table Storage for Dapr

## Status
validated

## Post Type
Comparison / Guide

## Technologies Covered
- Dapr (state store components)
- Azure Cosmos DB (NoSQL API)
- Azure Table Storage
- Kubernetes (Dapr component YAML manifests)

## Sources Consulted
- Dapr Azure Cosmos DB State Store docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr Azure Table Storage State Store docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-tablestorage/
- Azure Cosmos DB consistency levels: https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels
- Azure Storage concurrency/consistency: https://azure.microsoft.com/en-us/blog/managing-concurrency-in-microsoft-azure-storage-2/
- Azure Table Storage pricing: https://azure.microsoft.com/en-us/pricing/details/storage/tables/
- Azure Cosmos DB serverless pricing: https://azure.microsoft.com/en-us/pricing/details/cosmos-db/autoscale-provisioned/
- Azure Cosmos DB for Table FAQ (size limits): https://learn.microsoft.com/en-us/azure/cosmos-db/table/faq
- Azure Storage SLA: https://azure.microsoft.com/en-us/support/legal/sla/storage/v1_5/

## Issues Found

### 1. Azure Table Storage consistency incorrectly described as "Eventual"
- **What was wrong:** The feature comparison table listed Azure Table Storage consistency as "Eventual". The "When to Choose Table Storage" section included "Eventual consistency is acceptable for your state patterns" as a bullet. The summary also referenced "eventual consistency."
- **What was changed:** Updated the table to "Strong (single-region)", changed the bullet to "You don't need tunable consistency levels across multiple regions", and updated the summary to "where strong single-region consistency is sufficient."
- **Why:** Azure Table Storage provides strong consistency for all read-after-write operations within a single region. Only geo-replicated secondary reads (RA-GRS) are eventually consistent. Cosmos DB's advantage is tunable consistency across five levels, not stronger consistency per se.

### 2. Table Storage read transaction cost was 10x too high
- **What was wrong:** The cost example used $0.00000036 per read operation ($0.0036 per 10,000), but $0.000000036 per write ($0.00036 per 10,000). This made reads appear 10x more expensive than writes.
- **What was changed:** Corrected the read cost to $0.000000036 per operation (matching write cost), recalculated daily read cost to $0.036/day, and updated the monthly total from ~$11.50 to ~$1.67.
- **Why:** Azure Table Storage charges a flat $0.00036 per 10,000 transactions for entity-level operations (Get Entity, Put Entity, etc.) with no read/write differentiation. The $0.0036 per 10,000 rate applies only to list/container operations, not entity reads.

### 3. Cosmos DB monthly total calculation was slightly off
- **What was wrong:** The monthly total was listed as ~$27.50, but the arithmetic yields ($0.25 + $0.625) * 30 + $0.25 = $26.50.
- **What was changed:** Updated from ~$27.50 to ~$26.50.
- **Why:** Simple arithmetic correction.

## Review Notes
- The corrected cost comparison makes the price difference even more dramatic (~16x cheaper for Table Storage vs the original ~2.4x), which actually strengthens the post's argument for starting with Table Storage.
- The Dapr component YAML configurations for both Cosmos DB and Table Storage are correct and use proper field names and secret references.
- The Cosmos DB component should ideally mention that the target container must have a partition key path of `/partitionKey` for Dapr compatibility, but this is an enhancement rather than an error.
- All other feature comparison claims (max item sizes, SLAs, indexing, throughput models, global distribution) are accurate.
