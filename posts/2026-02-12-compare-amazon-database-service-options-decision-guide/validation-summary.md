# Validation Summary: How to Compare Amazon Database Service Options (Decision Guide)

## Status
validated

## Post Type
Decision guide / technical reference

## Technologies Covered
- Amazon RDS
- Amazon Aurora and Aurora Serverless v2
- Amazon Redshift and Redshift Serverless
- Amazon DynamoDB and DynamoDB Accelerator (DAX)
- Amazon DocumentDB
- Amazon Keyspaces
- Amazon Neptune
- Amazon Timestream for Live Analytics
- Amazon ElastiCache
- Amazon MemoryDB
- Amazon QLDB
- Python DAX client

## Sources Consulted
- Amazon RDS DB instance storage: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- Amazon RDS read replicas: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html
- RDS for SQL Server read replica limits: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.ReadReplicas.html
- RDS storage autoscaling: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIOPS.Autoscaling.html
- Amazon Aurora storage: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.StorageReliability.html
- Amazon Aurora high availability and replicas: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html
- Aurora Serverless v2 capacity: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.how-it-works.html
- DynamoDB Accelerator (DAX): https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html
- Python and DAX examples: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.client.run-application-python.html
- Amazon DocumentDB compatibility: https://docs.aws.amazon.com/documentdb/latest/developerguide/compatibility.html
- Amazon Keyspaces serverless resource management: https://docs.aws.amazon.com/keyspaces/latest/devguide/serverless_resource_management.html
- Amazon Neptune query languages: https://docs.aws.amazon.com/neptune/latest/userguide/access-graph-queries.html
- Amazon Timestream storage: https://docs.aws.amazon.com/timestream/latest/developerguide/storage.html
- Amazon ElastiCache engines: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.html
- Amazon MemoryDB features: https://docs.aws.amazon.com/memorydb/latest/devguide/servicename-feature-overview.html
- Amazon QLDB end-of-support notice: https://docs.aws.amazon.com/qldb/latest/developerguide/getting-started-step-7.html
- DynamoDB pricing: https://aws.amazon.com/dynamodb/pricing/on-demand/
- Amazon Redshift pricing: https://aws.amazon.com/redshift/pricing/

## Issues Found
- RDS engine list omitted Db2. Added Db2 to the supported RDS engines list.
- RDS read replica guidance said standard RDS supports only 5 read replicas. Updated it to reflect current engine-specific limits, including up to 15 replicas for supported configurations.
- The comparison table described RDS storage autoscaling as manual only. Updated it to note optional automatic scale-up, matching RDS storage autoscaling behavior.
- Aurora storage units used TB. Updated to TiB to match AWS documentation.
- Aurora Serverless v2 capacity range was too narrow for current platform versions. Updated it to note supported scaling from 0 or 0.5 ACUs up to 256 ACUs depending on engine/platform version.
- The DAX Python snippet used a non-current client construction style. Replaced it with the documented `AmazonDaxClient.resource(...)` pattern and a table `get_item` call.
- Neptune query language support omitted openCypher. Added openCypher alongside Gremlin and SPARQL.
- ElastiCache and MemoryDB wording used older Redis-only naming. Updated to Valkey, Redis OSS, and Memcached where applicable.
- QLDB was presented as a current choice. Updated the section to state that AWS ended QLDB support on July 31, 2025, and that it should not be selected for new workloads.
- DynamoDB on-demand and Redshift cost examples were materially off for the stated configurations. Adjusted the rough monthly estimates to better align with current AWS pricing.

## Review Notes
The remaining cost table is still intentionally approximate. Actual database costs vary with region, storage type, I/O, backups, data transfer, reservations, query volume, and optional features, so production estimates should be generated with the AWS Pricing Calculator.
