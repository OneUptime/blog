# Validation Summary: How to Use Dapr State Store with Multi-Region Replication

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (state store components)
- Azure Cosmos DB (multi-region writes)
- AWS DynamoDB (Global Tables)
- AWS ElastiCache (Redis Global Datastore)
- Redis Enterprise Active-Active
- Kubernetes ExternalDNS
- Dapr JavaScript SDK (`@dapr/dapr`)
- Azure CLI (`az cosmosdb`)
- AWS CLI (`aws dynamodb`, `aws elasticache`)

## Sources Consulted
- Dapr Cosmos DB state store component documentation (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/)
- Dapr Redis state store component documentation (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/)
- Dapr AWS DynamoDB state store component documentation (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-dynamodb/)
- Dapr JS SDK source code and TypeScript types (`@dapr/dapr` package)
- Azure CLI `az cosmosdb update` reference documentation
- AWS CLI `aws dynamodb create-global-table` and `aws dynamodb update-table` reference documentation
- AWS DynamoDB Global Tables versioning documentation (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_versions.html)
- AWS CLI `aws elasticache create-global-replication-group` reference documentation
- ExternalDNS AWS tutorial and annotations documentation (https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/aws.md)

## Issues Found

1. **Cosmos DB `preferredLocations` metadata field does not exist in Dapr**: The YAML snippet included `preferredLocations` as a Dapr component metadata field. The Dapr Cosmos DB state store component does not expose this field — the underlying Azure SDK has `PreferredRegions`, but it is not wired through the Dapr component metadata. Removed the field from the YAML.

2. **DynamoDB `create-global-table` is deprecated**: The post used `aws dynamodb create-global-table` with `--replication-group` syntax, which is the legacy Version 2017.11.29 API. AWS recommends Version 2019.11.21, which uses `aws dynamodb update-table --replica-updates` to add replicas to an existing table. Updated the command to use the modern approach.

3. **Dapr JS SDK consistency parameter uses enum, not string**: The code example passed `{ consistency: "strong" }` to `client.state.get()`, but the Dapr JS SDK expects `StateConsistencyEnum.CONSISTENCY_STRONG` (a numeric enum value), not a string. Added the proper import and updated both code examples to use the correct enum values.

4. **ExternalDNS `aws-routing-policy` annotation does not exist**: The post used `external-dns.alpha.kubernetes.io/aws-routing-policy: latency`, which is not a valid ExternalDNS annotation. Latency-based routing in ExternalDNS requires `external-dns.alpha.kubernetes.io/aws-region` (set to the AWS region) along with the required `external-dns.alpha.kubernetes.io/set-identifier` annotation. Updated the YAML to use the correct annotations.

## Review Notes
- The Azure CLI commands for Cosmos DB (`az cosmosdb update --enable-multiple-write-locations` and `--locations`) are syntactically correct.
- The AWS ElastiCache `create-global-replication-group` command is correct.
- The Dapr Redis state store `redisHost` metadata field name is correct.
- The Dapr DynamoDB state store `region` and `table` metadata field names are correct.
- The post's core claim that "Dapr itself does not manage replication — the state store backend provides it" is accurate and important.
- The Cosmos DB YAML snippet is intentionally partial (showing only multi-region-relevant fields); required fields like `masterKey`, `database`, and `collection` are omitted for brevity, which is acceptable for a guide focused on replication configuration.
