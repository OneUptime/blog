# Validation Summary: How to Migrate Amazon ElastiCache Redis Clusters to Google Cloud Memorystore

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Amazon ElastiCache for Redis OSS
- Google Cloud Memorystore for Redis
- Memorystore for Redis Cluster
- Redis RDB snapshots
- AWS CLI
- Google Cloud CLI
- Amazon S3
- Cloud Storage
- Storage Transfer Service
- Cloud Monitoring

## Sources Consulted
- AWS CLI `describe-replication-groups` command reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/describe-replication-groups.html
- AWS CLI `copy-snapshot` command reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/copy-snapshot.html
- Amazon ElastiCache backup export documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/backups-exporting.html
- Google Cloud Memorystore for Redis import overview: https://docs.cloud.google.com/memorystore/docs/redis/about-importing-exporting
- Google Cloud Memorystore for Redis import instructions: https://cloud.google.com/memorystore/docs/redis/import-data
- Google Cloud CLI `gcloud redis instances import` reference: https://cloud.google.com/sdk/gcloud/reference/redis/instances/import
- Google Cloud Memorystore for Redis create/manage instances documentation: https://cloud.google.com/memorystore/docs/redis/create-manage-instances
- Google Cloud CLI `gcloud redis instances create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/create
- Google Cloud CLI `gcloud redis instances update` reference: https://cloud.google.com/sdk/gcloud/reference/redis/instances/update
- Google Cloud Memorystore supported Redis configurations: https://docs.cloud.google.com/memorystore/docs/redis/supported-redis-configurations
- Google Cloud Memorystore Redis AUTH documentation: https://cloud.google.com/memorystore/docs/redis/manage-redis-auth
- Google Cloud Memorystore in-transit encryption documentation: https://docs.cloud.google.com/memorystore/docs/redis/manage-in-transit-encryption
- Google Cloud Memorystore for Redis Cluster backup and RDB import documentation: https://docs.cloud.google.com/memorystore/docs/cluster/manage-backups
- Google Cloud Memorystore supported monitoring metrics: https://docs.cloud.google.com/memorystore/docs/redis/supported-monitoring-metrics

## Issues Found
- The inventory query labeled `MemberClusters` as `Engine`, which would not show the Redis engine version. Changed it to include `EngineVersion` and `ClusterEnabled` so the command returns migration-relevant Redis version and cluster mode information.
- The ElastiCache export section omitted two important AWS requirements: the S3 bucket must be in the same AWS Region as the backup and ElastiCache must have access to the bucket. Added this caveat near the export command.
- The Memorystore creation section did not mention RDB version compatibility. Added guidance to choose a Memorystore Redis version that can import the source RDB, since Memorystore cannot import RDB files produced by newer Redis versions.
- The node type mapping rounded some ElastiCache memory values down to smaller Memorystore capacities. Updated the table to use GiB terminology and round up to minimum Memorystore sizes.
- The `gcloud redis instances update` example used `--redis-config`, which is valid for create but not update. Changed it to `--update-redis-config`.
- The cluster-mode migration note implied importing data per shard into an existing cluster. Updated it to match Memorystore for Redis Cluster's documented flow: grant the service agent Cloud Storage access and create the cluster from the Cloud Storage folder containing RDB files.

## Review Notes
The post is now technically accurate as a high-level migration guide. A future expansion could include exact IAM policy examples for ElastiCache S3 export and Memorystore service-agent bucket access, but those are optional implementation details rather than correctness fixes.
